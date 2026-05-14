# payments/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .Payment import create_paypal_order, capture_paypal_order
from .paymentserializer import *
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.utils import timezone
from .views import IsAuthenticatedOrVisitor
from oder.models import Customer
from django.db import transaction
from oder.models import BillingAddress, Order, Payment
import logging
from .models import Payment, Transaction, Order, Customer, Card
from core.models import ActivityLog, Notification
from django.db import transaction as db_transaction, IntegrityError
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.forms.models import model_to_dict
import uuid
from django.contrib.auth.models import User
import json
import requests
from django.conf import settings
import base64
from decimal import Decimal
from django.core.mail import send_mail, EmailMessage
from vendorDashboard.models import SoldItem
from vendorDashboard.models import Vendor
from .capture_order import get_paypal_access_token
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.shortcuts import get_object_or_404
from ReactSerializers.models import ColorVariant,SizeStock,AgeVariant,Length,Weight
from django.db import models
import time


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def paypal_create_order(request):
    amount = request.data.get("amount", "10.00")
    order = create_paypal_order(amount)
    return Response(order)

@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def paypal_capture_order(request, order_id):
    capture = capture_paypal_order(order_id)
    return Response(capture)


#   CREATE PAYMENT ORDER AND BILLING ADDRESS

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
@transaction.atomic
def checkout_view(request):
    """
    Checkout API: creates or updates order, billing, payment, and items.
    """
    serializer = CheckoutSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user = request.user if request.user.is_authenticated else None
    visitor_id = request.COOKIES.get("visitorId")
    if not visitor_id and not user:
        visitor_id = str(uuid.uuid4())  # fallback visitorId

    # ----------------------------
    # 1️⃣ Retrieve or create pending order
    # ----------------------------
    order, created_order = Order.objects.get_or_create(
        user=user,
        visitor_id=None if user else visitor_id,
        status="pending",
        defaults={"ordered_date": timezone.now()}
    )

    # ----------------------------
    # 2️⃣ Create or update billing address
    # ----------------------------
    billing_data = {
        "first_name": data["first_name"],
        "last_name": data["last_name"],
        "phone": data["phone"],
        "email": data["email"],
        "street_address": data["street_address"],
        "appartment_address": data.get("appartment_address", ""),
        "city": data["city"],
        "state": data.get("state", ""),
        "country": data["country"],
        "zip": data["zip"],
    }

    if not order.billing_address:
        billing = BillingAddress.objects.create(user=user, visitor_id=None if user else visitor_id, **billing_data)
        order.billing_address = billing
    else:
        billing = order.billing_address
        for key, value in billing_data.items():
            setattr(billing, key, value)
        billing.save()
    order.save()

    # ----------------------------
    # 3️⃣ Create or update payment
    # ----------------------------
    payment_method = data.get("payment_method", "Mpesa")
    if not order.payment:
        payment = Payment.objects.create(
            user=user,
            visitor_id=None if user else visitor_id,
            payment_method=payment_method,
            amount=0,
            status="pending"
        )
        order.payment = payment
    else:
        payment = order.payment
        payment.payment_method = payment_method
        payment.save()
    order.save()

    # ----------------------------
    # 4️⃣ Create or update customer
    # ----------------------------
    customer_data = {
        "full_name": f"{data['first_name']} {data['last_name']}",
        "first_name": data['first_name'],
        "last_name": data['last_name'],
        "email": data['email'],
        "phone_number": data['phone'],
        "billing_address": billing,
        "vendor": None,  # optional
    }
    if user:
        customer, _ = Customer.objects.update_or_create(user=user, defaults=customer_data)
    else:
        customer, _ = Customer.objects.update_or_create(visitor_id=visitor_id, defaults=customer_data)
    order.customer = customer
    order.save()

    # ----------------------------
    # 5️⃣ Sync order items
    # ----------------------------
    items_payload = data.get("items", [])
    current_ids = [i["id"] for i in items_payload]
    # Remove any items not in this payload
    order.items.exclude(item_id__in=current_ids).delete()

    total_amount = Decimal("0.00")

    for item_data in items_payload:
        item_id = item_data.get("id")
        quantity = int(item_data.get("quantity", 1))
        variant_id = item_data.get("variant_id")
        size_id = item_data.get("size_id")

        try:
            item = Item.objects.get(id=item_id)
        except Item.DoesNotExist:
            continue  # skip missing items

        variant = None
        size_stock = None
        if size_id:
            size_stock = get_object_or_404(SizeStock, pk=size_id)
            available_stock = size_stock.quantity_in_stock
        elif variant_id:
            variant = get_object_or_404(ColorVariant, pk=variant_id)
            available_stock = variant.sizes.aggregate(total=models.Sum('quantity_in_stock'))['total'] or 0
        else:
            available_stock = item.in_stock or 0

        if quantity > available_stock:
            return Response({
                "success": False,
                "error": f"Cannot add {quantity} of '{item.name}'. Only {available_stock} in stock."
            }, status=400)

        order_item, created = OderItem.objects.get_or_create(
            order=order,
            item=item,
            user=user,
            visitor_id=None if user else visitor_id,
            defaults={
                "quantity": quantity,
                "price_at_purchase": item.get_item_final_price(),
            }
        )
        if not created:
            order_item.quantity = quantity
            order_item.price_at_purchase = item.get_item_final_price()
            order_item.save()

        total_amount += order_item.get_final_price()

    # ----------------------------
    # 6️⃣ Update payment amount
    # ----------------------------
    payment.amount = total_amount
    payment.save()

    # ----------------------------
    # 7️⃣ Response
    # ----------------------------
    response_data = OrderResponseSerializer(order).data
    response_data["order_id"] = order.id

    return Response(response_data, status=status.HTTP_201_CREATED)


