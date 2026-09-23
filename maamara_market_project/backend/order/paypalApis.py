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
from django.template.loader import render_to_string
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ReactSerializers.models import AgeVariant, ColorVariant, Item, Length, Shoe, SizeStock, Weight
from core.models import ActivityLog, Notification
from vendorDashboard.models import SoldItem, Vendor

from .capture_order import get_paypal_access_token
from .shipping import get_rates_for_destination
from .Payment import create_paypal_order
from .services.refunds import reconcile_paypal_refund
from .Base import get_usd_to_kes_rate
from .models import BillingAddress, CheckoutSession, Customer, Order, Payment, Transaction
from .paymentserializer import CheckoutSerializer, OrderResponseSerializer
from .checkout_sessions import get_owned_checkout_session, materialize_paid_checkout
from .views import IsAuthenticatedOrVisitor


logger = logging.getLogger(__name__)


def verify_paypal_signature(raw_body, request):
    """Verify a PayPal webhook through PayPal's verification endpoint."""
    webhook_id = getattr(settings, "PAYPAL_WEBHOOK_ID", "")
    if not webhook_id:
        logger.error("PayPal webhook verification is not configured.")
        return False

    header = request.headers.get
    transmission_id = header("PAYPAL-TRANSMISSION-ID")
    transmission_time = header("PAYPAL-TRANSMISSION-TIME")
    transmission_sig = header("PAYPAL-TRANSMISSION-SIG")
    cert_url = header("PAYPAL-CERT-URL")
    auth_algo = header("PAYPAL-AUTH-ALGO")

    if not all((transmission_id, transmission_time, transmission_sig, cert_url, auth_algo)):
        logger.warning("PayPal webhook is missing signature headers.")
        return False

    try:
        event = json.loads(raw_body)
    except (TypeError, ValueError):
        return False

    verify_payload = {
        "auth_algo": auth_algo,
        "cert_url": cert_url,
        "transmission_id": transmission_id,
        "transmission_sig": transmission_sig,
        "transmission_time": transmission_time,
        "webhook_id": webhook_id,
        "webhook_event": event,
    }

    paypal = settings.PAYMENT_GATEWAYS["paypal"]
    token = get_paypal_access_token()
    response = requests.post(
        f"{paypal['base_url'].rstrip('/')}/v1/notifications/verify-webhook-signature",
        json=verify_payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        timeout=10,
    )
    if response.status_code != 200:
        logger.warning(
            "PayPal webhook verification failed with HTTP %s.",
            response.status_code,
        )
        return False

    try:
        return response.json().get("verification_status") == "SUCCESS"
    except ValueError:
        return False



# CREATE PAYMENT ORDER AND BILLING ADDRESS


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
            expires_at=timezone.now() + timedelta(minutes=30),
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
            checkout_session.payload["paypal"] = {
                "provider_amount": str(provider_amount),
                "provider_currency": "USD",
            }
            checkout_session.status = "payment_pending"
            checkout_session.save(update_fields=["paypal_order_id", "payload", "status", "updated_at"])

            response_data["paypal_order_id"] = paypal_order_id
            response_data["payment"]["provider_amount"] = str(provider_amount)
            response_data["payment"]["provider_currency"] = "USD"
        else:
            checkout_session.status = "payment_pending"
            checkout_session.save(update_fields=["status", "updated_at"])

        return Response(response_data, status=status.HTTP_201_CREATED)

    except (ValueError, TypeError, ArithmeticError) as exc:
        return Response(
            {"success": False, "error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def checkout_status(request, checkout_id):
    """Return the status of a short-lived checkout session."""
    try:
        checkout_session = get_owned_checkout_session(request, checkout_id)
    except (ValueError, TypeError):
        checkout_session = None

    if not checkout_session:
        return Response({"error": "Checkout session not found"}, status=404)

    return Response({
        "checkout_id": str(checkout_session.id),
        "status": checkout_session.status,
        "order_id": checkout_session.order_id,
        "amount": str(checkout_session.amount),
        "payment_method": checkout_session.payment_method,
    })


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
    """Verify PayPal events and finalize only confirmed captures."""
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

        if event_type == "PAYMENT.CAPTURE.REFUNDED":
            refund = reconcile_paypal_refund(
                provider_reference=resource.get("id"),
                provider_status=resource.get("status"),
                provider_amount=resource.get("amount", {}).get("value"),
                provider_currency=resource.get("amount", {}).get("currency_code"),
            )
            return Response({
                "status": "ok",
                "message": "Refund reconciled" if refund else "Unknown refund reference",
            })

        if event_type == "CHECKOUT.ORDER.COMPLETED":
            return Response({"status": "ok", "message": "Buyer approval recorded"})

        if event_type not in {
            "PAYMENT.CAPTURE.COMPLETED",
            "PAYMENT.CAPTURE.DENIED",
            "PAYMENT.CAPTURE.REVERSED",
            "PAYMENT.CAPTURE.DECLINED",
        }:
            return Response({"status": "ignored"})

        paypal_order_id = (
            resource.get("supplementary_data", {})
            .get("related_ids", {})
            .get("order_id")
        )
        if not paypal_order_id:
            return Response({"status": "ok", "message": "Missing PayPal order reference"})

        checkout_session = CheckoutSession.objects.filter(
            paypal_order_id=paypal_order_id
        ).first()

        if not checkout_session:
            # A webhook can arrive after the browser has already finalized the
            # order. In that case the permanent order is the authoritative record.
            order = Order.objects.filter(paypal_order_id=paypal_order_id).select_related("payment").first()
            if not order:
                return Response({"status": "ok", "message": "Unknown order"})
            return Response({"status": "ok", "message": "Order already reconciled"})

        if event_type != "PAYMENT.CAPTURE.COMPLETED":
            checkout_session.status = "failed"
            checkout_session.save(update_fields=["status", "updated_at"])
            return Response({"status": "ok", "message": "Payment failure recorded"})

        amount = resource.get("amount", {}).get("value")
        currency = str(resource.get("amount", {}).get("currency_code", "USD")).upper()
        expected_amount = checkout_session.payload.get("paypal", {}).get("provider_amount")
        transaction_id = resource.get("id") or paypal_order_id

        if (
            amount is None
            or expected_amount is None
            or Decimal(str(amount)) != Decimal(str(expected_amount))
            or currency != "USD"
        ):
            return Response({"status": "ok", "message": "Amount mismatch"})

        with transaction.atomic():
            order, _created = materialize_paid_checkout(
                checkout_session,
                transaction_id=transaction_id,
                provider_amount=Decimal(str(amount)),
                provider_currency=currency,
            )

            from .order_completion import complete_paid_order
            locked_order, _completed = complete_paid_order(
                order,
                order.payment,
                transaction_id=transaction_id,
            )

            Transaction.objects.update_or_create(
                payment=locked_order.payment,
                paypal_transaction_id=transaction_id,
                defaults={
                    "transaction_type": "PayPal",
                    "payment_method": "paypal",
                    "order": locked_order,
                    "amount": Decimal(str(amount)),
                    "status": "completed",
                    "payer_email": resource.get("payer", {}).get("email_address"),
                    "raw_data": data,
                },
            )

        return Response({"status": "ok", "message": "Payment processed"})

    except Exception:
        logger.exception("PayPal webhook processing error")
        return Response(
            {"status": "error", "message": "Webhook processing failed."},
            status=500,
        )
