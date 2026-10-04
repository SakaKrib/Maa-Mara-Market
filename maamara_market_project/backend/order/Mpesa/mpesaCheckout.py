import base64
import logging
from decimal import Decimal

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from order.checkout_sessions import get_owned_checkout_session, materialize_paid_checkout
from order.models import CheckoutSession, Transaction
from order.order_completion import complete_paid_order, broadcast_checkout_payment_status
from order.views import IsAuthenticatedOrVisitor

logger = logging.getLogger(__name__)


def _config():
    return settings.PAYMENT_GATEWAYS["mpesa"]["stk_push"]


def _normalize_phone(value):
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())

    if digits.startswith("0") and len(digits) == 10:
        digits = "254" + digits[1:]
    elif digits.startswith("7") and len(digits) == 9:
        digits = "254" + digits
    elif digits.startswith("254") and len(digits) == 12:
        pass
    else:
        raise ValueError("Enter a valid Kenyan M-Pesa phone number.")

    if not digits.startswith(("2547", "2541")) or len(digits) != 12:
        raise ValueError("Enter a valid Kenyan M-Pesa phone number.")

    return digits


def _timestamp():
    return timezone.localtime().strftime("%Y%m%d%H%M%S")


def _password(shortcode, passkey, timestamp):
    raw = f"{shortcode}{passkey}{timestamp}".encode("utf-8")
    return base64.b64encode(raw).decode("utf-8")


def _access_token():
    from .mpesaView import get_mpesa_access_token

    return get_mpesa_access_token()


