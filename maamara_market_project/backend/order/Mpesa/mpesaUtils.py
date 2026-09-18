import logging

import bleach  # type: ignore
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from vendorDashboard.models import VendorPayout

from .mpesaView import initiate_b2c_payment
from order.services.refunds import reconcile_mpesa_refund_callback

logger = logging.getLogger(__name__)


def sanitize_input(value: str) -> str:
    return bleach.clean(value, tags=[], attributes={}, strip=True)


def _mpesa_result_code(result: dict) -> int | None:
    value = result.get("ResultCode")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _find_payout_for_callback(conversation_id, originator_conversation_id):
    """Lock the payout identified by a Daraja callback correlation id."""
    query = VendorPayout.objects.select_for_update()
    if conversation_id:
        payout = query.filter(mpesa_conversation_id=conversation_id).first()
        if payout:
            return payout
    if originator_conversation_id:
        return query.filter(
            mpesa_originator_conversation_id=originator_conversation_id
        ).first()
    return None


def _extract_transaction_id(result: dict) -> str | None:
    value = result.get("TransactionID")
    if value:
        return str(value)

    parameters = result.get("ResultParameters") or {}
    entries = parameters.get("ResultParameter") or []
    if isinstance(entries, dict):
        entries = [entries]

    for entry in entries:
        if entry.get("Key") in {"TransactionReceipt", "TransactionID"} and entry.get("Value"):
            return str(entry["Value"])
    return None


def _process_b2c_callback(payload: dict, *, timeout: bool = False) -> None:
    if not isinstance(payload, dict):
        logger.warning("Rejected malformed M-Pesa B2C callback payload.")
        return

    result = payload.get("Result")
    if not isinstance(result, dict):
        logger.warning("M-Pesa B2C callback missing Result object.")
        return

    conversation_id = result.get("ConversationID")
    originator_id = result.get("OriginatorConversationID")
    result_code = _mpesa_result_code(result)
    result_desc = str(result.get("ResultDesc") or "").strip()[:255]
    transaction_id = _extract_transaction_id(result)

    with transaction.atomic():
        payout = _find_payout_for_callback(conversation_id, originator_id)

        if payout is None:
            logger.warning(
                "M-Pesa B2C callback could not be matched to a payout.",
                extra={
                    "conversation_id": conversation_id,
                    "originator_conversation_id": originator_id,
                },
            )
            return

        # Duplicate callbacks are expected. Never turn a completed payout back
        # into a failed/unpaid payout.
        if payout.paid:
            if result_code == 0 and transaction_id and not payout.mpesa_transaction_id:
                payout.mpesa_transaction_id = transaction_id
                payout.save(update_fields=["mpesa_transaction_id"])
            return

        payout.mpesa_result_code = result_code
        payout.mpesa_result_desc = result_desc or ("Timeout" if timeout else "M-Pesa result received")

        if conversation_id and not payout.mpesa_conversation_id:
            payout.mpesa_conversation_id = str(conversation_id)
        if originator_id and not payout.mpesa_originator_conversation_id:
            payout.mpesa_originator_conversation_id = str(originator_id)

        if result_code == 0 and not timeout:
            if transaction_id:
                payout.mpesa_transaction_id = transaction_id
            payout.paid = True
            payout.paid_at = timezone.now()
            update_fields = [
                "mpesa_result_code",
                "mpesa_result_desc",
                "mpesa_conversation_id",
                "mpesa_originator_conversation_id",
                "mpesa_transaction_id",
                "paid",
                "paid_at",
            ]
        else:
            update_fields = [
                "mpesa_result_code",
                "mpesa_result_desc",
                "mpesa_conversation_id",
                "mpesa_originator_conversation_id",
            ]

        payout.save(update_fields=update_fields)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mpesa_b2c_payment(request):
    """Initiate a configured business-to-customer payout."""
    phone = sanitize_input(str(request.data.get("phone", "")).strip())
    amount_raw = sanitize_input(str(request.data.get("amount", "")).strip())

    if not phone or not amount_raw:
        return Response({"error": "phone and amount are required"}, status=400)

    try:
        amount = int(amount_raw)
    except (TypeError, ValueError):
        return Response({"error": "amount must be numeric"}, status=400)

    if amount <= 0:
        return Response({"error": "amount must be greater than zero"}, status=400)

    try:
        result = initiate_b2c_payment(phone, amount)
        return Response(result, status=200)
    except Exception:
        logger.exception("M-Pesa B2C payment initiation failed.")
        return Response({"error": "B2C payment could not be initiated"}, status=502)


@api_view(["POST"])
def mpesa_result(request):
    """Process a Safaricom Daraja B2C result callback idempotently."""
    _process_b2c_callback(request.data)
    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


@api_view(["POST"])
def mpesa_refund_result(request):
    """Process a Safaricom reversal result callback idempotently."""
    reconcile_mpesa_refund_callback(request.data)
    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


@api_view(["POST"])
def mpesa_refund_timeout(request):
    """Process a Safaricom reversal timeout callback."""
    reconcile_mpesa_refund_callback(request.data, timeout=True)
    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


@api_view(["POST"])
def mpesa_timeout(request):
    """Process a Safaricom Daraja B2C timeout callback."""
    _process_b2c_callback(request.data, timeout=True)
    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})
