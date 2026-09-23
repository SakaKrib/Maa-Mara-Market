import base64
import logging
from datetime import datetime
from decimal import Decimal

import requests
from django.conf import settings
from django.db import transaction as db_transaction
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from order.checkout_sessions import get_owned_checkout_session, materialize_paid_checkout
from order.models import CheckoutSession, Transaction
from order.order_completion import complete_paid_order
from order.views import IsAuthenticatedOrVisitor


logger = logging.getLogger(__name__)


def get_mpesa_token():
    config = settings.PAYMENT_GATEWAYS["mpesa"]
    response = requests.get(
        config["auth_url"].strip(),
        auth=(
            config["consumer_key"].strip(),
            config["consumer_secret"].strip(),
        ),
        timeout=10,
    )
    response.raise_for_status()
    token = response.json().get("access_token")
    if not token:
        raise ValueError("M-Pesa OAuth response did not contain an access token.")
    return token


def generate_stk_password(shortcode: str, passkey: str, timestamp: str) -> str:
    raw = shortcode + passkey + timestamp
    return base64.b64encode(raw.encode()).decode()


def sanitize_phone(phone: str) -> str:
    digits = "".join(filter(str.isdigit, str(phone)))
    if digits.startswith("0"):
        digits = "254" + digits[1:]
    elif digits.startswith("7") and len(digits) == 9:
        digits = "254" + digits
    return digits


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def stk_push(request):
    """Initiate STK Push against a transient checkout session."""
    checkout_id = request.data.get("checkout_id")
    phone = request.data.get("phone")

    if not checkout_id or not phone:
        return Response({"error": "Phone number and checkout_id are required"}, status=400)

    try:
        checkout_session = get_owned_checkout_session(
            request,
            checkout_id,
            for_update=True,
        )
    except (ValueError, TypeError):
        checkout_session = None

    if not checkout_session:
        return Response({"error": "Checkout session not found"}, status=404)
    if checkout_session.payment_method != "Mpesa":
        return Response({"error": "Checkout payment method mismatch"}, status=400)
    if checkout_session.status == "completed" and checkout_session.order_id:
        return Response(
            {
                "message": "Payment already completed.",
                "order_id": checkout_session.order_id,
            },
            status=409,
        )
    if checkout_session.status not in {"draft", "payment_pending"}:
        return Response({"error": "Checkout session is no longer payable"}, status=409)

    phone = sanitize_phone(phone)
    if len(phone) != 12 or not phone.startswith("2547"):
        return Response({"error": "Invalid Kenyan phone number"}, status=400)

    payload = checkout_session.payload or {}
    mpesa = settings.PAYMENT_GATEWAYS["mpesa"]
    stk_config = mpesa["stk_push"]

    reference = payload.get("mpesa_reference")
    if not reference:
        reference = checkout_session.id.hex[:12]
        payload["mpesa_reference"] = reference
        checkout_session.payload = payload

    if checkout_session.mpesa_checkout_request_id:
        return Response(
            {
                "message": "An M-Pesa payment request is already pending.",
                "checkout_request_id": checkout_session.mpesa_checkout_request_id,
                "checkout_id": str(checkout_session.id),
                "amount": str(checkout_session.amount),
            },
            status=409,
        )

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = generate_stk_password(
        str(stk_config["shortcode"]).strip(),
        str(stk_config["passkey"]).strip(),
        timestamp,
    )

    provider_payload = {
        "BusinessShortCode": str(stk_config["shortcode"]).strip(),
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(checkout_session.amount),
        "PartyA": phone,
        "PartyB": str(stk_config["shortcode"]).strip(),
        "PhoneNumber": phone,
        "CallBackURL": stk_config["callback_url"].strip(),
        "AccountReference": reference,
        "TransactionDesc": f"Payment for checkout {reference}",
    }

    try:
        token = get_mpesa_token()
        response = requests.post(
            stk_config["stk_url"].strip(),
            json=provider_payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        response.raise_for_status()
        provider_data = response.json()
    except requests.exceptions.RequestException:
        logger.exception("M-Pesa STK Push provider request failed.")
        return Response({"error": "Payment provider request failed"}, status=502)
    except (ValueError, TypeError, KeyError):
        return Response({"error": "Unable to initiate M-Pesa payment"}, status=502)

    checkout_request_id = provider_data.get("CheckoutRequestID")
    if not checkout_request_id:
        return Response(
            {"error": "Payment provider did not return a checkout reference"},
            status=502,
        )

    checkout_session.mpesa_checkout_request_id = checkout_request_id
    checkout_session.status = "payment_pending"
    checkout_session.save(
        update_fields=[
            "mpesa_checkout_request_id",
            "payload",
            "status",
            "updated_at",
        ]
    )

    return Response(
        {
            "message": "STK Push initiated",
            "checkout_request_id": checkout_request_id,
            "checkout_id": str(checkout_session.id),
            "amount": str(checkout_session.amount),
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def stk_callback(request):
    """Reconcile Safaricom STK results and materialize the paid checkout."""
    data = request.data
    callback = data.get("Body", {}).get("stkCallback", {})
    checkout_request_id = callback.get("CheckoutRequestID")
    result_code = callback.get("ResultCode")

    if not checkout_request_id:
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    try:
        with db_transaction.atomic():
            checkout_session = (
                CheckoutSession.objects
                .select_for_update()
                .filter(mpesa_checkout_request_id=checkout_request_id)
                .first()
            )

            if not checkout_session:
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            if checkout_session.payment_method != "Mpesa":
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            if checkout_session.status == "completed" and checkout_session.order_id:
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            if result_code != 0:
                checkout_session.status = "failed"
                checkout_session.save(update_fields=["status", "updated_at"])
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            callback_items = callback.get("CallbackMetadata", {}).get("Item", [])
            metadata = {
                entry.get("Name"): entry.get("Value")
                for entry in callback_items
                if entry.get("Name")
            }

            receipt = metadata.get("MpesaReceiptNumber")
            callback_amount = metadata.get("Amount")
            if not receipt or callback_amount is None:
                checkout_session.status = "failed"
                checkout_session.save(update_fields=["status", "updated_at"])
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            if Decimal(str(callback_amount)) != checkout_session.amount:
                checkout_session.status = "failed"
                checkout_session.save(update_fields=["status", "updated_at"])
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            order, _created = materialize_paid_checkout(
                checkout_session,
                transaction_id=receipt,
                provider_amount=checkout_session.amount,
                provider_currency="KES",
            )

            locked_order, completed = complete_paid_order(
                order,
                order.payment,
                transaction_id=receipt,
            )

            Transaction.objects.update_or_create(
                payment=locked_order.payment,
                transaction_type="C2B",
                defaults={
                    "payment_method": "mpesa",
                    "mpesa_receipt_number": receipt,
                    "phone_number": str(metadata.get("PhoneNumber") or ""),
                    "amount": Decimal(str(callback_amount)),
                    "account_reference": checkout_session.payload.get("mpesa_reference"),
                    "status": "Completed",
                    "raw_data": data,
                    "order": locked_order,
                    "visitor_id": locked_order.visitor_id,
                },
            )

            if completed:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"order_{locked_order.id}",
                    {"type": "payment_status", "status": "completed"},
                )

        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    except Exception:
        logger.exception("Error processing M-Pesa STK callback.")
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})