# ==============================
# 🔹rest api get customers
# ==============================

import logging
logger = logging.getLogger(__name__)

def notify_vendor_customer_update(customer):
    if not customer.vendor:
        return

    vendor_user_id = customer.vendor.id
    group_name = f"customers_{vendor_user_id}"

    # Ensure country is a string
    country = customer.country
    if hasattr(country, "code"):
        country = country.code
    else:
        country = str(country)

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "customer_update",
            "customer": {
                "id": customer.id,
                "full_name": customer.full_name,
                "email": customer.email,
                "phone_number": customer.phone_number,
                "city": customer.city,
                "country": country,  # ← FIXED
                "created_at": customer.created_at.isoformat(),
            }
        }
    )

#------------------------

def create_or_update_customer_from_order(order):
    """Create or update a customer only when payment is confirmed and billing info is available."""
    if not order or not hasattr(order, "id"):
        logger.warning("⚠️ Invalid order object. Cannot update customer.")
        return

    if not getattr(order, "payment_confirmed", False):
        logger.info(f"💳 Payment not confirmed for Order {order.id}. Skipping.")
        return

    billing = getattr(order, "billing_address", None)
    if not billing:
        logger.warning(f"⚠️ Order {order.id} has no billing address. Cannot update customer.")
        return

    user = order.user
    visitor_id = order.visitor_id

    # 🔥 NEW: Extract vendor from items
    vendor = None
    for order_item in order.items.all():
        vendor = getattr(order_item.item.vendor, "user", None)
        if vendor:
            break

    if not vendor:
        logger.warning(f"⚠️ No vendor found in order {order.id}. Cannot assign vendor to customer.")
    
    lookup = {"user": user} if user else {"visitor_id": visitor_id}
    customer = Customer.objects.filter(**lookup).first()

    # --- Create new customer ---
    if not customer:
        required_fields = [billing.first_name, billing.last_name, billing.email]
        if any(not field for field in required_fields):
            logger.warning(
                f"⚠️ Missing required fields for NEW customer for Order {order.id}. Skipping creation."
            )
            return

        customer = Customer.objects.create(
            **lookup,
            vendor=vendor,   # 🔥 Save vendor when creating
            full_name=f"{billing.first_name} {billing.last_name}".strip(),
            first_name=billing.first_name,
            last_name=billing.last_name,
            email=billing.email,
            phone_number=billing.phone,
            address=billing.street_address,
            city=billing.city,
            country=billing.country,
        )
        created = True

    else:
        created = False

        # 🔥 If customer exists but has no vendor yet → assign vendor
        if vendor and not customer.vendor:
            customer.vendor = vendor
            customer.save(update_fields=["vendor"])
            logger.info(f"🏷️ Vendor assigned to existing customer {customer.id}")

    # --- Update customer fields ---
    def update_if_changed(cust, billing_info):
        updated = False
        fields = {
            "first_name": billing_info.first_name or cust.first_name,
            "last_name": billing_info.last_name or cust.last_name,
            "email": billing_info.email or cust.email,
            "phone_number": billing_info.phone,
            "address": billing_info.street_address,
            "city": billing_info.city,
            "country": billing_info.country,
        }
        for field, new_value in fields.items():
            if getattr(cust, field) != new_value:
                setattr(cust, field, new_value)
                updated = True

        full_name = f"{cust.first_name} {cust.last_name}".strip()
        if cust.full_name != full_name:
            cust.full_name = full_name
            updated = True

        if updated:
            cust.save()
            logger.info(f"🔄 Customer updated: {cust.full_name}")

    if not created:
        update_if_changed(customer, billing)

    # Link customer → order
    if order.customer_id != customer.id:
        order.customer = customer
        order.save(update_fields=["customer"])

    # Mark order completed
    if order.status != "completed":
        order.status = "completed"
        order.save(update_fields=["status"])

    logger.info(
        f"✅ Customer {'created' if created else 'updated'} for order {order.id} (visitor={visitor_id})"
    )

    # call the websocket message trigger send
    notify_vendor_customer_update(customer)



