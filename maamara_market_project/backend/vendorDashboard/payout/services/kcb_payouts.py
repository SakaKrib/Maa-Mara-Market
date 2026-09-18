import logging

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from core.realtime import broadcast_event
from core.models import ActivityLog, Notification
from order.models import Transaction
from vendorDashboard.models import VendorPayout
from vendorDashboard.payout.services.payment_processors import get_kcb_access_token

logger = logging.getLogger(__name__)

SUCCESS_STATUSES = {"SUCCESS", "COMPLETED", "SETTLED", "0"}
FAILURE_STATUSES = {"FAILED", "REJECTED", "CANCELLED", "CANCELED", "RETURNED"}
PENDING_STATUSES = {"PENDING", "PROCESSING", "SUBMITTED", "IN_PROGRESS"}


def reconcile_kcb_payout(payout_id):
    """Reconcile a submitted KCB payout using the configured status endpoint.

    KCB response schemas vary by integration. The endpoint and correlation
    parameter are therefore configuration-driven rather than hard-coded.
    """
    config = settings.PAYMENT_GATEWAYS.get("kcb", {})
    status_url = config.get("status_url")
    if not status_url:
        raise ValueError("KCB payout status URL is not configured.")

    payout = VendorPayout.objects.get(pk=payout_id)
    reference = payout.kcb_transaction_reference
    if not reference:
        raise ValueError("Payout has no KCB transaction reference.")

    token = get_kcb_access_token()
    if not token:
        raise requests.RequestException("KCB access token unavailable.")

    parameter_name = config.get("status_reference_parameter", "transactionReference")
    response = requests.get(
        status_url,
        params={parameter_name: reference},
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()
    header = data.get("header") or {}

    raw_status = (
        header.get("status")
        or header.get("transactionStatus")
        or data.get("status")
        or data.get("transactionStatus")
    )
    status = str(raw_status or "").upper()
    provider_reference = (
        header.get("transactionReference")
        or header.get("transactionId")
        or data.get("transactionReference")
        or data.get("transactionId")
    )
    description = str(
        header.get("statusDescription") or data.get("statusDescription") or ""
    )[:255]

    if status not in SUCCESS_STATUSES | FAILURE_STATUSES | PENDING_STATUSES:
        logger.warning(
            "KCB returned an unknown payout status.",
            extra={"payout_id": payout_id, "status": status},
        )
        return payout

    with transaction.atomic():
        payout = (
            VendorPayout.objects
            .select_for_update()
            .select_related("vendor", "vendor__user")
            .get(pk=payout_id)
        )

        was_paid = payout.paid
        payout.kcb_provider_status = status
        payout.kcb_result_description = description or payout.kcb_result_description
        if provider_reference:
            payout.kcb_provider_reference = str(provider_reference)[:100]

        if status in SUCCESS_STATUSES:
            payout.paid = True
            if not payout.paid_at:
                payout.paid_at = timezone.now()
        elif not was_paid and status in FAILURE_STATUSES:
            payout.paid = False

        payout.save(update_fields=[
            "kcb_provider_status",
            "kcb_result_description",
            "kcb_provider_reference",
            "paid",
            "paid_at",
        ])

        if status in SUCCESS_STATUSES and not was_paid:
            vendor_user = getattr(payout.vendor, "user", None)
            if vendor_user:
                Notification.objects.create(
                    user=vendor_user,
                    title="Bank Payout Successful",
                    message=f"Payout {payout.reference} has been confirmed by the bank.",
                    url=f"/vendor/payouts/{payout.reference}/",
                )

            ActivityLog.objects.create(
                user=vendor_user,
                actor_type="vendor",
                action="payout_completed",
                description=f"Bank payout {payout.reference} was confirmed as {status}.",
                timestamp=timezone.now(),
            )

        transaction.on_commit(
            lambda: broadcast_event(
                "payout.updated",
                model="VendorPayout",
                object_id=payout.id,
                action="updated",
                vendor_ids=[payout.vendor_id],
                data={
                    "reference": payout.reference,
                    "status": status,
                    "paid": payout.paid,
                    "paid_at": payout.paid_at.isoformat() if payout.paid_at else None,
                    "provider_reference": payout.kcb_provider_reference,
                },
            )
        )

    return payout
