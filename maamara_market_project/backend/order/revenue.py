"""Single definition of "a paid sale" for admin revenue, charts and stats.

Revenue used to be summed from ``Order.updated_total_price`` for orders whose
status was exactly COMPLETED. Two things made every figure read 0:

* ``updated_total_price`` is only filled by the newer checkout-session flow;
  orders created by other flows keep the default 0.
* COMPLETED is only reached after the customer confirms (or the 3-day window
  elapses), so a paid order that is still being shipped was never counted.

Money is received when the order is paid, so every status in
``Order.PAID_STATUSES`` counts (case-insensitive: legacy rows store lowercase).
Cancelled, returned, refunded and disputed orders are excluded.
"""
from decimal import Decimal

from django.db.models import Case, DecimalField, Value, When
from django.db.models.functions import Cast, Upper

from .models import Order

_MONEY = DecimalField(max_digits=14, decimal_places=2)


def paid_orders(queryset=None):
    """Orders that were paid and are still valid sales (any fulfilment stage)."""
    queryset = Order.objects.all() if queryset is None else queryset
    return (
        queryset.annotate(_status_upper=Upper("status"))
        .filter(_status_upper__in=Order.PAID_STATUSES, ordered_date__isnull=False)
    )


def with_revenue(queryset):
    """Annotate ``revenue_base``: order total, else the confirmed payment amount."""
    return queryset.annotate(
        revenue_base=Case(
            When(updated_total_price__gt=0, then=Cast("updated_total_price", _MONEY)),
            When(payment__amount__gt=0, then=Cast("payment__amount", _MONEY)),
            default=Value(Decimal("0")),
            output_field=_MONEY,
        )
    )


def order_revenue(order):
    """Revenue of one annotated order; falls back to the item total."""
    base = getattr(order, "revenue_base", None)
    if base:
        return float(base)
    try:
        return float(order.get_total() or 0)
    except Exception:
        return 0.0


def order_profit(order):
    """Platform profit on one order: what customers paid for the items minus
    what the vendors are owed for them (the marketplace markup). Shipping is
    not profit and is left out."""
    profit = Decimal("0")
    for line in order.order_items.all():
        try:
            customer = Decimal(str(line.get_final_price()))
            vendor = Decimal(str(line.get_final_price_for_vendor()))
        except Exception:
            continue
        profit += customer - vendor
    return float(profit)


def with_profit_prefetch(queryset):
    return queryset.prefetch_related("order_items__item")