# ==============================
# 🔹rest api get customers
# ==============================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_customers(request):
    vendor_user_id = request.query_params.get("vendor_user_id")

    if vendor_user_id:
        vendor_user = User.objects.filter(id=vendor_user_id).first()
    else:
        vendor_user = request.user

    if not vendor_user:
        return Response({"error": "Vendor user not found"}, status=404)

    vendor = Vendor.objects.filter(user=vendor_user).first()
    if not vendor:
        return Response({"customers": []})

    customers_qs = Customer.objects.filter(vendor=vendor.user)  # <-- Here is the fix

    customers = []
    for customer in customers_qs:
        data = model_to_dict(customer)
        for k, v in data.items():
            if hasattr(v, "isoformat"):
                data[k] = v.isoformat()
        customers.append(data)

    return Response({"customers": customers}, status=200)






   



# ==============================
# 🔹 Verify PayPal Webhook Signature (Optional)
# ==============================
def verify_paypal_signature(raw_body, request):
    """
    Verifies PayPal webhook authenticity by validating the signature
    using PayPal's REST API.
    """
    PAYPAL = settings.PAYMENT_GATEWAYS["paypal"]
    try:
        # 1️⃣ Get OAuth token
        auth_resp = requests.post(
            PAYPAL["auth_url"],
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL["client_id"], PAYPAL["client_secret"]),
            timeout=10,
        )
        if auth_resp.status_code != 200:
            logger.error(f"❌ PayPal OAuth failed: {auth_resp.status_code} {auth_resp.text}")
            return False

        access_token = auth_resp.json().get("access_token")
        if not access_token:
            logger.error("⚠️ PayPal access_token missing")
            return False

        # 2️⃣ Prepare verification headers
        verify_url = f"{PAYPAL['base_url']}/v1/notifications/verify-webhook-signature"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }

        # 3️⃣ Prepare verification body
        body = {
            "auth_algo": request.headers.get("Paypal-Auth-Algo"),
            "cert_url": request.headers.get("Paypal-Cert-Url"),
            "transmission_id": request.headers.get("Paypal-Transmission-Id"),
            "transmission_sig": request.headers.get("Paypal-Transmission-Sig"),
            "transmission_time": request.headers.get("Paypal-Transmission-Time"),
            "webhook_id": PAYPAL["webhook_id"],  # Must match your PayPal dashboard webhook ID
            "webhook_event": json.loads(raw_body),
        }

        # 4️⃣ Send verification request
        resp = requests.post(verify_url, headers=headers, json=body, timeout=10)
        logger.info(f"🔹 PayPal verify response: {resp.status_code} {resp.text}")

        return resp.json().get("verification_status") == "SUCCESS"

    except Exception as e:
        logger.exception(f"⚠️ PayPal signature verification failed: {e}")
        return False



