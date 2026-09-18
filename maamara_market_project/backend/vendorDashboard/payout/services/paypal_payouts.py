import logging
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from core.models import ActivityLog, Notification
from core.realtime import broadcast_event
from order.models import Transaction
from order.paypalApis import get_paypal_access_token
from vendorDashboard.models import VendorPayout

logger = logging.getLogger(__name__)

PAYPAL_ITEM_STATUSES = {
    "SUCCESS",
    "FAILED",
    "PENDING",
    "UNCLAIMED",
    "RETURNED",
    "ONHOLD",
    "BLOCKED",
    "REFUNDED",
    "REVERSED",
}

PAYPAL_SUCCESS_STATUSES = {"SUCCESS"}
PAYPAL_FAILURE_STATUSES = {
    "FAILED",
    "RETURNED",
    "REFUNDED",
    "REVERSED",
    "BLOCKED",
}
PAYPAL_PENDING_STATUSES = {"PENDING", "UNCLAIMED", "ONHOLD"}

def _paypal_base_url():
    config = settings.PAYMENT_GATEWAYS.get("paypal", {})
    base_url = config.get("base_url")
    if not base_url:
        raise ValueError("PayPal API base URL is not configured.")
    return base_url.rstrip("/")


def _parse_amount(value):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def apply_paypal_payout_status(
    payout_id,
    *,
    transaction_status,
    transaction_id=None,
    payout_item_id=None,
    payout_batch_id=None,
    amount=None,
    currency=None,
):
    """Apply a provider-confirmed PayPal payout item state atomically.

    Submission is never treated as settlement. Only SUCCESS marks paid=True.
    Later non-success events never reverse an already-paid payout.
    """
    status = str(transaction_status or "").upper()
    if status not in PAYPAL_ITEM_STATUSES:
        raise ValueError("Unsupported PayPal payout item status.")

    provider_amount = _parse_amount(amount) if amount is not None else None
    if amount is not None and provider_amount is None:
        raise ValueError("Invalid PayPal payout amount.")
    if provider_amount is not None and provider_amount <= 0:
        raise ValueError("PayPal payout amount must be positive.")
    provider_currency = str(currency or "").upper() or None

    with transaction.atomic():
        payout = (
            VendorPayout.objects
            .select_for_update()
            .select_related("vendor", "vendor__user")
            .get(pk=payout_id)
        )

        if payout_item_id:
            if payout.paypal_payout_item_id and payout.paypal_payout_item_id != payout_item_id:
                raise ValueError("PayPal payout item correlation mismatch.")
            payout.paypal_payout_item_id = payout_item_id

        if payout_batch_id:
            if payout.paypal_batch_id and payout.paypal_batch_id != payout_batch_id:
                raise ValueError("PayPal payout batch correlation mismatch.")
            payout.paypal_batch_id = payout_batch_id

        if provider_amount is not None:
            if payout.paypal_amount is not None and payout.paypal_amount != provider_amount:
                raise ValueError("PayPal payout amount mismatch.")
            payout.paypal_amount = provider_amount

        if provider_currency:
            if payout.paypal_currency and payout.paypal_currency.upper() != provider_currency:
                raise ValueError("PayPal payout currency mismatch.")
            payout.paypal_currency = provider_currency

        previous_status = (payout.paypal_transaction_status or "").upper()
        was_paid = payout.paid

        payout.paypal_transaction_status = status
        if transaction_id:
            if (
                payout.paypal_transaction_id
                and payout.paypal_transaction_id != transaction_id
            ):
                raise ValueError("PayPal transaction correlation mismatch.")
            payout.paypal_transaction_id = transaction_id

        if status in PAYPAL_SUCCESS_STATUSES:
            payout.paid = True
            if not payout.paid_at:
                payout.paid_at = timezone.now()
        elif not was_paid and status in PAYPAL_FAILURE_STATUSES:
            payout.paid = False
        elif not was_paid and status in PAYPAL_PENDING_STATUSES:
            payout.paid = False

        update_fields = [
            "paypal_transaction_status",
            "paypal_transaction_id",
            "paypal_payout_item_id",
            "paypal_batch_id",
            "paypal_amount",
            "paypal_currency",
            "paid",
            "paid_at",
        ]
        payout.save(update_fields=update_fields)

        # A repeated webhook for the same terminal state is idempotent.
        state_changed = previous_status != status or was_paid != payout.paid

        if transaction_id:
            tx_defaults = {
                "transaction_type": "PayPal",
                "amount": provider_amount or payout.paypal_amount or Decimal("0.00"),
                "status": "Completed" if status == "SUCCESS" else (
                    "Failed" if status in PAYPAL_FAILURE_STATUSES else "Pending"
                ),
                "account_reference": payout.reference,
                "payout": payout,
                "vendor": payout.vendor,
                "payment_method": "paypal",
            }
            existing_tx = (
                Transaction.objects
                .filter(paypal_transaction_id=transaction_id)
                .first()
            )
            if not existing_tx:
                Transaction.objects.create(
                    paypal_transaction_id=transaction_id,
                    **tx_defaults,
                )

        if state_changed:
            vendor_user = getattr(payout.vendor, "user", None)
            if vendor_user:
                Notification.objects.create(
                    user=vendor_user,
                    title="PayPal Payout Update",
                    message=(
                        f"Your PayPal payout {payout.reference} is now {status}."
                    ),
                    url=f"/vendor/payouts/{payout.reference}/",
                )

            ActivityLog.objects.create(
                user=vendor_user,
                actor_type="vendor",
                action=(
                    "payout_completed"
                    if status == "SUCCESS"
                    else "payout_updated"
                ),
                description=(
                    f"PayPal payout {payout.reference} provider status: {status}."
                ),
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
                        "paid_at": (
                            payout.paid_at.isoformat()
                            if payout.paid_at
                            else None
                        ),
                        "transaction_id": payout.paypal_transaction_id,
                        "payout_item_id": payout.paypal_payout_item_id,
                        "batch_id": payout.paypal_batch_id,
                        "amount": (
                            str(payout.paypal_amount)
                            if payout.paypal_amount is not None
                            else None
                        ),
                        "currency": payout.paypal_currency,
                    },
                )
            )

    return payout


