import json
from decimal import Decimal
from datetime import timedelta

from django.db import models, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ReactSerializers.models import AgeVariant, ColorVariant, Item, Length, Shoe, SizeStock, Weight
from .Base import get_usd_to_kes_rate
from .Payment import create_paypal_order
from .checkout_sessions import get_owned_checkout_session, session_owner_matches
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
            checkout_session.save(update_fields=["paypal_order_id", "status", "updated_at"])

            response_data["paypal_order_id"] = paypal_order_id
            response_data["payment"]["provider_amount"] = str(provider_amount)
            response_data["payment"]["provider_currency"] = "USD"
        else:
            checkout_session.status = "payment_pending"
            checkout_session.save(update_fields=["status", "updated_at"])

        return Response(response_data, status=status.HTTP_201_CREATED)

    except (ValueError, TypeError, ArithmeticError) as exc:
        return Response({"success": False, "error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)




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