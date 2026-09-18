import logging
import uuid
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Refund, Transaction

logger = logging.getLogger(__name__)


class RefundProcessingError(Exception):
    """A provider rejected a refund request in a known, non-ambiguous way."""


def _paypal_config():
    config = settings.PAYMENT_GATEWAYS.get("paypal", {})
    required = ("base_url", "auth_url", "client_id", "client_secret")
    if not all(config.get(key) for key in required):
        raise RefundProcessingError("PayPal refund configuration is incomplete.")
    return config


def _paypal_access_token(config):
    response = requests.post(
        config["auth_url"],
        data={"grant_type": "client_credentials"},
        auth=(config["client_id"], config["client_secret"]),
        headers={"Accept": "application/json", "Accept-Language": "en_US"},
        timeout=15,
    )
    if response.status_code != 200:
        logger.error("PayPal OAuth failed while processing a refund.")
        raise RefundProcessingError("Unable to authenticate with PayPal.")
    try:
        token = response.json().get("access_token")
    except ValueError:
        token = None
    if not token:
        raise RefundProcessingError("PayPal authentication returned no access token.")
    return token


def _capture_id_for_payment(payment):
    if payment.transaction_id:
        return payment.transaction_id

    capture = (
        Transaction.objects
        .filter(payment=payment, transaction_type__iexact="PayPal")
        .exclude(paypal_transaction_id__isnull=True)
        .exclude(paypal_transaction_id="")
        .order_by("-created_at")
        .values_list("paypal_transaction_id", flat=True)
        .first()
    )
    return capture


def _validate_refund_total(payment, refund):
    provider_amount = payment.provider_amount or payment.amount
    if provider_amount is None:
        raise RefundProcessingError("Original payment amount is unavailable.")

    completed_or_processing = (
        Refund.objects
        .filter(payment=payment, status__in=["processing", "completed"])
        .exclude(pk=refund.pk)
        .aggregate_total()
        if hasattr(Refund.objects, "aggregate_total")
        else None
    )

    if completed_or_processing is None:
        from django.db.models import Sum
        completed_or_processing = (
            Refund.objects
            .filter(payment=payment, status__in=["processing", "completed"])
            .exclude(pk=refund.pk)
            .aggregate(total=Sum("amount"))
            .get("total")
            or Decimal("0.00")
        )

    if refund.amount <= 0:
        raise RefundProcessingError("Refund amount must be greater than zero.")

    if completed_or_processing + refund.amount > Decimal(str(provider_amount)):
        raise RefundProcessingError("Refund amount exceeds the remaining captured payment.")


def process_paypal_refund(refund_id):
    """
    Submit one approved Refund ledger entry to PayPal.

    The payment row is locked before the cumulative-refund check, so two
    concurrent refunds against the same capture cannot overspend it.
    Provider calls happen outside the database transaction; an ambiguous
    network failure therefore leaves the refund in processing for retry/
    reconciliation instead of falsely reporting failure.
    """
    with transaction.atomic():
        refund = (
            Refund.objects
            .select_for_update()
            .select_related("payment", "return_request__item")
            .get(pk=refund_id)
        )
        if refund.status == "completed":
            return refund

        if refund.provider != "PayPal":
            raise RefundProcessingError("This refund provider is not implemented.")

        payment = Payment = refund.payment.__class__
        locked_payment = Payment.objects.select_for_update().get(pk=refund.payment_id)
        refund.payment = locked_payment

        if locked_payment.payment_method != "PayPal" or locked_payment.status != "completed":
            raise RefundProcessingError("The original PayPal payment is not eligible for refund.")

        capture_id = _capture_id_for_payment(locked_payment)
        if not capture_id:
            raise RefundProcessingError("The original PayPal capture reference is missing.")

        _validate_refund_total(locked_payment, refund)

        if not refund.currency:
            refund.currency = locked_payment.provider_currency or "USD"

        refund.status = "processing"
        refund.failure_reason = None
        refund.save(update_fields=["status", "failure_reason", "currency", "updated_at"])

        provider_currency = (locked_payment.provider_currency or "USD").upper()
        if refund.currency.upper() != provider_currency:
            raise RefundProcessingError("Refund currency does not match the original PayPal payment.")

        idempotency_key = f"maa-mara-refund-{refund.id}"
        provider_payload = {
            "amount": {
                "value": f"{refund.amount:.2f}",
                "currency_code": provider_currency,
            }
        }

    config = _paypal_config()
    token = _paypal_access_token(config)
    url = f"{config['base_url'].rstrip('/')}/v2/payments/captures/{capture_id}/refund"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "PayPal-Request-Id": idempotency_key,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=provider_payload,
            timeout=30,
        )
    except requests.exceptions.RequestException:
        logger.exception("PayPal refund request failed after submission attempt.")
        # Do not mark failed: PayPal may have accepted the request.
        return Refund.objects.get(pk=refund_id)

    try:
        data = response.json()
    except ValueError:
        data = {}

    if response.status_code not in (200, 201):
        provider_error = data.get("name") or data.get("message") or "PayPal rejected the refund."
        with transaction.atomic():
            locked_refund = Refund.objects.select_for_update().get(pk=refund_id)
            if locked_refund.status != "completed":
                locked_refund.status = "failed"
                locked_refund.failure_reason = str(provider_error)[:1000]
                locked_refund.save(update_fields=["status", "failure_reason", "updated_at"])
        raise RefundProcessingError("PayPal rejected the refund request.")

    provider_reference = data.get("id")
    provider_status = str(data.get("status") or "").upper()
    provider_amount = data.get("amount", {}).get("value")
    response_currency = str(data.get("amount", {}).get("currency_code") or provider_currency).upper()

    if not provider_reference:
        raise RefundProcessingError("PayPal returned no refund reference.")

    try:
        if provider_amount is not None and Decimal(str(provider_amount)) != refund.amount:
            raise RefundProcessingError("PayPal refund amount does not match the approved refund.")
    except (InvalidOperation, TypeError):
        raise RefundProcessingError("PayPal returned an invalid refund amount.")

    if response_currency != provider_currency:
        raise RefundProcessingError("PayPal returned an unexpected refund currency.")

    completed = provider_status == "COMPLETED"
    with transaction.atomic():
        locked_refund = Refund.objects.select_for_update().get(pk=refund_id)
        locked_refund.provider_reference = provider_reference
        locked_refund.status = "completed" if completed else "processing"
        locked_refund.failure_reason = None
        if completed:
            locked_refund.completed_at = timezone.now()
        locked_refund.save(
            update_fields=[
                "provider_reference", "status", "failure_reason",
                "completed_at", "updated_at",
            ]
        )

        if completed:
            return_request = locked_refund.return_request
            return_request.refund_issued = True
            return_request.processed = True
            return_request.save(update_fields=["refund_issued", "processed"])

            item = return_request.item
            item.refunded = True
            item.refunded_at = timezone.now()
            item.status = "refunded"
            item.save(update_fields=["refunded", "refunded_at", "status"])

            adjustment = return_request.vendor_adjustment
            if adjustment and not adjustment.applied:
                adjustment.applied = True
                adjustment.save(update_fields=["applied"])

        return locked_refund
