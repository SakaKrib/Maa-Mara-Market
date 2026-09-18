import logging
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum
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
    try:
        response = requests.post(
            config["auth_url"],
            data={"grant_type": "client_credentials"},
            auth=(config["client_id"], config["client_secret"]),
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
            timeout=15,
        )
    except requests.exceptions.RequestException:
        logger.exception("PayPal OAuth request failed during refund processing.")
        raise RefundProcessingError("Unable to authenticate with PayPal.")

    if response.status_code != 200:
        logger.error("PayPal OAuth returned status=%s during refund processing.", response.status_code)
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

    return (
        Transaction.objects
        .filter(payment=payment, transaction_type__iexact="PayPal")
        .exclude(paypal_transaction_id__isnull=True)
        .exclude(paypal_transaction_id="")
        .order_by("-created_at")
        .values_list("paypal_transaction_id", flat=True)
        .first()
    )


def _validate_refund_total(payment, refund):
    provider_amount = payment.provider_amount or payment.amount
    if provider_amount is None:
        raise RefundProcessingError("Original payment amount is unavailable.")

    if refund.amount <= 0:
        raise RefundProcessingError("Refund amount must be greater than zero.")

    previous_total = (
        Refund.objects
        .filter(payment=payment, status__in=["processing", "completed"])
        .exclude(pk=refund.pk)
        .aggregate(total=Sum("amount"))
        .get("total")
        or Decimal("0.00")
    )

    if previous_total + refund.amount > Decimal(str(provider_amount)):
        raise RefundProcessingError("Refund amount exceeds the remaining captured payment.")


def _mark_refund_failed(refund_id, reason):
    with transaction.atomic():
        refund = Refund.objects.select_for_update().get(pk=refund_id)
        if refund.status != "completed":
            refund.status = "failed"
            refund.failure_reason = str(reason)[:1000]
            refund.save(update_fields=["status", "failure_reason", "updated_at"])
        return refund


