import logging
import requests
from decimal import Decimal
from django.db import transaction
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import Order, Transaction, Card
from .Payment import get_paypal_access_token
from .views import IsAuthenticatedOrVisitor


logger = logging.getLogger(__name__)


# 🔹 Fetch PayPal capture details
def get_capture_details(capture_id):
    PAYPAL = settings.PAYMENT_GATEWAYS["paypal"]
    token = get_paypal_access_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    # -------------------------------------------------------
    # 1️⃣ Fetch Capture Details
    # -------------------------------------------------------
    capture_url = f"{PAYPAL['base_url']}/v2/payments/captures/{capture_id}"
    response = requests.get(capture_url, headers=headers, timeout=10)

    try:
        data = response.json()
        logger.info("PayPal capture details retrieved successfully.")
    except ValueError:
        data = {"raw_text": response.text}

    if response.status_code != 200:
        logger.error("PayPal capture details request failed.")
        raise Exception("Failed to fetch PayPal capture details.")

    # -------------------------------------------------------
    # 2️⃣ Extract Related Order ID
    # -------------------------------------------------------
    order_id = (
        data.get("supplementary_data", {})
        .get("related_ids", {})
        .get("order_id")
    )

    # -------------------------------------------------------
    # 3️⃣ Fetch Payer Info and Card Info from Order
    # -------------------------------------------------------
    payer_email = None
    card_data = {}
    if order_id:
        try:
            order_url = f"{PAYPAL['base_url']}/v2/checkout/orders/{order_id}"
            order_resp = requests.get(order_url, headers=headers, timeout=10)
            order_data = order_resp.json()

            payer_email = order_data.get("payer", {}).get("email_address")
            logger.info("PayPal payer details retrieved successfully.")

            # Extract card details from order if present
            payment_source = order_data.get("payment_source", {})
            if "card" in payment_source:
                card_data = payment_source["card"]
                logger.info("PayPal payment source retrieved successfully.")

        except Exception as e:
            logger.warning("Could not fetch additional PayPal order details.")

    # -------------------------------------------------------
    # 4️⃣ Fallback: Try capture data for card info
    # -------------------------------------------------------
    if not card_data:
        card_data = data.get("payment_source", {}).get("card", {})

    # -------------------------------------------------------
    # 5️⃣ Save Card Info (if any)
    # -------------------------------------------------------
    card_info = None
    if card_data.get("brand"):
        card_info, _ = Card.objects.update_or_create(
            capture_id=capture_id,
            defaults={
                "brand": card_data.get("brand"),
                "last_digits": card_data.get("last_digits"),
                "type": card_data.get("type"),
            },
        )
        logger.info("PayPal card metadata saved successfully.")

    # -------------------------------------------------------
    # 6️⃣ Return Unified Result
    # -------------------------------------------------------
    amount_value = data.get("amount", {}).get("value", "0.00")
    currency = data.get("amount", {}).get("currency_code", "USD")
    status = data.get("status", "COMPLETED").capitalize()

    return {
        "capture_id": capture_id,
        "status": status,
        "amount": amount_value,
        "currency": currency,
        "payer_email": payer_email,
        "card": card_info,
        "raw_data": data,
    }