def initiate_stk_push(checkout_session, phone):
    config = _config()
    shortcode = str(config.get("shortcode") or "").strip()
    passkey = str(config.get("passkey") or "").strip()
    stk_url = str(config.get("stk_url") or "").strip()
    callback_url = str(config.get("callback_url") or "").strip()

    if not all((shortcode, passkey, stk_url, callback_url)):
        raise RuntimeError("M-Pesa STK Push configuration is incomplete.")

    phone = _normalize_phone(phone)
    amount_decimal = Decimal(str(checkout_session.amount)).quantize(Decimal("0.01"))
    if amount_decimal != amount_decimal.to_integral_value():
        raise ValueError("M-Pesa checkout amounts must be whole Kenyan shillings.")
    amount = int(amount_decimal)
    if amount <= 0:
        raise ValueError("M-Pesa payment amount must be greater than zero.")

    timestamp = _timestamp()
    merchant_reference = f"MM-{checkout_session.id}"
    payload = {
        "BusinessShortCode": shortcode,
        "Password": _password(shortcode, passkey, timestamp),
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": merchant_reference[:12],
        "TransactionDesc": f"Maa Mara checkout {str(checkout_session.id)[:12]}",
    }

    try:
        response = requests.post(
            stk_url,
            json=payload,
            headers={
                "Authorization": f"Bearer {_access_token()}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError):
        logger.exception("M-Pesa STK Push request failed.")
        raise RuntimeError("Unable to start the M-Pesa payment.")

    response_code = str(data.get("ResponseCode", ""))
    checkout_request_id = data.get("CheckoutRequestID")

    if response_code != "0" or not checkout_request_id:
        logger.error("M-Pesa STK Push rejected: %s", data)
        raise RuntimeError(
            data.get("ResponseDescription")
            or data.get("errorMessage")
            or "M-Pesa did not accept the payment request."
        )

    checkout_session.mpesa_checkout_request_id = checkout_request_id
    checkout_session.status = "payment_pending"
    checkout_session.payload = {
        **(checkout_session.payload or {}),
        "mpesa": {
            "checkout_request_id": checkout_request_id,
            "merchant_reference": merchant_reference,
            "phone": phone,
            "response": data,
        },
    }
    checkout_session.save(
        update_fields=["mpesa_checkout_request_id", "status", "payload", "updated_at"]
    )

    return {
        "checkout_request_id": checkout_request_id,
        "merchant_reference": merchant_reference,
        "customer_message": data.get("CustomerMessage"),
        "response_description": data.get("ResponseDescription"),
    }


def _callback_result(payload):
    body = payload.get("Body") or {}
    return body.get("stkCallback") or {}


def _metadata(callback):
    metadata = callback.get("CallbackMetadata") or {}
    items = metadata.get("Item") or []
    if isinstance(items, dict):
        items = [items]

    result = {}
    for item in items:
        name = item.get("Name")
        if name:
            result[name] = item.get("Value")
    return result


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
@transaction.atomic
def mpesa_stk_push(request):
    checkout_id = request.data.get("checkout_id")
    phone = request.data.get("phone")

    if not checkout_id or not phone:
        return Response(
            {"error": "checkout_id and phone are required."},
            status=400,
        )

    checkout_session = get_owned_checkout_session(request, checkout_id, for_update=True)
    if not checkout_session:
        return Response({"error": "Checkout session not found."}, status=404)

    if checkout_session.status == "completed" and checkout_session.order_id:
        return Response(
            {
                "status": "completed",
                "order_id": checkout_session.order_id,
                "message": "This checkout has already been paid.",
            },
            status=200,
        )

    if checkout_session.status in {"failed", "expired"}:
        return Response({"error": "This checkout is no longer payable."}, status=400)

    if checkout_session.expires_at <= timezone.now():
        checkout_session.status = "expired"
        checkout_session.save(update_fields=["status", "updated_at"])
        return Response({"error": "This checkout has expired."}, status=400)

    if checkout_session.payment_method not in {"M-Pesa", "MPESA"}:
        return Response({"error": "This checkout is not an M-Pesa checkout."}, status=400)

    try:
        result = initiate_stk_push(checkout_session, phone)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)
    except RuntimeError as exc:
        return Response({"error": str(exc)}, status=502)

    return Response(
        {
            "status": "payment_pending",
            "checkout_id": str(checkout_session.id),
            "amount": str(checkout_session.amount),
            **result,
            "message": "STK Push sent. Complete the payment on your phone.",
        },
        status=200,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def mpesa_stk_callback(request):
    callback = _callback_result(request.data)

    checkout_request_id = callback.get("CheckoutRequestID")
    result_code = callback.get("ResultCode")

    if not checkout_request_id:
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    checkout_session = (
        CheckoutSession.objects.select_for_update()
        .select_related("order", "order__payment")
        .filter(mpesa_checkout_request_id=checkout_request_id)
        .first()
    )

    if not checkout_session:
        logger.warning(
            "Received M-Pesa STK callback for unknown CheckoutRequestID %s",
            checkout_request_id,
        )
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    if checkout_session.status == "completed":
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    if str(result_code) != "0":
        checkout_session.status = "failed"
        checkout_session.payload = {
            **(checkout_session.payload or {}),
            "mpesa_callback": request.data,
        }
        checkout_session.save(update_fields=["status", "payload", "updated_at"])
        broadcast_checkout_payment_status(checkout_session, "FAILED")
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    metadata = _metadata(callback)
    provider_amount = metadata.get("Amount")
    receipt = metadata.get("MpesaReceiptNumber")
    phone = metadata.get("PhoneNumber")

    if not receipt or provider_amount is None:
        logger.error(
            "Successful M-Pesa callback missing receipt/amount for checkout %s",
            checkout_session.id,
        )
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    expected_amount = Decimal(str(checkout_session.amount)).quantize(Decimal("0.01"))
    received_amount = Decimal(str(provider_amount)).quantize(Decimal("0.01"))

    if received_amount != expected_amount:
        checkout_session.status = "failed"
        checkout_session.payload = {
            **(checkout_session.payload or {}),
            "mpesa_callback": request.data,
            "mpesa_error": "Payment amount mismatch",
        }
        checkout_session.save(update_fields=["status", "payload", "updated_at"])
        broadcast_checkout_payment_status(checkout_session, "FAILED")
        logger.error(
            "M-Pesa amount mismatch for checkout %s: expected=%s received=%s",
            checkout_session.id,
            expected_amount,
            received_amount,
        )
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    order, created = materialize_paid_checkout(
        checkout_session,
        transaction_id=str(receipt),
        provider_amount=received_amount,
        provider_currency="KES",
    )

    payment = order.payment
    payment.payment_gateway = "MPESA"
    payment.payment_method = "MPESA"
    payment.order_tracking_id = checkout_request_id
    payment.transaction_id = str(receipt)
    payment.paid_at = timezone.now()
    payment.provider_amount = received_amount
    payment.provider_currency = "KES"
    payment.callback_payload = request.data
    payment.save(
        update_fields=[
            "payment_gateway",
            "payment_method",
            "order_tracking_id",
            "transaction_id",
            "paid_at",
            "provider_amount",
            "provider_currency",
            "callback_payload",
            "updated_at",
        ]
    )

    locked_order, completed = complete_paid_order(
        order,
        payment,
        transaction_id=str(receipt),
    )

    Transaction.objects.update_or_create(
        mpesa_receipt_number=str(receipt),
        defaults={
            "transaction_type": "C2B",
            "payment_method": "mpesa",
            "order": locked_order,
            "payment": locked_order.payment,
            "vendor": None,
            "amount": received_amount,
            "status": "completed",
            "account_reference": str(
                (checkout_session.payload or {}).get("mpesa", {}).get("merchant_reference")
                or checkout_session.id
            ),
            "raw_data": request.data,
            "phone_number": str(phone) if phone else None,
            "visitor_id": locked_order.visitor_id,
        },
    )

    checkout_session.status = "completed"
    checkout_session.order = locked_order
    checkout_session.payload = {
        **(checkout_session.payload or {}),
        "mpesa_callback": request.data,
        "mpesa": {
            **((checkout_session.payload or {}).get("mpesa") or {}),
            "receipt": str(receipt),
            "phone": str(phone) if phone else None,
        },
    }
    checkout_session.save(update_fields=["status", "order", "payload", "updated_at"])

    logger.info(
        "M-Pesa checkout %s completed: order=%s receipt=%s created=%s completed=%s",
        checkout_session.id,
        locked_order.id,
        receipt,
        created,
        completed,
    )

    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


@api_view(["POST"])
@permission_classes([AllowAny])
def mpesa_stk_timeout(request):
    checkout_request_id = (request.data or {}).get("CheckoutRequestID")
    if checkout_request_id:
        session = CheckoutSession.objects.filter(
            mpesa_checkout_request_id=checkout_request_id,
            status="payment_pending",
        ).first()
        if session:
            session.status = "failed"
            session.save(update_fields=["status", "updated_at"])
            broadcast_checkout_payment_status(session, "FAILED")
    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})
