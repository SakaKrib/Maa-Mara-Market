import json
import logging
import time
import uuid
from decimal import Decimal

import requests
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models, transaction
from django.forms.models import model_to_dict
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ReactSerializers.models import AgeVariant, ColorVariant, Item, Length, Shoe, SizeStock, Weight
from core.models import Notification
from vendorDashboard.models import SoldItem, Vendor

from .capture_order import get_paypal_access_token
from .models import BillingAddress, Customer, Order, Payment, Transaction
from .paymentserializer import CheckoutSerializer, OrderResponseSerializer
from .views import IsAuthenticatedOrVisitor

logger = logging.getLogger(__name__)


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
    if not items_payload:
        return Response({"success": False, "error": "Your cart is empty."}, status=400)

    # A cart can contain the same product more than once when the selected
    # variant differs, so the sync key must include the selected options.
    incoming_keys = set()
    total_amount = Decimal("0.00")

    for item_data in items_payload:
        item_id = item_data.get("id")
        quantity = int(item_data.get("quantity", 1))
        variant_id = item_data.get("variant_id")
        size_id = item_data.get("size_id")
        age_variant_id = item_data.get("age_variant_id")
        length_id = item_data.get("length_id")
        weight_id = item_data.get("weight_id")
        shoe_id = item_data.get("shoe_id")
        selected_shoe_size = item_data.get("selected_shoe_size", item_data.get("shoe_size"))

        if quantity < 1:
            return Response({"success": False, "error": "Quantity must be at least 1."}, status=400)

        item = get_object_or_404(Item, pk=item_id)

        variant = get_object_or_404(ColorVariant, pk=variant_id) if variant_id else None
        size_stock = get_object_or_404(SizeStock, pk=size_id) if size_id else None
        age_variant = get_object_or_404(AgeVariant, pk=age_variant_id) if age_variant_id else None
        length = get_object_or_404(Length, pk=length_id) if length_id else None
        weight = get_object_or_404(Weight, pk=weight_id) if weight_id else None
        shoe = get_object_or_404(Shoe, pk=shoe_id) if shoe_id else None

        if variant and variant.item_id != item.id:
            return Response({"success": False, "error": "Selected color is not available for this item."}, status=400)

        if size_stock:
            if size_stock.variant_id:
                if not variant or size_stock.variant_id != variant.id:
                    return Response({"success": False, "error": "Selected size does not match the selected color."}, status=400)
            elif size_stock.item_id != item.id:
                return Response({"success": False, "error": "Selected size is not available for this item."}, status=400)

        if age_variant and age_variant.item_id != item.id:
            return Response({"success": False, "error": "Selected age group is not available for this item."}, status=400)
        if length and length.item_id != item.id:
            return Response({"success": False, "error": "Selected length is not available for this item."}, status=400)
        if weight and weight.item_id != item.id:
            return Response({"success": False, "error": "Selected weight is not available for this item."}, status=400)
        if shoe and shoe.item_id != item.id:
            return Response({"success": False, "error": "Selected shoe option is not available for this item."}, status=400)

        if shoe:
            allowed_shoe_sizes = [str(value) for value in (shoe.shoe_size or [])]
            if not selected_shoe_size or str(selected_shoe_size) not in allowed_shoe_sizes:
                return Response({"success": False, "error": "Select a valid shoe size."}, status=400)

        if size_stock:
            available_stock = size_stock.quantity_in_stock
        elif age_variant:
            available_stock = age_variant.quantity_in_stock
        elif variant:
            available_stock = variant.sizes.aggregate(
                total=models.Sum("quantity_in_stock")
            )["total"] or 0
        elif shoe:
            available_stock = item.in_stock or 0
        else:
            available_stock = item.in_stock or 0

        if quantity > available_stock:
            return Response({
                "success": False,
                "error": f"Cannot add {quantity} of '{item.name}'. Only {available_stock} in stock."
            }, status=400)

        selected_length = f"{length.value} {length.unit}" if length else None
        selected_weight = f"{weight.value} {weight.unit}" if weight else None
        sync_key = (
            item.id, variant_id, size_id, age_variant_id,
            selected_length, selected_weight, str(selected_shoe_size) if selected_shoe_size is not None else None
        )
        incoming_keys.add(sync_key)

        order_item = OderItem.objects.filter(
            order=order,
            item=item,
            color_variant=variant,
            size_stock=size_stock,
            age_variant=age_variant,
            selected_length=selected_length,
            selected_weight=selected_weight,
            shoe_size=shoe.shoe_size if shoe else None,
        ).first()

        if order_item:
            order_item.quantity = quantity
            order_item.price_at_purchase = item.get_item_final_price()
            order_item.save(update_fields=["quantity", "price_at_purchase"])
        else:
            order_item = OderItem.objects.create(
                order=order,
                item=item,
                user=user,
                visitor_id=None if user else visitor_id,
                quantity=quantity,
                price_at_purchase=item.get_item_final_price(),
                color_variant=variant,
                size_stock=size_stock,
                age_variant=age_variant,
                selected_length=selected_length,
                selected_weight=selected_weight,
                shoe_size=shoe.shoe_size if shoe else None,
            )

        total_amount += order_item.get_final_price()

    # Remove stale lines without touching other variants of the same product.
    for existing in order.items.all():
        key = (
            existing.item_id,
            existing.color_variant_id,
            existing.size_stock_id,
            existing.age_variant_id,
            existing.selected_length,
            existing.selected_weight,
            existing.shoe_size,
        )
        if key not in incoming_keys:
            existing.delete()

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
        logger.info("Payment not confirmed; customer update skipped.")
        return

    billing = getattr(order, "billing_address", None)
    if not billing:
        logger.warning("Order has no billing address; customer update skipped.")
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
        logger.warning("No vendor found for order customer assignment.")
    
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
            logger.info("Vendor assigned to existing customer.")

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
            logger.info("Customer record updated.")

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
            logger.error("PayPal OAuth request failed.")
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
        logger.info("PayPal webhook signature verification completed.")

        return resp.json().get("verification_status") == "SUCCESS"

    except Exception as e:
        logger.exception("PayPal webhook signature verification failed.")
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

    currency_code = getattr(order, "currency", "USD")

    invoice_number = f"INV-{order.id}-{int(time.time())}"
    invoice_date = datetime.date.today().isoformat()

    # Build items safely
    items = []
    for order_item in order.items.all():
        try:
            items.append({
                "name": getattr(order_item.item, "name", "Item"),
                "quantity": str(order_item.quantity),
                "unit_amount": {
                    "currency_code": currency_code,
                    "value": f"{order_item.get_final_price():.2f}",
                },
            })
        except Exception:
            logger.warning(f"Skipping invalid order item in order {order.id}")

    if not items:
        raise ValueError(f"Order {order.id} has no valid items to invoice")

    payload = {
        "detail": {
            "invoice_number": invoice_number,
            "invoice_date": invoice_date,
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
        "items": items,
    }

    logger.info(f"Creating PayPal invoice for order_id={order.id}, invoice={invoice_number}")

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
        except ValueError:
            logger.error(
                f"PayPal invalid JSON response for order_id={order.id}, "
                f"status={response.status_code}"
            )
            raise

        invoice_id = invoice.get("id")
        if not invoice_id:
            logger.error(
                f"PayPal invoice missing ID for order_id={order.id}, response_keys={list(invoice.keys())}"
            )
            raise ValueError("Failed to create PayPal invoice (missing id)")

        logger.info(f"PayPal invoice created successfully invoice_id={invoice_id}")

        # Step 2: Send invoice email
        send_url = f"{url}/{invoice_id}/send"
        send_response = requests.post(send_url, headers=headers, timeout=30)
        send_response.raise_for_status()

        logger.info(
            f"PayPal invoice sent successfully order_id={order.id}, invoice_id={invoice_id}"
        )

        return invoice

    except requests.exceptions.HTTPError as err:
        response = err.response

        error_detail = None
        try:
            if response is not None:
                error_detail = response.json()
        except Exception:
            error_detail = response.text if response is not None else "No response"

        logger.error(
            f"PayPal HTTP error order_id={order.id}, "
            f"status={getattr(response, 'status_code', None)}, "
            f"error={error_detail}"
        )
        raise

    except Exception as e:
        logger.exception("Unexpected error sending PayPal invoice.")
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
        logger.info("📩 PayPal webhook received")

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
        logger.info("🔔 PayPal event received | event_type=%s", event_type)

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

        logger.info(
            "💳 PayPal payment update | order_id=%s | status=%s | amount=%s %s",
            paypal_order_id,
            status,
            amount,
            currency,
        )

        # Avoid duplicates
        existing_payment = Payment.objects.filter(transaction_id=paypal_order_id).first()
        if existing_payment and existing_payment.status == "completed":
            logger.info(f"⚠️ Payment {paypal_order_id} already processed")
            return Response({"status": "ok", "message": "Already processed"})

        with db_transaction.atomic():
            # Resolve the order first so the payment created during checkout is
            # updated rather than creating a second, orphaned Payment record.
            order = Order.objects.filter(paypal_order_id=paypal_order_id).first()

            payment = order.payment if order and order.payment_id else None
            if payment:
                payment.transaction_id = paypal_order_id
                payment.amount = amount
                payment.payment_method = "PayPal"
                payment.status = "completed" if event_type == "PAYMENT.CAPTURE.COMPLETED" else payment.status
                payment.save(update_fields=["transaction_id", "amount", "payment_method", "status"])
            else:
                payment, _ = Payment.objects.update_or_create(
                    transaction_id=paypal_order_id,
                    defaults={
                        "amount": amount,
                        "payment_method": "PayPal",
                        "status": "completed" if event_type == "PAYMENT.CAPTURE.COMPLETED" else "pending",
                    },
                )

            if order and event_type == "PAYMENT.CAPTURE.COMPLETED" and order.status != "completed":
                order.status = "completed"
                order.save(update_fields=["status"])


                 # Save SoldItem records and update stock
                for order_item in order.items.all():
                    try:
                        sold_item = SoldItem(
                            item=order_item.item,
                            vendor=order_item.item.vendor,
                            color_variant=order_item.color_variant,
                            size_stock=order_item.size_stock,
                            age_variant=order_item.age_variant,
                            quantity=order_item.quantity,
                        )
                        sold_item.save()
                        logger.info(
                            "🛒 SoldItem created | order_id=%s | item=%s | qty=%s",
                            order.id,
                            order_item.item.name,
                            order_item.quantity,
                        )

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
                            logger.info(
                                "📧 Vendor email sent | vendor=%s | item=%s",
                                vendor_user.username,
                                order_item.item.name,
                            )

                    except Exception as e:
                        logger.error(
                            "❌ Order item processing failed | order_id=%s | item=%s",
                            order.id,
                            order_item.item.name,
                        )


                

                # Send PayPal invoice only if not sent already
                try:
                    if not getattr(order, "paypal_invoice_id", None):
                        invoice = send_paypal_invoice(order)
                        logger.info("💳 PayPal invoice created | order_id=%s", order.id)
                        order.paypal_invoice_id = invoice.get('id')  # You must add this field to Order model
                        order.save(update_fields=['paypal_invoice_id'])
                except Exception as e:
                    logger.error("Failed to send PayPal invoice.")

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

                        logger.info(
                            "📧 Customer invoice email sent | order_id=%s",
                            order.id,
                        )
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
           
            # -------------------------------------------------------
            # 💾 Save Transaction(s) for Each Vendor
            # -------------------------------------------------------
            if order:
                vendor_ids = list(order.items.values_list("item__vendor", flat=True).distinct())
                logger.info(f"🧾 Order {order.id} vendor_ids: {vendor_ids}")