# ==============================
# 🔹 PAYPAL INVOICE
# ==============================
import time
import json
import logging
import requests


logger = logging.getLogger(__name__)

def send_paypal_invoice(order):
    token = get_paypal_access_token()
    url = "https://api.sandbox.paypal.com/v2/invoicing/invoices"

    # Determine recipient email safely
    email = (
        (order.user.email if order.user and order.user.email else None) or
        (getattr(order.billing_address, 'email', None) if order.billing_address else None) or
        (getattr(order.customer, 'email', None) if hasattr(order, 'customer') else None)
    )

    if not email:
        raise ValueError(f"No email available to send invoice for order {order.id}")

    billing = order.billing_address
    first_name = getattr(billing, "first_name", "Customer") if billing else "Customer"
    last_name = getattr(billing, "last_name", "") if billing else ""

    currency_code = getattr(order, "currency", "USD")  # Adjust if order has no currency field

    payload = {
        "detail": {
            "invoice_number": f"INV-{order.id}-{int(time.time())}",
            "currency_code": currency_code,
            "note": "Thank you for your purchase!",
            "terms_and_conditions": "Payment received via PayPal.",
        },
        "invoicer": {
            "name": {"given_name": "MaaMara", "surname": "Market"},
            "email_address": "hellomaamaramarket@gmail.com",
        },
        "primary_recipients": [
            {
                "billing_info": {
                    "name": {
                        "given_name": first_name,
                        "surname": last_name,
                    },
                    "email_address": email,
                }
            }
        ],
        "items": [
            {
                "name": order_item.item.name,
                "quantity": str(order_item.quantity),
                "unit_amount": {
                    "currency_code": currency_code,
                    "value": f"{order_item.get_final_price():.2f}",
                },
            }
            for order_item in order.items.all()  # or order.order_items.all() depending on your model
        ],
    }

    logger.info(f"Sending PayPal invoice payload for order {order.id}")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    try:
        # Step 1: Create invoice
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()

        try:
            invoice = response.json()
            logger.info(f"PayPal invoice creation response: {invoice}")
        except ValueError:
            logger.error(f"Invalid JSON response from PayPal: {response.text}")
            raise

        # If response lacks 'id', try fetching invoice details using href
        if "id" not in invoice:
            if isinstance(invoice, dict) and "href" in invoice:
                invoice_url = invoice["href"]
                logger.info(f"Invoice creation returned link only, attempting GET {invoice_url}")
                get_resp = requests.get(invoice_url, headers=headers, timeout=30)
                get_resp.raise_for_status()
                invoice = get_resp.json()
                logger.info(f"Fetched full invoice: {invoice}")
                if "id" not in invoice:
                    raise ValueError("Fetched invoice response missing 'id'")
            else:
                raise ValueError("Failed to create PayPal invoice with valid ID.")

        invoice_id = invoice["id"]

        # Step 2: Send invoice email
        send_url = f"{url}/{invoice_id}/send"
        send_response = requests.post(send_url, headers=headers, timeout=30)
        send_response.raise_for_status()
        logger.info(f"PayPal invoice email sent successfully for invoice {invoice_id}")

        return invoice

    except requests.exceptions.HTTPError as err:
        try:
            error_detail = response.json()
        except Exception:
            error_detail = response.text
        logger.error(f"PayPal invoice creation failed: {response.status_code} {error_detail}")
        raise

    except Exception as e:
        logger.error(f"Unexpected error sending PayPal invoice: {e}")
        raise


  






# ==============================
# 🔹 PAYPAL WEBHOOK
# ==============================


