import json
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.db import models

from .shipping import _ShippingItemsProxy, _dimensions_for_items, get_rates_for_destination
from .Base import get_usd_to_kes_rate


def validate_checkout_items(items_payload):
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
            available_stock = variant.sizes.aggregate(total=models.Sum("quantity_in_stock"))["total"] or 0
        else:
            available_stock = item.in_stock or 0

        if quantity > available_stock:
            raise ValueError(
                f"Cannot add {quantity} of '{item.name}'. Only {available_stock} in stock."
            )

        selected_length = f"{length.value} {length.unit}" if length else None
        selected_weight = f"{weight.value} {weight.unit}" if weight else None
        # Resolve the effective customer price on the server. Active offers
        # take precedence over a stored discount; otherwise the normal price
        # is used. This single snapshot is then used by both M-Pesa and PayPal.
        price_at_purchase = Decimal(str(item.get_checkout_price())).quantize(Decimal("0.01"))

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


def validate_shipping(shipping_selection, items_payload, billing):
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


from .models import BillingAddress, CheckoutSession, Order, OrderItem, Payment
from ReactSerializers.models import AgeVariant, ColorVariant, Item, Length, Shoe, SizeStock, Weight


def session_owner_matches(checkout_session, request):
    user = request.user if request.user and request.user.is_authenticated else None
    if user:
        return checkout_session.user_id == user.id and checkout_session.visitor_id is None
    visitor_id = request.COOKIES.get("visitorId")
    return bool(visitor_id and checkout_session.user_id is None and checkout_session.visitor_id == visitor_id)


def get_owned_checkout_session(request, session_id, *, for_update=False):
    qs = CheckoutSession.objects
    if for_update:
        qs = qs.select_for_update()
    session = qs.filter(pk=session_id).first()
    if not session or not session_owner_matches(session, request):
        return None
    if session.status in {"completed", "failed", "expired"}:
        return session
    if session.status == "draft" and session.expires_at <= timezone.now():
        session.status = "expired"
        session.save(update_fields=["status", "updated_at"])
        return session
    return session


@transaction.atomic
def materialize_paid_checkout(checkout_session, *, transaction_id=None, provider_amount=None, provider_currency=None):
    """
    Convert a successfully paid checkout session into the permanent business
    records. This is the only path that creates BillingAddress, Payment,
    Order, and OrderItem rows for a checkout.
    """
    session = CheckoutSession.objects.select_for_update().get(pk=checkout_session.pk)

    if session.status == "completed":
        order = session.order
        if order:
            return order, False

    if session.status in {"failed", "expired"}:
        raise ValueError("Checkout session is no longer payable.")

    payload = session.payload or {}
    billing_data = payload["billing"]
    items_payload = payload["items"]
    shipping = payload.get("shipping") or {}

    billing = BillingAddress.objects.create(
        user=session.user,
        visitor_id=None if session.user_id else session.visitor_id,
        first_name=billing_data["first_name"],
        last_name=billing_data["last_name"],
        phone=billing_data["phone"],
        email=billing_data["email"],
        street_address=billing_data["street_address"],
        appartment_address=billing_data.get("appartment_address", ""),
        city=billing_data["city"],
        state=billing_data.get("state", ""),
        country=billing_data["country"],
        zip=billing_data["zip"],
    )

    payment = Payment.objects.create(
        user=session.user,
        visitor_id=None if session.user_id else session.visitor_id,
        payment_method=session.payment_method,
        amount=session.amount,
        status="pending",
        # Payment.merchant_reference is a legacy unique field that remains
        # required by the current database schema. Use the checkout UUID as a
        # stable, provider-independent reference so materialization cannot
        # fail before the payment is marked complete.
        merchant_reference=f"CHECKOUT-{session.id}",
    )

    if provider_amount is not None and hasattr(payment, "provider_amount"):
        payment.provider_amount = Decimal(str(provider_amount))
    if provider_currency and hasattr(payment, "provider_currency"):
        payment.provider_currency = str(provider_currency).upper()
    if transaction_id:
        payment.transaction_id = transaction_id
    payment.save()

    order = Order.objects.create(
        user=session.user,
        visitor_id=None if session.user_id else session.visitor_id,
        status="pending",
        ordered_date=timezone.now(),
        billing_address=billing,
        payment=payment,
        shipping_amount=Decimal(str(shipping.get("amount_kes", "0.00"))),
        shipping_provider=shipping.get("provider"),
        shipping_service=shipping.get("service"),
        shipping_provider_amount=(
            Decimal(str(shipping["price"])) if shipping.get("price") is not None else None
        ),
        shipping_currency=shipping.get("currency"),
        paypal_order_id=session.paypal_order_id,
    )

    total_amount = Decimal("0.00")
    for item_data in items_payload:
        item = Item.objects.get(pk=item_data["id"])
        variant = ColorVariant.objects.filter(pk=item_data.get("variant_id")).first() if item_data.get("variant_id") else None
        size_stock = SizeStock.objects.filter(pk=item_data.get("size_id")).first() if item_data.get("size_id") else None
        age_variant = AgeVariant.objects.filter(pk=item_data.get("age_variant_id")).first() if item_data.get("age_variant_id") else None
        length = Length.objects.filter(pk=item_data.get("length_id")).first() if item_data.get("length_id") else None
        weight = Weight.objects.filter(pk=item_data.get("weight_id")).first() if item_data.get("weight_id") else None
        shoe = Shoe.objects.filter(pk=item_data.get("shoe_id")).first() if item_data.get("shoe_id") else None

        selected_shoe_size = item_data.get("selected_shoe_size")
        selected_length = item_data.get("selected_length")
        selected_weight = item_data.get("selected_weight")
        custom_preferences = item_data.get("custom_preferences") or {}

        order_item = OrderItem.objects.create(
            order=order,
            item=item,
            user=session.user,
            visitor_id=None if session.user_id else session.visitor_id,
            quantity=int(item_data["quantity"]),
            price_at_purchase=Decimal(str(item_data["price_at_purchase"])),
            color_variant=variant,
            size_stock=size_stock,
            age_variant=age_variant,
            selected_length=selected_length,
            selected_weight=selected_weight,
            shoe_size=str(selected_shoe_size) if selected_shoe_size is not None else None,
            custom_preferences=custom_preferences,
        )
        total_amount += order_item.get_final_price()

    expected_total = (total_amount + Decimal(str(shipping.get("amount_kes", "0.00")))).quantize(Decimal("0.01"))
    if expected_total != session.amount:
        raise ValueError("Checkout total changed before payment completion.")

    order.updated_total_price = int(expected_total)
    order.save(update_fields=["updated_total_price"])

    session.order = order
    session.status = "completed"
    session.save(update_fields=["order", "status", "updated_at"])
    return order, True