@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def capture_paypal_order(request, order_id):
    try:
        # -------------------------------------------------------
        # 1️⃣ Identify User or Visitor
        # -------------------------------------------------------
        if request.user and request.user.is_authenticated:
            user = request.user
            visitor_id = None
        else:
            token = request.COOKIES.get("visitorAccessToken")
            visitor_id = request.COOKIES.get("visitorId")
            user = None

            if token:
                try:
                    validated = JWTAuthentication().get_validated_token(token)
                    visitor_id_from_token = validated.get("visitor_id")
                    if visitor_id_from_token:
                        visitor_id = visitor_id_from_token
                except (InvalidToken, TokenError):
                    pass

        if not user and not visitor_id:
            return Response(
                {"status": "error", "message": "Unauthorized: missing user or visitor"},
                status=401,
            )

        # -------------------------------------------------------
        # 2️⃣ Find the exact local order represented by the PayPal ID.
        # Never capture against a different pending order.
        # -------------------------------------------------------
        order_qs = Order.objects.filter(
            paypal_order_id=order_id,
            status__in=["pending", "processing"],
        )

        if user:
            order_qs = order_qs.filter(user=user, visitor_id__isnull=True)
        else:
            order_qs = order_qs.filter(user__isnull=True, visitor_id=visitor_id)

        order = order_qs.select_related("payment").first()

        if not order:
            return Response(
                {"status": "error", "message": "PayPal order not found"},
                status=404,
            )

        # -------------------------------------------------------
        # 3️⃣ Check if transaction already exists for this PayPal order
        # -------------------------------------------------------
        existing_tx = Transaction.objects.filter(order__paypal_order_id=order_id).first()
        if existing_tx:
            logger.info("PayPal order already has a recorded transaction.")
            return Response(
                {
                    "status": "ok",
                    "message": "Order already captured",
                    "transaction_id": existing_tx.paypal_transaction_id,
                }
            )

        # -------------------------------------------------------
        # 4️⃣ Capture the order via PayPal API
        # -------------------------------------------------------
        PAYPAL = settings.PAYMENT_GATEWAYS["paypal"]
        token = get_paypal_access_token()
        url = f"{PAYPAL['base_url']}/v2/checkout/orders/{order_id}/capture"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        logger.info("Attempting PayPal capture.")
        resp = requests.post(url, headers=headers, timeout=10)

        try:
            capture_response = resp.json()
        except ValueError:
            capture_response = {"raw_text": resp.text}

        if resp.status_code not in [200, 201, 422]:
            logger.error("PayPal capture request failed.")
            return Response(
                {"status": "error", "message": "PayPal capture request failed."},
                status=resp.status_code,
            )

        # Handle already captured
        if resp.status_code == 422:
            details = capture_response.get("details", [])
            if details and details[0].get("issue") == "ORDER_ALREADY_CAPTURED":
                logger.warning("PayPal order was already captured.")
                return Response({"status": "ok", "message": "Order already captured"})

        # -------------------------------------------------------
        # 5️⃣ Extract capture ID
        # -------------------------------------------------------
        capture_id = None
        purchase_units = capture_response.get("purchase_units", [])
        if purchase_units:
            payments = purchase_units[0].get("payments", {})
            captures = payments.get("captures", [])
            if captures:
                capture_id = captures[0].get("id")

        if not capture_id:
            return Response(
                {
                    "status": "error",
                    "message": "PayPal capture did not return a capture ID.",
                },
                status=502,
            )

        capture = purchase_units[0]["payments"]["captures"][0]
        provider_amount = Decimal(str(capture.get("amount", {}).get("value", "0.00")))
        provider_currency = capture.get("amount", {}).get("currency_code", "USD").upper()
        expected_amount = order.payment.provider_amount
        expected_currency = (order.payment.provider_currency or "USD").upper()

        if (
            expected_amount is None
            or provider_amount != Decimal(str(expected_amount))
            or provider_currency != expected_currency
            or (capture.get("status") or "").upper() != "COMPLETED"
        ):
            logger.error("PayPal capture validation failed for local order %s.", order.id)
            return Response(
                {"status": "error", "message": "PayPal payment validation failed."},
                status=400,
            )

        from .order_completion import complete_paid_order

        with transaction.atomic():
            locked_order, completed = complete_paid_order(
                order,
                order.payment,
                transaction_id=capture_id,
            )

            vendor_ids = list(
                locked_order.items.values_list("item__vendor", flat=True).distinct()
            )
            for vendor_id in vendor_ids:
                Transaction.objects.update_or_create(
                    paypal_transaction_id=capture_id,
                    vendor_id=vendor_id,
                    defaults={
                        "transaction_type": "PayPal",
                        "payment_method": "paypal",
                        "order": locked_order,
                        "payment": locked_order.payment,
                        "amount": provider_amount,
                        "status": "completed",
                        "payer_email": capture_response.get("payer", {}).get("email_address"),
                        "raw_data": capture_response,
                    },
                )

            if not vendor_ids:
                Transaction.objects.update_or_create(
                    paypal_transaction_id=capture_id,
                    order=locked_order,
                    defaults={
                        "transaction_type": "PayPal",
                        "payment_method": "paypal",
                        "amount": provider_amount,
                        "status": "completed",
                        "payment": locked_order.payment,
                        "raw_data": capture_response,
                    },
                )

        logger.info("PayPal order %s captured and local order %s completed.", order_id, order.id)

        return Response({
            "status": "ok",
            "message": "Payment completed",
            "order": {
                "id": locked_order.id,
                "status": locked_order.status,
                "paypal_order_id": locked_order.paypal_order_id,
            },
        })

    except Exception as e:
        logger.exception("PayPal capture operation failed.")
        return Response({"status": "error", "message": "Payment capture failed."}, status=500)