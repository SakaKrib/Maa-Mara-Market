import requests
import base64
from datetime import datetime
from django.conf import settings
from django.db import transaction as db_transaction, IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import logging
from decimal import Decimal
from django.contrib.auth import get_user_model
from oder.models import Transaction, Order, Customer, BillingAddress
from oder.views import IsAuthenticatedOrVisitor
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from oder.models import Payment
from vendorDashboard.models import SoldItem
from core.models import ActivityLog, Notification
from oder.paypalApis import create_or_update_customer_from_order

import uuid
User = get_user_model()

logger = logging.getLogger(__name__)



# ----------------------
# Helper Functions
# ----------------------
def get_mpesa_token():
    """Get OAuth token from Safaricom sandbox or production"""
    consumer_key = settings.PAYMENT_GATEWAYS["mpesa"]["consumer_key"].strip()
    consumer_secret = settings.PAYMENT_GATEWAYS["mpesa"]["consumer_secret"].strip()
    auth_url = settings.PAYMENT_GATEWAYS["mpesa"]["auth_url"].strip()

    response = requests.get(auth_url, auth=(consumer_key, consumer_secret))
    response.raise_for_status()
    token = response.json().get("access_token")
    return token


def generate_stk_password(shortcode: str, passkey: str, timestamp: str) -> str:
    """Generate base64 encoded STK password"""
    raw = shortcode + passkey + timestamp
    return base64.b64encode(raw.encode()).decode()


def sanitize_phone(phone: str) -> str:
    """Convert phone into Safaricom format (2547XXXXXXXX)"""
    digits = "".join(filter(str.isdigit, phone))
    if digits.startswith("0"):
        digits = "254" + digits[1:]
    elif digits.startswith("7") and len(digits) == 9:
        digits = "254" + digits
    return digits


