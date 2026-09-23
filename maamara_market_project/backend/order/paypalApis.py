import json
import uuid
from decimal import Decimal

from django.db import models, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ReactSerializers.models import AgeVariant, ColorVariant, Item, Length, Shoe, SizeStock, Weight
from .Base import get_usd_to_kes_rate
from .Payment import create_paypal_order
from .checkout_sessions import session_owner_matches
from .models import CheckoutSession
from .paymentserializer import CheckoutSerializer
from .shipping import _ShippingItemsProxy, _dimensions_for_items, get_rates_for_destination
from .views import IsAuthenticatedOrVisitor


def _validate_and_snapshot_items(items_payload):
    if not items_payload:
        raise ValueError("Your cart is empty.")

    snapshots = []
    subtotal = Decimal("0.00")

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
        custom_preferences = item_data.get("custom_preferences") or {}

        if not item_id or quantity < 1:
            raise ValueError("Each checkout item must include a valid id and quantity.")
        if not isinstance(custom_preferences, dict):
            raise ValueError("Custom preferences must be an object.")

        item = Item.objects.filter(pk=item_id).first()
        if not item:
            raise ValueError("Product not found.")

        variant = ColorVariant.objects.filter(pk=variant_id).first() if variant_id else None
        size_stock = SizeStock.objects.filter(pk=size_id).first() if size_id else None
        age_variant = AgeVariant.objects.filter(pk=age_variant_id).first() if age_variant_id else None
        length = Length.objects.filter(pk=length_id).first() if length_id else None
        weight = Weight.objects.filter(pk=weight_id).first() if weight_id else None
        shoe = Shoe.objects.filter(pk=shoe_id).first() if shoe_id else None

        if variant_id and not variant:
            raise ValueError("Selected color was not found.")
        if size_id and not size_stock:
            raise ValueError("Selected size was not found.")
        if age_variant_id and not age_variant:
            raise ValueError("Selected age option was not found.")
        if length_id and not length:
            raise ValueError("Selected length was not found.")
        if weight_id and not weight:
            raise ValueError("Selected weight was not found.")
        if shoe_id and not shoe:
            raise ValueError("Selected shoe option was not found.")

        if variant and variant.item_id != item.id:
            raise ValueError("Selected color is not available for this item.")

        if size_stock:
            if size_stock.variant_id:
                if not variant or size_stock.variant_id != variant.id:
                    raise ValueError("Selected size does not match the selected color.")
            elif size_stock.item_id != item.id:
                raise ValueError("Selected size is not available for this item.")

        for selected, name in (
            (age_variant, "age group"),
            (length, "length"),
            (weight, "weight"),
            (shoe, "shoe option"),
        ):
            if selected and selected.item_id != item.id:
                raise ValueError(f"Selected {name} is not available for this item.")

        if shoe:
            allowed_shoe_sizes = {str(value) for value in (shoe.shoe_size or [])}
            if not selected_shoe_size or str(selected_shoe_size) not in allowed_shoe_sizes:
                raise ValueError("Select a valid shoe size.")

        if size_stock:
            available_stock = size_stock.quantity_in_stock or 0
        elif age_variant:
            available_stock = age_variant.quantity_in_stock or 0
        elif variant:
            available_stock = (
                variant.sizes.aggregate(total=models.Sum("quantity_in_stock"))["total"] or 0
            )
        else:
            available_stock = item.in_stock or 0

        if quantity > available_stock:
            raise ValueError(
                f"Cannot add {quantity} of '{item.name}'. Only {available_stock} in stock."
            )

        selected_length = f"{length.value} {length.unit}" if length else None
        selected_weight = f"{weight.value} {weight.unit}" if weight else None
        price_at_purchase = Decimal(str(item.get_item_final_price()))

        snapshots.append({
            "id": item.id,
            "quantity": quantity,
            "variant_id": variant.id if variant else None,
            "size_id": size_stock.id if size_stock else None,
            "age_variant_id": age_variant.id if age_variant else None,
            "length_id": length.id if length else None,
            "weight_id": weight.id if weight else None,
            "shoe_id": shoe.id if shoe else None,
            "selected_shoe_size": str(selected_shoe_size) if selected_shoe_size is not None else None,
            "selected_length": selected_length,
            "selected_weight": selected_weight,
            "custom_preferences": custom_preferences,
            "price_at_purchase": str(price_at_purchase),
        })
        subtotal += price_at_purchase * quantity

    return snapshots, subtotal