def reconcile_paypal_payout(payout_id):
    """Query PayPal's payout batch endpoint and reconcile one local payout.

    This is a recovery path for missed webhooks. It never marks a payout paid
    unless PayPal reports the individual item as SUCCESS.
    """
    payout = VendorPayout.objects.get(pk=payout_id)
    if not payout.paypal_batch_id:
        raise ValueError("Payout has no PayPal batch ID.")
    if not payout.paypal_payout_item_id and not payout.reference:
        raise ValueError("Payout has no PayPal item correlation.")

    token = get_paypal_access_token()
    response = requests.get(
        f"{_paypal_base_url()}/v1/payments/payouts/{payout.paypal_batch_id}",
        params={"page": 1, "page_size": 1000, "total_required": "false"},
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()

    for item in data.get("items", []):
        item_id = item.get("payout_item_id")
        item_payload = item.get("payout_item") or {}
        sender_item_id = item_payload.get("sender_item_id")

        if (
            (payout.paypal_payout_item_id and item_id == payout.paypal_payout_item_id)
            or (sender_item_id and sender_item_id == payout.reference)
        ):
            amount = (item_payload.get("amount") or {})
            return apply_paypal_payout_status(
                payout.id,
                transaction_status=item.get("transaction_status"),
                transaction_id=item.get("transaction_id"),
                payout_item_id=item_id,
                payout_batch_id=item.get("payout_batch_id") or payout.paypal_batch_id,
                amount=amount.get("value"),
                currency=amount.get("currency"),
            )

    logger.warning(
        "PayPal payout item not found during reconciliation.",
        extra={"payout_id": payout_id},
    )
    return payout