# ----------------------
# STK Push Endpoint
# ----------------------
@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def stk_push(request):
    """Initiate an STK payment for the caller's own pending order."""
    try:
        order_id = request.data.get("order_id")
        phone = request.data.get("phone")

        if not order_id or not phone:
            return Response({"error": "Phone number and order_id are required"}, status=400)

        phone = sanitize_phone(phone)
        if len(phone) != 12 or not phone.startswith("2547"):
            return Response({"error": "Invalid Kenyan phone number"}, status=400)

        user = request.user if request.user and request.user.is_authenticated else None
        visitor_id = request.COOKIES.get("visitorId") if not user else None

        order_qs = Order.objects.filter(id=order_id, status="pending")
        if user:
            order_qs = order_qs.filter(user=user, visitor_id__isnull=True)
        else:
            if not visitor_id:
                return Response({"error": "Visitor identity is required"}, status=401)
            order_qs = order_qs.filter(user__isnull=True, visitor_id=visitor_id)

        order = order_qs.select_related("billing_address", "payment").first()
        if not order:
            return Response({"error": "Order not found"}, status=404)

        if not order.billing_address:
            return Response({"error": "Billing address is required before payment"}, status=400)

        amount = Decimal(str(order.final_total_of_cart()))
        if amount <= 0:
            return Response({"error": "Order amount must be greater than zero"}, status=400)

        shortcode = str(settings.PAYMENT_GATEWAYS["mpesa"]["stk_push"]["shortcode"]).strip()
        passkey = str(settings.PAYMENT_GATEWAYS["mpesa"]["stk_push"]["passkey"]).strip()
        callback_url = settings.PAYMENT_GATEWAYS["mpesa"]["stk_push"]["callback_url"].strip()
        stk_url = settings.PAYMENT_GATEWAYS["mpesa"]["stk_push"]["stk_url"].strip()

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = generate_stk_password(shortcode, passkey, timestamp)

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": shortcode,
            "PhoneNumber": phone,
            "CallBackURL": callback_url,
            "AccountReference": str(order.id),
            "TransactionDesc": f"Payment for order {order.id}",
        }

        token = get_mpesa_token()
        response = requests.post(
            stk_url,
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        checkout_request_id = data.get("CheckoutRequestID")
        if not checkout_request_id:
            logger.error("M-Pesa STK response did not contain CheckoutRequestID")
            return Response({"error": "Payment provider did not return a checkout reference"}, status=502)

        payment = order.payment
        if payment and payment.status == "pending":
            payment.transaction_id = checkout_request_id
            payment.amount = amount
            payment.payment_method = "Mpesa"
            payment.save(update_fields=["transaction_id", "amount", "payment_method"])
        else:
            payment = Payment.objects.create(
                user=user,
                visitor_id=visitor_id,
                payment_method="Mpesa",
                amount=amount,
                transaction_id=checkout_request_id,
                status="pending",
            )
            order.payment = payment
            order.save(update_fields=["payment"])

        return Response({
            "message": "STK Push initiated",
            "checkout_request_id": checkout_request_id,
            "order_id": order.id,
            "amount": str(amount),
        })

    except requests.exceptions.RequestException:
        logger.exception("M-Pesa STK Push provider request failed")
        return Response({"error": "Payment provider request failed"}, status=502)
    except (KeyError, ValueError, TypeError, ArithmeticError):
        logger.exception("Invalid M-Pesa STK configuration or order amount")
        return Response({"error": "Unable to initiate payment"}, status=400)
    except Exception:
        logger.exception("Unexpected STK Push error")
        return Response({"error": "Unable to initiate payment"}, status=500)


# ----------------------
# STK Callback Endpoint
# ----------------------

logger = logging.getLogger(__name__)
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone


@api_view(["POST"])
@permission_classes([AllowAny])
def stk_callback(request):
    """Reconcile a Safaricom STK result exactly once."""
    data = request.data
    callback = data.get("Body", {}).get("stkCallback", {})
    checkout_request_id = callback.get("CheckoutRequestID")
    result_code = callback.get("ResultCode")
    result_desc = callback.get("ResultDesc", "")

    if not checkout_request_id:
        logger.warning("STK callback missing CheckoutRequestID")
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    try:
        with db_transaction.atomic():
            payment = (
                Payment.objects.select_for_update()
                .filter(transaction_id=checkout_request_id)
                .first()
            )
            if not payment:
                # A repeated callback after the first successful callback has
                # already replaced the checkout ID with the receipt number.
                logger.info("Ignoring unknown/replayed STK callback.")
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            order = (
                Order.objects.select_for_update()
                .filter(payment=payment)
                .first()
            )
            if not order:
                logger.warning("STK payment %s has no linked order.", payment.id)
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            if result_code != 0:
                payment.status = "failed"
                payment.save(update_fields=["status"])
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            callback_items = callback.get("CallbackMetadata", {}).get("Item", [])
            metadata = {
                entry.get("Name"): entry.get("Value")
                for entry in callback_items
                if entry.get("Name")
            }
            receipt = metadata.get("MpesaReceiptNumber")
            callback_amount = metadata.get("Amount")

            if not receipt:
                logger.error("Successful STK callback missing M-Pesa receipt.")
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            if callback_amount is None or Decimal(str(callback_amount)) != payment.amount:
                logger.error(
                    "STK amount mismatch for order %s: provider=%s expected=%s",
                    order.id,
                    callback_amount,
                    payment.amount,
                )
                payment.status = "failed"
                payment.save(update_fields=["status"])
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            # The completion service locks the order and performs payment,
            # stock, and SoldItem changes atomically.
            payment.transaction_id = receipt
            payment.status = "completed"
            payment.save(update_fields=["transaction_id", "status"])

            transaction_record = Transaction.objects.filter(
                payment=payment,
                transaction_type="C2B",
            ).first()
            if not transaction_record:
                Transaction.objects.create(
                    transaction_type="C2B",
                    payment_method="mpesa",
                    mpesa_receipt_number=receipt,
                    phone_number=str(metadata.get("PhoneNumber") or ""),
                    amount=Decimal(str(callback_amount)),
                    account_reference=checkout_request_id,
                    status="Completed",
                    raw_data=data,
                    order=order,
                )

            from oder.order_completion import complete_paid_order
            locked_order, completed = complete_paid_order(
                order,
                payment,
                transaction_id=receipt,
            )

        if completed:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"order_{locked_order.id}",
                {"type": "payment_status", "status": "completed"},
            )

        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

    except Exception:
        logger.exception("Error processing STK callback")
        # Safaricom should not be given internal exception details.
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})