@api_view(["POST"])
@permission_classes([AllowAny])
def paypal_webhook(request):
    """
    Handles PayPal webhook events for payments and orders.
    Verifies authenticity and processes only relevant event types.
    Links transactions to cards if applicable.
    """
    try:
        raw_body = request.body
        logger.info("✅ PayPal Webhook Received: %s", raw_body.decode("utf-8"))

        # Parse JSON payload
        try:
            data = json.loads(raw_body)
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid webhook JSON: {e}")
            return Response({"status": "error", "message": "Invalid JSON"}, status=400)

        # Verify PayPal signature
        if not verify_paypal_signature(raw_body, request):
            logger.warning("⚠️ Invalid PayPal webhook signature")
            return Response({"status": "error", "message": "Invalid signature"}, status=400)

        event_type = (data.get("event_type") or "").upper()
        resource = data.get("resource", {})
        logger.info(f"🔔 Webhook Event: {event_type}")

        # Only process relevant events
        relevant_events = {
            "PAYMENT.CAPTURE.COMPLETED",
            "CHECKOUT.ORDER.COMPLETED",
            "PAYMENT.CAPTURE.DENIED",
            "PAYMENT.CAPTURE.REFUNDED",
            "PAYMENT.CAPTURE.REVERSED",
            "PAYMENT.CAPTURE.DECLINED",
        }
        if event_type not in relevant_events:
            logger.info(f"ℹ️ Ignored irrelevant event: {event_type}")
            return Response({"status": "ignored"})

        # Extract transaction details
        paypal_order_id = (
            resource.get("supplementary_data", {})
            .get("related_ids", {})
            .get("order_id")
            or resource.get("id")
        )
        status = resource.get("status", "").lower()
        amount = resource.get("amount", {}).get("value", "0.00")
        currency = resource.get("amount", {}).get("currency_code", "USD")
        payer_email = resource.get("payer", {}).get("email_address")

        logger.info(f"💳 PayPal payment {paypal_order_id}: {status} ({amount} {currency})")

        # Avoid duplicates
        existing_payment = Payment.objects.filter(transaction_id=paypal_order_id).first()
        if existing_payment and existing_payment.status == "completed":
            logger.info(f"⚠️ Payment {paypal_order_id} already processed")
            return Response({"status": "ok", "message": "Already processed"})

        with db_transaction.atomic():
            # Save or update Payment
            payment, _ = Payment.objects.update_or_create(
                transaction_id=paypal_order_id,
                defaults={
                    "amount": amount,
                    # "status": "completed" if status == "completed" else status,
                    "payment_method": "paypal",
                },
            )

            # Link with Order
            order = Order.objects.filter(paypal_order_id=paypal_order_id).first()
            if order and status == "completed" and order.status != "completed":
                order.status = "completed"
                order.save(update_fields=["status"])


                 # Save SoldItem records and update stock
                for order_item in order.items.all():
                    try:
                        sold_item = SoldItem(
                            item=order_item.item,
                            vendor=order_item.item.vendor,
                            quantity=order_item.quantity,
                        )
                        sold_item.save()
                        logger.info(f"🛒 SoldItem created for item {order_item.item.name} (qty: {order_item.quantity})")

                        # --- SEND EMAIL TO VENDOR ---
                        vendor_user = getattr(order_item.item.vendor, "user", None)
                        weight = order_item.item.weight
                        if vendor_user and vendor_user.email:
                            subject = f"🎉 Your item '{order_item.item.name}' has been purchased!"
                            from_email = "no-reply@maamaramarket.com"
                            to_email = [vendor_user.email]

                            # Build variant details
                            variants = []
                            if hasattr(order_item, "selected_size") and order_item.selected_size:
                                variants.append(f"Size: {order_item.selected_size}")
                            if hasattr(order_item, "selected_color") and order_item.selected_color:
                                variants.append(f"Color: {order_item.selected_color}")
                            if hasattr(order_item, "custom_length") and order_item.custom_length:
                                variants.append(f"Length: {order_item.custom_length}")
                            variant_text = ", ".join(variants) if variants else "No variants selected"

                            price = order_item.price_at_purchase or order_item.item.price
                            total_amount = price * order_item.quantity

                            html_content = render_to_string(
                                "emails/item_sold.html",
                                {
                                    "vendor": vendor_user,
                                    "item": order_item.item,
                                    "quantity": order_item.quantity,
                                    "variants": variant_text,
                                    "price_at_purchase": price,
                                    "total_amount": total_amount,
                                    "weight": weight,
                                    "order": order,
                                    "current_year": timezone.now().year,
                                }
                            )

                            email = EmailMultiAlternatives(subject, "", from_email, to_email)
                            email.attach_alternative(html_content, "text/html")
                            email.send()
                            logger.info(f"📧 Email sent to vendor {vendor_user.username} for item {order_item.item.name} with variants: {variant_text}")

                    except Exception as e:
                        logger.error(f"❌ Failed to create SoldItem or send email for {order_item.item.name}: {e}")


                

                # Send PayPal invoice only if not sent already
                try:
                    if not getattr(order, "paypal_invoice_id", None):
                        invoice = send_paypal_invoice(order)
                        logger.info(f"📧 PayPal Invoice sent: {invoice.get('id')}")
                        order.paypal_invoice_id = invoice.get('id')  # You must add this field to Order model
                        order.save(update_fields=['paypal_invoice_id'])
                except Exception as e:
                    logger.error(f"❌ Failed to send PayPal invoice: {e}")

                # -------------------------------------------------------
                # ✉️ Send Invoice Email to Customer
                # -------------------------------------------------------
                try:
                    if order.billing_address and order.billing_address.email:
                        customer_email = order.billing_address.email
                    elif order.user and order.user.email:
                        customer_email = order.user.email
                    else:
                        customer_email = None

                    if customer_email:
                        subject = f"🧾 Invoice for Your Order #{order.id}"

                        # Build detailed item list
                        items_details = ""
                        for oi in order.items.all():
                            item = oi.item
                            variants = []
                            if hasattr(oi, "selected_size") and oi.selected_size:
                                variants.append(f"Size: {oi.selected_size}")
                            if hasattr(oi, "selected_color") and oi.selected_color:
                                variants.append(f"Color: {oi.selected_color}")
                            if hasattr(oi, "custom_length") and oi.custom_length:
                                variants.append(f"Length: {oi.custom_length}")
                            variant_text = ", ".join(variants) if variants else "No variants"

                            price = oi.price_at_purchase or oi.get_final_price()
                            total_price = price * oi.quantity

                            items_details += (
                                f"- {item.name} ({variant_text})\n"
                                f"  Quantity: {oi.quantity}\n"
                                f"  Price per item: ${price:.2f}\n"
                                f"  Total: ${total_price:.2f}\n\n"
                            )

                        message = (
                            f"Hello {order.billing_address.first_name if order.billing_address else order.user.first_name},\n\n"
                            f"Thank you for your purchase!\n\n"
                            f"Order ID: #{order.id}\n\n"
                            f"Items:\n{items_details}"
                            f"Order Total: ${order.get_total():.2f}\n"
                            f"Payment Method: PayPal\n"
                            f"Transaction ID: {paypal_order_id}\n\n"
                            f"You can view your full order details here:\n"
                            f"http://maamaramarket.com/orders/{order.id}/\n\n"
                            f"Best regards,\n"
                            f"Maamara Market Team"
                        )

                        send_mail(
                            subject,
                            message,
                            settings.DEFAULT_FROM_EMAIL,
                            [customer_email],
                            fail_silently=False,
                        )

                        logger.info(f"📧 Invoice email sent to {customer_email} for Order #{order.id}")
                    else:
                        logger.warning(f"⚠️ No email found for Order #{order.id}, invoice not sent.")
                except Exception as email_err:
                    logger.error(f"❌ Failed to send invoice email for Order #{order.id}: {email_err}")

                # Log activity
                ActivityLog.objects.create(
                    user=order.user,
                    actor_type="user" if order.user else "guest",
                    action="paypal_payment",
                    description=f"PayPal order {paypal_order_id} completed.",
                    related_url=f"/orders/{order.id}/",
                )

                # Notify buyer
                if order.user:
                    Notification.objects.create(
                        user=order.user,
                        title="🛍️ PayPal Payment Successful",
                        message=f"Your order #{order.id} has been successfully paid.",
                        url=f"/orders/{order.id}/",
                    )

                # Notify vendor(s)
                for item in order.items.all():
                    vendor_user = getattr(item.item.vendor, "user", None)
                    if vendor_user:
                        Notification.objects.create(
                            user=vendor_user,
                            title="💰 New PayPal Sale!",
                            message=f"Your item '{item.item.name}' was purchased.",
                            url=f"/vendors-dashboard/vendor/orders/{order.id}/",
                        )

                # Notify admins
                for admin in User.objects.filter(is_superuser=True):
                    Notification.objects.create(
                        user=admin,
                        title="📦 PayPal Order Completed",
                        message=f"Order #{order.id} ({amount} {currency}) completed.",
                        url=f"/admin-dashboard/admin/orders/{order.id}/",
                    )

                logger.info(f"✅ Order #{order.id} marked as completed via webhook")

            # --- Extract card info if available ---
            card_info = None
            payment_source = resource.get("payment_source") or {}
            card_data = payment_source.get("card")
            if isinstance(card_data, dict) and card_data.get("brand"):
                card_info = {
                    "capture_id": resource.get("id"),
                    "brand": card_data.get("brand"),
                    "last_digits": card_data.get("last_digits"),
                    "type": card_data.get("type"),
                }

            saved_card = None
            if card_info:
                saved_card, _ = Card.objects.update_or_create(
                    capture_id=card_info["capture_id"],
                    defaults={
                        "brand": card_info["brand"],
                        "last_digits": card_info["last_digits"],
                        "type": card_info["type"],
                    }
                )
                logger.info(f"💳 Card info saved: {card_info}")

            # -------------------------------------------------------
            # 💾 Save Transaction(s) for Each Vendor
            # -------------------------------------------------------
            if order:
                vendor_ids = list(order.items.values_list("item__vendor", flat=True).distinct())
                logger.info(f"🧾 Order {order.id} vendor_ids: {vendor_ids}")

                if vendor_ids:
                    for vendor_id in vendor_ids:
                        vendor = Vendor.objects.get(id=vendor_id)
                        tx, created = Transaction.objects.update_or_create(
                            paypal_transaction_id=resource.get("id"),
                            vendor=vendor,
                            defaults={
                                "transaction_type": "PayPal",
                                "payment_method": "paypal",
                                "order": order,
                                "payment": payment,
                                "amount": Decimal(resource.get("amount", {}).get("value", "0.00")),
                                "status": status,
                                "payer_email": payer_email,
                                "raw_data": data,
                                "card": saved_card,
                                "card_brand": getattr(saved_card, "brand", None),
                                "card_type": getattr(saved_card, "type", None),
                                "last_4_digits": getattr(saved_card, "last_digits", None),
                            },
                        )
                    logger.info(f"✅ Transaction(s) {tx.paypal_transaction_id} created or updated successfully")
                else:
                    # No vendors found, create single transaction without vendor
                    tx, created = Transaction.objects.update_or_create(
                        paypal_transaction_id=resource.get("id"),
                        order=order,
                        defaults={
                            "transaction_type": "PayPal",
                            "payment_method": "paypal",
                            "amount": Decimal(resource.get("amount", {}).get("value", "0.00")),
                            "status": status,
                            "payer_email": payer_email,
                            "raw_data": data,
                            "payment": payment,
                            "card": saved_card,
                            "card_brand": getattr(saved_card, "brand", None),
                            "card_type": getattr(saved_card, "type", None),
                            "last_4_digits": getattr(saved_card, "last_digits", None),
                        },
                    )
                    logger.info(f"✅ Transaction {tx.paypal_transaction_id} (no vendor) created or updated successfully")

                    # Notify frontend via WebSocket
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

    except Exception as e:
        logger.exception(f"❌ PayPal webhook processing error: {e}")
        return Response({"status": "error", "message": str(e)}, status=500)

    return Response({"status": "ok", "message": "Webhook processed"})


