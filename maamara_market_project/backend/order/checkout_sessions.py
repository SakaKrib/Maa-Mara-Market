import json
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

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
    if session.expires_at <= timezone.now():
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
        order = Order.objects.filter(paypal_order_id=session.paypal_order_id).select_related("payment").first()
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

    session.status = "completed"
    session.save(update_fields=["status", "updated_at"])
    return order, True