def process_paypal_refund(refund_id):
    """
    Submit one approved refund ledger entry to PayPal.

    The payment row is locked before the cumulative-refund check, preventing
    concurrent refund jobs for the same payment from exceeding its captured
    amount. Provider I/O occurs outside the database transaction.
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

        Payment = refund.payment.__class__
        payment = Payment.objects.select_for_update().get(pk=refund.payment_id)

        if payment.payment_method != "PayPal" or payment.status != "completed":
            raise RefundProcessingError("The original PayPal payment is not eligible for refund.")

        capture_id = _capture_id_for_payment(payment)
        if not capture_id:
            raise RefundProcessingError("The original PayPal capture reference is missing.")

        _validate_refund_total(payment, refund)

        provider_currency = (payment.provider_currency or "USD").upper()
        refund_currency = (refund.currency or provider_currency).upper()
        if refund_currency != provider_currency:
            raise RefundProcessingError("Refund currency does not match the original PayPal payment.")

        config = _paypal_config()
        idempotency_key = f"maa-mara-refund-{refund.id}"

        refund.status = "processing"
        refund.failure_reason = None
        refund.currency = provider_currency
        refund.save(update_fields=["status", "failure_reason", "currency", "updated_at"])

    try:
        token = _paypal_access_token(config)
        response = requests.post(
            f"{config['base_url'].rstrip('/')}/v2/payments/captures/{capture_id}/refund",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
                "PayPal-Request-Id": idempotency_key,
            },
            json={
                "amount": {
                    "value": f"{refund.amount:.2f}",
                    "currency_code": provider_currency,
                }
            },
            timeout=30,
        )
    except requests.exceptions.RequestException:
        logger.exception("PayPal refund request failed after submission attempt.")
        # The provider may have accepted the request before the connection failed.
        # Keep processing so reconciliation/retry can resolve it safely.
        return Refund.objects.get(pk=refund_id)

    try:
        data = response.json()
    except ValueError:
        data = {}

    if response.status_code not in (200, 201):
        provider_error = data.get("name") or data.get("message") or "PayPal rejected the refund."
        _mark_refund_failed(refund_id, provider_error)
        raise RefundProcessingError("PayPal rejected the refund request.")

    provider_reference = data.get("id")
    provider_status = str(data.get("status") or "").upper()
    provider_amount = data.get("amount", {}).get("value")
    response_currency = str(
        data.get("amount", {}).get("currency_code") or provider_currency
    ).upper()

    if not provider_reference:
        return _mark_refund_failed(refund_id, "PayPal returned no refund reference.")

    try:
        if provider_amount is not None and Decimal(str(provider_amount)) != refund.amount:
            return _mark_refund_failed(
                refund_id,
                "PayPal refund amount does not match the approved refund.",
            )
    except (InvalidOperation, TypeError):
        return _mark_refund_failed(refund_id, "PayPal returned an invalid refund amount.")

    if response_currency != provider_currency:
        return _mark_refund_failed(
            refund_id,
            "PayPal returned an unexpected refund currency.",
        )

    completed = provider_status == "COMPLETED"

    with transaction.atomic():
        locked_refund = Refund.objects.select_for_update().get(pk=refund_id)
        if locked_refund.status == "completed":
            return locked_refund

        locked_refund.provider_reference = provider_reference
        locked_refund.status = "completed" if completed else "processing"
        locked_refund.failure_reason = None
        if completed:
            locked_refund.completed_at = timezone.now()
        locked_refund.save(
            update_fields=[
                "provider_reference",
                "status",
                "failure_reason",
                "completed_at",
                "updated_at",
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



def process_mpesa_refund(refund_id):
    """Reverse a completed C2B M-Pesa payment through Daraja.

    Daraja reversal is transaction-based, so automatic processing is limited
    to a full reversal of the original C2B receipt amount.
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
        if refund.provider != "Mpesa":
            raise RefundProcessingError("This refund provider is not implemented.")

        Payment = refund.payment.__class__
        payment = Payment.objects.select_for_update().get(pk=refund.payment_id)
        if payment.payment_method != "Mpesa" or payment.status != "completed":
            raise RefundProcessingError("The original M-Pesa payment is not eligible for reversal.")

        original = (
            Transaction.objects
            .filter(payment=payment, transaction_type="C2B")
            .exclude(mpesa_receipt_number__isnull=True)
            .exclude(mpesa_receipt_number="")
            .order_by("-created_at")
            .first()
        )
        if not original:
            raise RefundProcessingError("The original M-Pesa receipt reference is missing.")

        if refund.amount != original.amount:
            return _mark_refund_failed(
                refund_id,
                "Automatic M-Pesa reversal currently requires a full transaction reversal.",
            )

        config = settings.PAYMENT_GATEWAYS.get("mpesa", {}).get("reversal", {})
        required = ("initiator_name", "short_code", "initiator_password", "certificate_path", "url", "result_url", "timeout_url")
        if not all(config.get(key) for key in required):
            raise RefundProcessingError("M-Pesa reversal configuration is incomplete.")

        from vendorDashboard.payout.services.generatePermcert import generate_security_credential
        import uuid

        originator_id = refund.mpesa_originator_conversation_id or str(uuid.uuid4())
        security_credential = generate_security_credential(
            config["initiator_password"],
            config["certificate_path"],
        )
        refund.mpesa_originator_conversation_id = originator_id
        refund.status = "processing"
        refund.failure_reason = None
        refund.save(update_fields=[
            "mpesa_originator_conversation_id",
            "status",
            "failure_reason",
            "updated_at",
        ])

    try:
        from order.Mpesa.mpesaView import get_mpesa_access_token
        token = get_mpesa_access_token()
        response = requests.post(
            config["url"],
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "Initiator": config["initiator_name"],
                "SecurityCredential": security_credential,
                "CommandID": "TransactionReversal",
                "TransactionID": original.mpesa_receipt_number,
                "Amount": int(refund.amount),
                "ReceiverParty": config["short_code"],
                "RecieverIdentifierType": "4",
                "ResultURL": config["result_url"],
                "QueueTimeOutURL": config["timeout_url"],
                "Remarks": f"Refund {refund.id}",
                "Occasion": "Customer refund",
                "OriginatorConversationID": originator_id,
            },
            timeout=30,
        )
    except requests.exceptions.RequestException:
        logger.exception("M-Pesa reversal request failed after submission attempt.")
        return Refund.objects.get(pk=refund_id)

    try:
        data = response.json()
    except ValueError:
        data = {}

    if response.status_code not in (200, 201):
        return _mark_refund_failed(
            refund_id,
            data.get("errorMessage") or data.get("errorCode") or "M-Pesa rejected the reversal request.",
        )

    response_originator = data.get("OriginatorConversationID") or originator_id
    conversation_id = data.get("ConversationID")
    response_code = data.get("ResponseCode")

    with transaction.atomic():
        locked = Refund.objects.select_for_update().get(pk=refund_id)
        locked.mpesa_originator_conversation_id = response_originator
        locked.mpesa_conversation_id = conversation_id
        try:
            locked.mpesa_result_code = int(response_code) if response_code is not None else None
        except (TypeError, ValueError):
            locked.mpesa_result_code = None
        locked.status = "processing"
        locked.failure_reason = None
        locked.save(update_fields=[
            "mpesa_originator_conversation_id",
            "mpesa_conversation_id",
            "mpesa_result_code",
            "status",
            "failure_reason",
            "updated_at",
        ])
        return locked


