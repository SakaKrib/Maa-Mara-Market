from decimal import Decimal

from django.db import transaction

from vendorDashboard.models import SoldItem


def _deduct_stock(order_item):
    """Lock and deduct the exact stock represented by an order line."""
    if order_item.size_stock_id:
        stock = order_item.size_stock.__class__.objects.select_for_update().get(
            pk=order_item.size_stock_id
        )
        available = stock.quantity_in_stock or 0
        if order_item.quantity > available:
            raise ValueError(
                f"Insufficient stock for {order_item.item.name}: "
                f"{available} remaining."
            )
        stock.quantity_in_stock = available - order_item.quantity
        stock.save(update_fields=["quantity_in_stock"])
        return

    if order_item.age_variant_id:
        age = order_item.age_variant.__class__.objects.select_for_update().get(
            pk=order_item.age_variant_id
        )
        available = age.quantity_in_stock or 0
        if order_item.quantity > available:
            raise ValueError(
                f"Insufficient age-variant stock for {order_item.item.name}: "
                f"{available} remaining."
            )
        age.quantity_in_stock = available - order_item.quantity
        age.save(update_fields=["quantity_in_stock"])
        return

    if order_item.color_variant_id:
        variant = order_item.color_variant.__class__.objects.select_for_update().get(
            pk=order_item.color_variant_id
        )
        sizes = list(variant.sizes.select_for_update().order_by("id"))
        available = sum((size.quantity_in_stock or 0) for size in sizes)
        if order_item.quantity > available:
            raise ValueError(
                f"Insufficient variant stock for {order_item.item.name}: "
                f"{available} remaining."
            )

        remaining = order_item.quantity
        for size in sizes:
            if remaining <= 0:
                break
            deduction = min(size.quantity_in_stock or 0, remaining)
            if deduction:
                size.quantity_in_stock -= deduction
                size.save(update_fields=["quantity_in_stock"])
                remaining -= deduction
        return

    item = order_item.item.__class__.objects.select_for_update().get(
        pk=order_item.item_id
    )
    available = item.in_stock or 0
    if order_item.quantity > available:
        raise ValueError(
            f"Insufficient stock for {item.name}: {available} remaining."
        )
    item.in_stock = available - order_item.quantity
    item.save(update_fields=["in_stock"])


@transaction.atomic
def complete_paid_order(order, payment, *, transaction_id=None):
    """
    Atomically finalize a paid order.

    The order row is locked so duplicate provider callbacks cannot create
    duplicate sales or deduct stock twice. All stock changes and SoldItem
    rows are committed together with the payment/order state.
    """
    locked_order = order.__class__.objects.select_for_update().get(pk=order.pk)
    locked_payment = payment.__class__.objects.select_for_update().get(pk=payment.pk)

    if locked_order.status == "completed" and locked_payment.status == "completed":
        return locked_order, False

    if locked_payment.status != "completed":
        locked_payment.status = "completed"
        if transaction_id:
            locked_payment.transaction_id = transaction_id
        locked_payment.save(
            update_fields=[
                "status",
                *(["transaction_id"] if transaction_id else []),
            ]
        )

    order_items = list(
        locked_order.order_items.select_related(
            "item",
            "item__vendor",
            "color_variant",
            "size_stock",
            "age_variant",
        )
    )

    # Validate/deduct stock and create sale records in the same transaction.
    for order_item in order_items:
        _deduct_stock(order_item)

        sold_item = SoldItem(
            item=order_item.item,
            vendor=order_item.item.vendor,
            color_variant=order_item.color_variant,
            size_stock=order_item.size_stock,
            age_variant=order_item.age_variant,
            quantity=order_item.quantity,
            sale_price=(
                order_item.price_at_purchase
                if order_item.price_at_purchase is not None
                else order_item.item.get_current_price()
            ),
        )
        # SoldItem.save historically deducts stock itself. Tell it that this
        # service already performed the locked deduction.
        sold_item._stock_already_deducted = True
        sold_item.save()

    locked_order.status = "completed"
    locked_order.payment = locked_payment
    locked_order.save(update_fields=["status", "payment"])

    return locked_order, True
