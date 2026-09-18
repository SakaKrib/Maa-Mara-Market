import logging
import uuid
from decimal import Decimal

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ReactSerializers.models import AgeVariant, ColorVariant, Item, Length, Shoe, SizeStock, Weight
from core.models import ActivityLog, Notification
from vendorDashboard.models import SoldItem, Vendor

from .Payment import capture_paypal_order, create_paypal_order
from .capture_order import get_paypal_access_token
from .models import BillingAddress, Card, Customer, Order, Payment, Transaction
from .paymentserializer import CheckoutSerializer, OrderResponseSerializer
from .views import IsAuthenticatedOrVisitor

logger = logging.getLogger(__name__)

@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def paypal_create_order(request):
    amount = request.data.get("amount", "10.00")
    paypal_order = create_paypal_order(amount)

    # Bind the provider order ID to the customer's pending order immediately.
    # This lets a webhook resolve the correct local order even if it arrives
    # before the capture endpoint is called.
    if request.user and request.user.is_authenticated:
        pending_order = Order.objects.filter(
            user=request.user,
            status="pending",
        ).order_by("-id").first()
    else:
        visitor_id = request.COOKIES.get("visitorId")
        pending_order = (
            Order.objects.filter(visitor_id=visitor_id, status="pending")
            .order_by("-id")
            .first()
            if visitor_id
            else None
        )

    paypal_id = paypal_order.get("id")
    if pending_order and paypal_id:
        pending_order.paypal_order_id = paypal_id
        pending_order.save(update_fields=["paypal_order_id"])

    return Response(paypal_order)

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