def reconcile_mpesa_refund_callback(payload, *, timeout=False):
    result = payload.get("Result") if isinstance(payload, dict) else None
    if not isinstance(result, dict):
        return None

    originator_id = result.get("OriginatorConversationID")
    conversation_id = result.get("ConversationID")
    result_code = result.get("ResultCode")
    try:
        result_code_int = int(result_code) if result_code is not None else None
    except (TypeError, ValueError):
        result_code_int = None

    with transaction.atomic():
        refund = (
            Refund.objects.select_for_update()
            .filter(provider="Mpesa")
            .filter(
                Q(mpesa_conversation_id=conversation_id)
                | Q(mpesa_originator_conversation_id=originator_id)
            )
            .first()
        )
        if not refund:
            return None

        refund.mpesa_result_code = result_code_int
        if result_code_int == 0 and not timeout:
            transaction_id = result.get("TransactionID")
            if transaction_id:
                refund.provider_reference = str(transaction_id)
            refund.status = "completed"
            refund.failure_reason = None
            refund.completed_at = refund.completed_at or timezone.now()
            refund.save(update_fields=[
                "mpesa_result_code", "provider_reference", "status",
                "failure_reason", "completed_at", "updated_at",
            ])

            return_request = refund.return_request
            return_request.refund_issued = True
            return_request.processed = True
            return_request.save(update_fields=["refund_issued", "processed"])

            item = return_request.item
            item.refunded = True
            item.refunded_at = item.refunded_at or timezone.now()
            item.status = "refunded"
            item.save(update_fields=["refunded", "refunded_at", "status"])

            adjustment = return_request.vendor_adjustment
            if adjustment and not adjustment.applied:
                adjustment.applied = True
                adjustment.save(update_fields=["applied"])
        elif timeout or result_code_int != 0:
            if refund.status != "completed":
                refund.status = "failed"
                refund.failure_reason = str(result.get("ResultDesc") or "M-Pesa reversal failed")[:1000]
                refund.save(update_fields=[
                    "mpesa_result_code", "status", "failure_reason", "updated_at",
                ])

        return refund


def reconcile_paypal_refund(provider_reference, provider_status, provider_amount, provider_currency):
    """Reconcile a PayPal refund webhook against an existing refund ledger row."""
    if not provider_reference:
        return None

    with transaction.atomic():
        refund = (
            Refund.objects
            .select_for_update()
            .select_related("payment", "return_request__item", "return_request__vendor_adjustment")
            .filter(provider="PayPal", provider_reference=provider_reference)
            .first()
        )
        if not refund:
            return None

        if provider_amount is not None and Decimal(str(provider_amount)) != refund.amount:
            refund.status = "failed"
            refund.failure_reason = "PayPal refund webhook amount does not match the approved refund."
            refund.save(update_fields=["status", "failure_reason", "updated_at"])
            return refund

        expected_currency = (refund.currency or "USD").upper()
        if str(provider_currency or expected_currency).upper() != expected_currency:
            refund.status = "failed"
            refund.failure_reason = "PayPal refund webhook currency does not match the approved refund."
            refund.save(update_fields=["status", "failure_reason", "updated_at"])
            return refund

        normalized_status = str(provider_status or "").upper()
        if normalized_status == "COMPLETED":
            refund.status = "completed"
            refund.failure_reason = None
            refund.completed_at = refund.completed_at or timezone.now()
            refund.save(update_fields=["status", "failure_reason", "completed_at", "updated_at"])

            return_request = refund.return_request
            return_request.refund_issued = True
            return_request.processed = True
            return_request.save(update_fields=["refund_issued", "processed"])

            item = return_request.item
            item.refunded = True
            item.refunded_at = item.refunded_at or timezone.now()
            item.status = "refunded"
            item.save(update_fields=["refunded", "refunded_at", "status"])

            adjustment = return_request.vendor_adjustment
            if adjustment and not adjustment.applied:
                adjustment.applied = True
                adjustment.save(update_fields=["applied"])

        elif normalized_status in {"FAILED", "CANCELLED"}:
            if refund.status != "completed":
                refund.status = "failed"
                refund.failure_reason = "PayPal reported the refund as failed."
                refund.save(update_fields=["status", "failure_reason", "updated_at"])
        else:
            refund.status = "processing"
            refund.save(update_fields=["status", "updated_at"])

        return refund
