import requests
import base64
from datetime import datetime
from django.conf import settings
from django.db import transaction as db_transaction, IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import logging
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
@permission_classes([AllowAny])
def stk_push(request):
    try:
        phone = request.data.get("phone")
        amount = int(request.data.get("amount", 1))
        order_id = request.data.get("order_id")

        if not phone or not order_id:
            return Response({"error": "Phone number and order_id are required"}, status=400)

        phone = sanitize_phone(phone)
        logger.info("📱 Phone: %s | 💰 Amount: %s | 🆔 Order: %s", phone, amount, order_id)

        # ✅ Get order
        order = Order.objects.filter(id=order_id).first()
        if not order:
            return Response({"error": "Order not found"}, status=404)
        
        if not order.billing_address:
            logger.warning(f"⚠️ Order {order.id} has no billing address. Cannot initiate STK push.")
            return Response({"error": "Billing address is required before payment"}, status=400)

        logger.info(f"📦 Billing address for order {order.id}: {order.billing_address}")

        # ✅ Determine user/visitor
        visitor_id = request.COOKIES.get("visitor_id") or None

        # ✅ M-Pesa credentials
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
            "Amount": amount,
            "PartyA": phone,
            "PartyB": shortcode,
            "PhoneNumber": phone,
            "CallBackURL": callback_url,
            "AccountReference": str(order_id),
            "TransactionDesc": f"Payment for order {order_id}",
        }

        # ✅ Get OAuth token and send STK push
        token = get_mpesa_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        response = requests.post(stk_url, json=payload, headers=headers, timeout=30)
        logger.info(f"🟡 STK RAW RESPONSE: {response.text}")

        if response.status_code != 200:
            logger.error(f"❌ Safaricom Error: {response.text}")
            return Response(
                {"error": "Safaricom rejected request", "details": response.text},
                status=response.status_code
            )


        data = response.json()
        logger.info("STK Push request sent successfully: %s", data)

        # ✅ Extract CheckoutRequestID for tracking
        checkout_request_id = data.get("CheckoutRequestID")
        if not checkout_request_id:
            return Response({"error": "No CheckoutRequestID returned"}, status=500)

        # ✅ Create Payment record (store CheckoutRequestID temporarily)
        payment = Payment.objects.create(
            user=request.user if request.user.is_authenticated else None,
            visitor_id=visitor_id,
            payment_method="Mpesa",
            amount=amount,
            transaction_id=checkout_request_id,
            status="pending",
        )

        # ✅ Link Payment to Order
        order.payment = payment
        order.save()



        return Response({"message": "STK Push initiated", "checkout_request_id": checkout_request_id})

    except requests.exceptions.RequestException as e:
        logger.error("❌ STK Push failed: %s", str(e))
        return Response({"error": "STK Push failed", "details": str(e)}, status=500)

    except Exception as e:
        logger.error("❌ Unexpected error: %s", str(e))
        return Response({"error": str(e)}, status=500)

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
    data = request.data
    logger.info("✅ STK Callback Received: %s", data)

    stk_callback_data = data.get("Body", {}).get("stkCallback", {})
    checkout_request_id = stk_callback_data.get("CheckoutRequestID")
    result_code = stk_callback_data.get("ResultCode")
    result_desc = stk_callback_data.get("ResultDesc")

    amount = 0
    phone_number = None
    mpesa_receipt = None

    # --- Extract callback metadata ---
    callback_items = stk_callback_data.get("CallbackMetadata", {}).get("Item", [])
    for item in callback_items:
        name = item.get("Name")
        if name == "Amount":
            amount = item.get("Value", 0)
        elif name == "PhoneNumber":
            phone_number = str(item.get("Value"))
        elif name == "MpesaReceiptNumber":
            mpesa_receipt = item.get("Value")

    try:
        with db_transaction.atomic():
            # ✅ Find the Payment record using CheckoutRequestID
            payment = Payment.objects.filter(transaction_id=checkout_request_id).first()
            if not payment:
                logger.warning(f"⚠️ No Payment found for CheckoutRequestID {checkout_request_id}")
                return Response({"ResultCode": 0, "ResultDesc": "Payment not found"})

            # ✅ Fetch linked Order and extract visitor_id and user from DB (NOT from cookies)
            order = Order.objects.filter(payment=payment).first()
            if order:
                visitor_id = order.visitor_id
                user = order.user
            else:
                visitor_id = None
                user = None

            # --- Identify actor and get/create Customer ---
            if user and user.is_authenticated:
                actor_type = "user"
                actor_name = user.username
                customer, _ = Customer.objects.get_or_create(user=user)
            else:
                actor_type = "visitor"
                actor_name = f"Guest ({visitor_id[:8]})" if visitor_id else "Guest (unknown)"
                if visitor_id:
                    customer, _ = Customer.objects.get_or_create(visitor_id=visitor_id)
                else:
                    visitor_id = str(uuid.uuid4())
                    customer, _ = Customer.objects.get_or_create(visitor_id=visitor_id)

            # ✅ Update payment info
            payment.transaction_id = mpesa_receipt
            payment.status = "completed" if result_code == 0 else "failed"
            payment.save()
            logger.info(f"💰 Payment {mpesa_receipt} updated to {payment.status}")

            # ✅ Save transaction record
            Transaction.objects.create(
                transaction_type="C2B",
                 payment_method="mpesa", 
                mpesa_receipt_number=mpesa_receipt,
                phone_number=phone_number,
                amount=amount,
                account_reference=checkout_request_id,
                status="Completed" if result_code == 0 else "Failed",
                raw_data=data,
                order=order if order else None
            )

            # ✅ If payment succeeded, mark linked order as completed and update customer
            if result_code == 0:
                if not order:
                    logger.warning(f"⚠️ No Order linked to Payment {payment.id}")
                    return Response({"ResultCode": 0, "ResultDesc": "No linked order"})

                order.status = "completed"
                order.customer = customer
                order.save()
                logger.info(f"✅ Order {order.id} marked as completed")

                # Save sold items and deduct stock
                for order_item in order.items.all():
                    try:
                        sold_item = SoldItem(
                            item=order_item.item,
                            vendor=order_item.item.vendor,
                            quantity=order_item.quantity,
                        )
                        sold_item.save()
                        logger.info(f"🛒 SoldItem created for item {order_item.item.name} (qty: {order_item.quantity})")
                    except Exception as e:
                        logger.error(f"❌ Failed to create SoldItem for {order_item.item.name}: {e}")

                if not order.billing_address:
                    logger.warning(f"⚠️ Order {order.id} has no billing address. Skipping customer update.")
                else:
                    logger.info(f"➡️ About to create or update customer for order {order.id}")
                    create_or_update_customer_from_order(order)
                    logger.info(f"⬅️ Finished customer create/update for order {order.id}")

                # --- 🔔 Notify Frontend via WebSocket ---
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"order_{order.id}",
                    {"type": "payment_status", "status": "completed"},
                )
                async_to_sync(channel_layer.group_send)(
                    f"order_{order.id}",
                    {
                        "type": "transaction.success",
                        "message": {
                            "order_id": order.id,
                            "amount": order.get_total(),
                            "status": "success",
                            "customer": f"{order.billing_address.first_name} {order.billing_address.last_name}",
                        },
                    },
                )

                # --- 🧾 Notify Vendor(s) ---
                for order_item in order.items.all():
                    vendor_user = getattr(order_item.item.vendor, "user", None)
                    if vendor_user:
                        # Build variant info
                        variants = []
                        if hasattr(order_item, "selected_size") and order_item.selected_size:
                            variants.append(f"Size: {order_item.selected_size}")
                        if hasattr(order_item, "selected_color") and order_item.selected_color:
                            variants.append(f"Color: {order_item.selected_color}")
                        if hasattr(order_item, "custom_length") and order_item.custom_length:
                            variants.append(f"Length: {order_item.custom_length}")
                        variant_text = ", ".join(variants) if variants else "No variants selected"

                        # price = getattr(order_item, "price_at_purchase", order_item.item.price)
                        price = order_item.item.price
                        total_amount = price * order_item.quantity

                        # Notifications
                        Notification.objects.create(
                            user=vendor_user,
                            title="🎉 Item Purchased!",
                            message=f"Your item '{order_item.item.name}' ({variant_text}) was purchased by {actor_name}.",
                            url=f"/vendors-dashboard/vendor/orders/{order.id}"
                        )

                        # Send email
                        if vendor_user.email:
                            weight_obj = getattr(order_item.item, "weight", None)
                            weight = f"{weight_obj.value} {weight_obj.unit}" if weight_obj else "N/A"
                            context = {
                                "vendor": vendor_user.first_name,
                                "item": order_item.item,
                                "quantity": order_item.quantity,
                                "variants": variant_text,
                                "price_at_purchase": price,
                                "total_amount": total_amount,
                                "weight": weight,
                                "order": order,
                                "current_year": timezone.now().year,
                            }
                            html_content = render_to_string("emails/item_purchased.html", context)
                            subject = f"🎉 Your item '{order_item.item.name}' has been purchased!"
                            from_email = "no-reply@maamaramarket.com"
                            to_email = [vendor_user.email]
                            msg = EmailMultiAlternatives(subject, "", from_email, to_email)
                            msg.attach_alternative(html_content, "text/html")
                            msg.send()
                            logger.info(f"📧 Item purchased email sent to {vendor_user.email} with variants: {variant_text}")

        

                # --- 👤 Notify Customer/User ---
                if order.user:
                    Notification.objects.create(
                        user=order.user,
                        title="🛍️ Purchase Successful!",
                        message=f"Thank you for your purchase! Your order #{order.id} is confirmed.",
                        url=f"/orders/{order.id}/"
                    )
                    logger.info(f"📩 User {order.user.username} notified")

                # --- 🧑‍💼 Notify Admin(s) ---
                for admin in User.objects.filter(is_superuser=True):
                    Notification.objects.create(
                        user=admin,
                        title="💼 New Sale Completed",
                        message=f"Order #{order.id} (Total: KES {amount}) for {actor_name} has been completed.",
                        url=f"/admin-dashboard/admin-item/orders/{order.id}/"
                    )
                    logger.info(f"🗂️ Admin {admin.username} notified")

                # --- 🪵 Log Activities ---
                ActivityLog.objects.create(
                    user=user if user else None,
                    visitor_id=None if user else visitor_id,
                    actor_type=actor_type,
                    action="item_sold",
                    description=f"Completed purchase for order #{order.id}",
                    related_url=f"/orders/{order.id}/",
                )
                for order_item in order.items.all():
                    vendor_user = getattr(order_item.item.vendor, "user", None)
                    if vendor_user:
                        ActivityLog.objects.create(
                            user=vendor_user,
                            actor_type="vendor",
                            action="item_sold",
                            description=f"Sold '{order_item.item.name}' in order #{order.id}",
                            related_url=f"/vendor/orders/{order.id}/",
                        )
                for admin in User.objects.filter(is_superuser=True):
                    ActivityLog.objects.create(
                        user=admin,
                        actor_type="admin",
                        action="item_sold",
                        description=f"Order #{order.id} marked as completed.",
                        related_url=f"/admin/orders/{order.id}/",
                    )

    except IntegrityError:
        logger.warning("⚠️ Duplicate transaction detected for %s", mpesa_receipt)

    except Exception as e:
        logger.error(f"❌ Error in STK callback: {e}")

    # ✅ Always return success to Safaricom
    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})
