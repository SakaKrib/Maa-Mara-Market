import json
import logging
from decimal import Decimal
import requests
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Order, Transaction, Card
from .views import IsAuthenticatedOrVisitor


logger = logging.getLogger(__name__)

# 🔹 Get PayPal access token
from .Payment import get_paypal_access_token


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
        # 2️⃣ Find the user's/visitor's order
        # -------------------------------------------------------
        filters = {"status__in": ["pending", "processing"]}
        if user:
            filters["user"] = user
        else:
            filters["visitor_id"] = visitor_id

        order = Order.objects.filter(**filters).order_by("-id").first()

        if not order:
            return Response(
                {"status": "error", "message": "No matching order found for this user/visitor"},
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
                    "status": "ok",
                    "message": "Capture completed but no capture ID returned, wait for webhook",
                }
            )

        # -------------------------------------------------------
        # 6️⃣ Save PayPal order ID (but don't change status)
        # -------------------------------------------------------
        order.paypal_order_id = order_id
        order.save(update_fields=["paypal_order_id"])


        logger.info("PayPal order captured successfully.")

        return Response({"status": "ok", "message": "Capture attempted"})

    except Exception as e:
        logger.exception("PayPal capture operation failed.")
        return Response({"status": "error", "message": "Payment capture failed."}, status=500)
