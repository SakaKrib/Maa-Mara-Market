import json
import logging
from decimal import Decimal

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _frontend_url():
    return str(getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")


def _format_value(value):
    if value is None or value == "":
        return ""
    if isinstance(value, (dict, list)):
        try:
            return json.dumps(value, ensure_ascii=False)
        except (TypeError, ValueError):
            return str(value)
    return str(value)


def _variant_text(order_item):
    parts = []
    if order_item.color_variant_id:
        parts.append(f"Color: {order_item.color_variant.color}")
    if order_item.size_stock_id:
        parts.append(f"Size: {_format_value(order_item.size_stock.size)}")
    if order_item.age_variant_id:
        parts.append(f"Age: {order_item.age_variant.age_group}")
    if order_item.selected_length:
        parts.append(f"Length: {order_item.selected_length}")
    if order_item.selected_weight:
        parts.append(f"Weight: {order_item.selected_weight}")
    if order_item.shoe_size:
        parts.append(f"Shoe size: {order_item.shoe_size}")
    for key, value in (order_item.custom_preferences or {}).items():
        parts.append(f"{key}: {_format_value(value)}")
    return " • ".join(parts)


def _item_payload(order_item):
    unit_price = Decimal(str(order_item.price_at_purchase or order_item.item.get_current_price() or "0.00"))
    quantity = int(order_item.quantity or 0)
    regular_price = Decimal(str(getattr(order_item.item, "price", unit_price) or unit_price))
    has_discount = regular_price > unit_price

    return {
        "id": order_item.item_id,
        "name": order_item.item.name,
        "quantity": quantity,
        "variants": _variant_text(order_item),
        "unit_price": unit_price,
        "regular_price": regular_price,
        "has_discount": has_discount,
        "line_total": (unit_price * quantity).quantize(Decimal("0.01")),
    }


def _billing_data(order):
    billing = order.billing_address
    return {
        "name": " ".join(
            part for part in [getattr(billing, "first_name", ""), getattr(billing, "last_name", "")]
            if part
        ).strip(),
        "phone": getattr(billing, "phone", "") or "",
        "email": getattr(billing, "email", "") or "",
        "street": getattr(billing, "street_address", "") or "",
        "apartment": getattr(billing, "appartment_address", "") or "",
        "city": getattr(billing, "city", "") or "",
        "state": getattr(billing, "state", "") or "",
        "country": getattr(billing, "country", "") or "",
        "zip": getattr(billing, "zip", "") or "",
    }


def _shipping_address_text(billing):
    parts = [billing["street"], billing["apartment"], billing["city"], billing["state"], billing["zip"], billing["country"]]
    return ", ".join(str(part) for part in parts if part)


def _send(template, subject, context, recipients):
    recipients = [email for email in recipients if email]
    if not recipients:
        return

    html_content = render_to_string(template, context)
    text_content = strip_tags(html_content)
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )
    message.attach_alternative(html_content, "text/html")
    message.send()


def send_paid_order_emails(order_id):
    """
    Send the customer confirmation and one vendor fulfillment email per vendor.
    This function is called only after the paid-order transaction commits.
    """
    try:
        from order.models import Order
        order = (
            Order.objects
            .select_related("billing_address", "payment", "user")
            .prefetch_related(
                "order_items__item__vendor__user",
                "order_items__color_variant",
                "order_items__size_stock",
                "order_items__age_variant",
            )
            .get(pk=order_id)
        )
    except Exception:
        logger.exception("Unable to load order %s for paid-order email.", order_id)
        return

    frontend = _frontend_url()
    billing = _billing_data(order)
    order_items = list(order.order_items.all())
    items = [_item_payload(order_item) for order_item in order_items]
    payment_method = getattr(order.payment, "payment_method", "") or ""
    transaction_id = getattr(order.payment, "transaction_id", "") or "—"
    shipping_amount = Decimal(str(getattr(order, "shipping_amount", 0) or 0))
    order_total = Decimal(str(getattr(order, "updated_total_price", 0) or 0))

    customer_email = billing["email"]
    if not customer_email and order.user_id:
        customer_email = getattr(order.user, "email", "") or ""
    customer_name = billing["name"] or (
        getattr(order.user, "get_full_name", lambda: "")() if order.user_id else "Customer"
    ) or "Customer"

    customer_context = {
        "frontend_url": frontend,
        "current_year": timezone.now().year,
        "customer_name": customer_name,
        "order_id": order.id,
        "order_date": order.ordered_date or order.created_at,
        "payment_method": payment_method,
        "items": items,
        "shipping_amount": shipping_amount,
        "order_total": order_total,
        "transaction_id": transaction_id,
        "track_order_url": f"{frontend}/customer-order",
    }

    try:
        _send(
            "emails/customer_order_confirmation.html",
            f"🎉 Order #{order.id} confirmed — Thank you for shopping with Maamara Market",
            customer_context,
            [customer_email],
        )
    except Exception:
        logger.exception("Customer order confirmation email failed for order %s.", order.id)

    vendor_items = {}
    for order_item in order_items:
        vendor = getattr(order_item.item, "vendor", None)
        if vendor and getattr(vendor, "user_id", None):
            vendor_items.setdefault(vendor.id, {"vendor": vendor, "items": []})["items"].append(
                _item_payload(order_item)
            )

    for group in vendor_items.values():
        vendor = group["vendor"]
        vendor_email = getattr(getattr(vendor, "user", None), "email", "") or ""
        if not vendor_email:
            continue

        vendor_context = {
            "frontend_url": frontend,
            "current_year": timezone.now().year,
            "order_id": order.id,
            "order_date": order.ordered_date or order.created_at,
            "payment_method": payment_method,
            "shipping_provider": getattr(order, "shipping_provider", None),
            "shipping_service": getattr(order, "shipping_service", None),
            "vendor_total": sum((entry["line_total"] for entry in group["items"]), Decimal("0.00")),
            "items": group["items"],
            "customer_name": customer_name,
            "customer_phone": billing["phone"],
            "shipping_address": _shipping_address_text(billing),
            "shipping_city": billing["city"],
            "shipping_country": billing["country"],
            "shipping_zip": billing["zip"],
            "vendor_orders_url": f"{frontend}/vendors-dashboard/orders",
        }

        try:
            _send(
                "emails/vendor_order_confirmation_v2.html",
                f"📦 Paid Order #{order.id} — Prepare Items for Dispatch",
                vendor_context,
                [vendor_email],
            )
        except Exception:
            logger.exception(
                "Vendor order email failed for order %s and vendor %s.",
                order.id,
                vendor.id,
            )