def _validate_shipping(shipping_selection, items_payload, billing):
    if not shipping_selection:
        return {
            "amount_kes": "0.00",
            "provider": None,
            "service": None,
            "price": None,
            "currency": None,
        }

    dimensions = _dimensions_for_items(items_payload)
    proxy = _ShippingItemsProxy(dimensions)
    destination = {
        "postalCode": str(billing["zip"]).strip(),
        "cityName": str(billing["city"]).strip(),
        "countryCode": str(billing["country"]).strip().upper(),
    }

    rates, _ = get_rates_for_destination(proxy, destination)
    selected_provider = str(shipping_selection["provider"]).strip()
    selected_service = str(shipping_selection["service"]).strip()
    selected_currency = str(shipping_selection["currency"]).strip().upper()
    selected_price = Decimal(str(shipping_selection["price"]))

    matching_rate = next(
        (
            rate for rate in rates
            if str(rate.get("provider", "")).strip().lower() == selected_provider.lower()
            and str(rate.get("service", "")).strip().lower() == selected_service.lower()
            and str(rate.get("currency", "")).strip().upper() == selected_currency
            and Decimal(str(rate.get("price", "0.00"))) == selected_price
        ),
        None,
    )
    if not matching_rate:
        raise ValueError("The selected shipping rate has changed. Please request a new quote.")

    if selected_price < 0:
        raise ValueError("Shipping price cannot be negative.")

    if selected_currency == "KES":
        shipping_kes = selected_price
    elif selected_currency == "USD":
        rate = Decimal(str(get_usd_to_kes_rate()))
        if rate <= 0:
            raise ValueError("Invalid USD/KES exchange rate.")
        shipping_kes = (selected_price * rate).quantize(Decimal("0.01"))
    else:
        raise ValueError(f"Unsupported shipping currency: {selected_currency}")

    return {
        "amount_kes": str(shipping_kes),
        "provider": selected_provider,
        "service": selected_service,
        "price": str(selected_price),
        "currency": selected_currency,
    }


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
@transaction.atomic
def checkout_view(request):
    """
    Validate checkout data and create only a short-lived CheckoutSession.

    BillingAddress, Payment, Order, and OrderItem records are deliberately not
    created here. They are materialized only after PayPal or M-Pesa confirms
    successful payment.
    """
    serializer = CheckoutSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user = request.user if request.user and request.user.is_authenticated else None
    visitor_id = request.COOKIES.get("visitorId") if not user else None

    if not user and not visitor_id:
        return Response(
            {"success": False, "error": "Checkout identity is required."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    billing = {
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

    try:
        item_snapshots, subtotal = _validate_and_snapshot_items(data.get("items", []))
        shipping = _validate_shipping(data.get("shipping"), data.get("items", []), billing)
        grand_total = (subtotal + Decimal(shipping["amount_kes"])).quantize(Decimal("0.01"))

        if grand_total <= 0:
            raise ValueError("Order amount must be greater than zero.")

        payment_method = data["payment_method"]
        CheckoutSession.objects.filter(
            user=user,
            visitor_id=None if user else visitor_id,
            status="draft",
        ).delete()

        checkout_session = CheckoutSession.objects.create(
            user=user,
            visitor_id=visitor_id,
            payload={
                "billing": billing,
                "items": item_snapshots,
                "shipping": shipping,
            },
            payment_method=payment_method,
            amount=grand_total,
            currency="KES",
            expires_at=timezone.now() + timezone.timedelta(minutes=30),
            status="draft",
        )

        response_data = {
            "checkout_id": str(checkout_session.id),
            "payment": {
                "payment_method": payment_method,
                "amount": str(grand_total),
                "provider_amount": None,
                "provider_currency": None,
            },
        }

        if payment_method == "PayPal":
            usd_to_kes_rate = Decimal(str(get_usd_to_kes_rate()))
            if usd_to_kes_rate <= 0:
                raise ValueError("Invalid USD/KES exchange rate.")

            provider_amount = (grand_total / usd_to_kes_rate).quantize(Decimal("0.01"))
            if provider_amount <= 0:
                raise ValueError("PayPal amount must be greater than zero.")

            paypal_data = create_paypal_order(
                provider_amount,
                "USD",
                reference_id=str(checkout_session.id),
            )
            paypal_order_id = paypal_data.get("id")
            if not paypal_order_id:
                raise ValueError("PayPal did not return an order ID.")

            checkout_session.paypal_order_id = paypal_order_id
            checkout_session.status = "payment_pending"
            checkout_session.save(update_fields=["paypal_order_id", "status", "updated_at"])

            response_data["paypal_order_id"] = paypal_order_id
            response_data["payment"]["provider_amount"] = str(provider_amount)
            response_data["payment"]["provider_currency"] = "USD"
        else:
            checkout_session.status = "payment_pending"
            checkout_session.save(update_fields=["status", "updated_at"])

        return Response(response_data, status=status.HTTP_201_CREATED)

    except (ValueError, TypeError, ArithmeticError):
        raise




# ==============================
# 🔹rest api get customers
# ==============================


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
    invoice_date = timezone.now().date().isoformat()

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
    """Process verified PayPal events without guessing the local order."""
    try:
        raw_body = request.body
        try:
            data = json.loads(raw_body)
        except json.JSONDecodeError:
            return Response({"status": "error", "message": "Invalid JSON"}, status=400)

        if not verify_paypal_signature(raw_body, request):
            return Response({"status": "error", "message": "Invalid signature"}, status=400)

        event_type = (data.get("event_type") or "").upper()
        resource = data.get("resource") or {}
        relevant_events = {
            "PAYMENT.CAPTURE.COMPLETED",
            "CHECKOUT.ORDER.COMPLETED",
            "PAYMENT.CAPTURE.DENIED",
            "PAYMENT.CAPTURE.REFUNDED",
            "PAYMENT.CAPTURE.REVERSED",
            "PAYMENT.CAPTURE.DECLINED",
        }
        if event_type not in relevant_events:
            return Response({"status": "ignored"})

        if event_type == "PAYMENT.CAPTURE.REFUNDED":
            refund = reconcile_paypal_refund(
                provider_reference=resource.get("id"),
                provider_status=resource.get("status"),
                provider_amount=resource.get("amount", {}).get("value"),
                provider_currency=resource.get("amount", {}).get("currency_code"),
            )
            if refund:
                return Response({"status": "ok", "message": "Refund reconciled"})
            return Response({"status": "ok", "message": "Unknown refund reference"})

        paypal_order_id = (
            resource.get("supplementary_data", {})
            .get("related_ids", {})
            .get("order_id")
        )
        if not paypal_order_id:
            return Response({"status": "ok", "message": "Missing PayPal order reference"})

        order = Order.objects.filter(
            paypal_order_id=paypal_order_id
        ).select_related("payment").first()
        if not order or not order.payment:
            logger.warning("PayPal webhook references unknown local order: %s", paypal_order_id)
            return Response({"status": "ok", "message": "Unknown order"})

        payment = order.payment
        amount = resource.get("amount", {}).get("value")
        currency = resource.get("amount", {}).get("currency_code", "USD")
        provider_status = (resource.get("status") or event_type).lower()
        transaction_id = resource.get("id") or paypal_order_id

        if event_type == "PAYMENT.CAPTURE.COMPLETED":
            expected_provider_amount = payment.provider_amount
            if (
                amount is None
                or expected_provider_amount is None
                or Decimal(str(amount)) != Decimal(str(expected_provider_amount))
                or currency.upper() != (payment.provider_currency or "USD").upper()
            ):
                logger.error(
                    "PayPal amount mismatch for order %s: provider=%s expected=%s",
                    order.id,
                    amount,
                    payment.amount,
                )
                return Response({"status": "ok", "message": "Amount mismatch"})

            from .order_completion import complete_paid_order
            locked_order, completed = complete_paid_order(
                order,
                payment,
                # Refunds must target the PayPal capture, not the checkout-order id.
                transaction_id=transaction_id,
            )

            vendor_ids = list(
                locked_order.items.values_list(
                    "item__vendor", flat=True
                ).distinct()
            )
            for vendor_id in vendor_ids:
                Transaction.objects.update_or_create(
                    payment=locked_order.payment,
                    paypal_transaction_id=transaction_id,
                    vendor_id=vendor_id,
                    defaults={
                        "transaction_type": "PayPal",
                        "payment_method": "paypal",
                        "order": locked_order,
                        "payment": locked_order.payment,
                        "amount": Decimal(str(amount)),
                        "status": "completed",
                        "payer_email": resource.get("payer", {}).get("email_address"),
                        "raw_data": data,
                    },
                )

            if not vendor_ids:
                Transaction.objects.update_or_create(
                    payment=locked_order.payment,
                    paypal_transaction_id=transaction_id,
                    vendor=None,
                    defaults={
                        "transaction_type": "PayPal",
                        "payment_method": "paypal",
                        "amount": Decimal(str(amount)),
                        "status": "completed",
                        "payer_email": resource.get("payer", {}).get("email_address"),
                        "raw_data": data,
                        "payment": locked_order.payment,
                    },
                )

            if completed:
                ActivityLog.objects.create(
                    user=locked_order.user,
                    actor_type="user" if locked_order.user else "guest",
                    action="paypal_payment",
                    description=f"PayPal order {paypal_order_id} completed.",
                    related_url=f"/orders/{locked_order.id}/",
                )
                if locked_order.user:
                    Notification.objects.create(
                        user=locked_order.user,
                        title="PayPal Payment Successful",
                        message=f"Your order #{locked_order.id} has been successfully paid.",
                        url=f"/orders/{locked_order.id}/",
                    )

            return Response({"status": "ok", "message": "Payment processed"})

        # Non-success events are recorded but never complete an order.
        Transaction.objects.update_or_create(
            payment=payment,
            paypal_transaction_id=transaction_id,
            vendor=None,
            defaults={
                "transaction_type": "PayPal",
                "payment_method": "paypal",
                "amount": Decimal(str(amount or "0.00")),
                "status": provider_status,
                "payer_email": resource.get("payer", {}).get("email_address"),
                "raw_data": data,
                "payment": payment,
            },
        )
        return Response({"status": "ok", "message": "Event recorded"})

    except Exception:
        logger.exception("PayPal webhook processing error")
        return Response({"status": "error", "message": "Webhook processing failed."}, status=500)

