"""Admin monthly accounting: revenue, shop profit and what vendors are owed.

Uses the same definitions as the dashboard chart (order/revenue.py):
* revenue  = what customers paid for paid orders placed in the month
* profit   = revenue - shipping - vendor_share (the markup)
* owed     = sum of vendors' own prices for those orders
* settled  = part of that already sent to vendors in a paid payout
* outstanding = owed - settled, i.e. still to be paid for that month.
"""
import re
from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from vendorDashboard.models import VendorPayout

from .models import MonthlyReconciliation
from .revenue import order_revenue, paid_orders, with_profit_prefetch, with_revenue

MONTH_RE = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")
TWO = Decimal("0.01")


def _money(value):
    return Decimal(str(value)).quantize(TWO)


def _line_vendor_price(line):
    try:
        return Decimal(str(line.get_final_price_for_vendor()))
    except Exception:
        price = getattr(line.item, "discount_price", None) or getattr(line.item, "price", 0) or 0
        return Decimal(str(price)) * line.quantity


def month_figures(year, month):
    """Everything for one calendar month (server time zone)."""
    orders = with_profit_prefetch(with_revenue(paid_orders())).filter(
        ordered_date__year=year, ordered_date__month=month
    ).select_related("payment")
    orders = orders.prefetch_related("order_items__item__vendor")

    settled_item_ids = set(
        VendorPayout.objects.filter(paid=True, order_items__order__in=orders.values("pk"))
        .values_list("order_items__pk", flat=True)
    )

    revenue = shipping = vendor_share = Decimal("0")
    vendors = defaultdict(lambda: {"owed": Decimal("0"), "settled": Decimal("0"), "items": 0})
    count = 0
    for order in orders:
        count += 1
        revenue += _money(order_revenue(order))
        shipping += _money(getattr(order, "shipping_amount", 0) or 0)
        for line in order.order_items.all():
            price = _line_vendor_price(line)
            vendor_share += price
            vendor = line.item.vendor
            row = vendors[(vendor.pk, vendor.company_name)]
            row["owed"] += price
            row["items"] += line.quantity
            if line.pk in settled_item_ids:
                row["settled"] += price

    vendor_share = _money(vendor_share)
    profit = _money(revenue - shipping - vendor_share)
    vendor_rows = sorted(
        (
            {
                "vendor_id": pk, "vendor": name, "items": row["items"],
                "owed": float(_money(row["owed"])), "settled": float(_money(row["settled"])),
                "outstanding": float(_money(row["owed"] - row["settled"])),
            }
            for (pk, name), row in vendors.items()
        ),
        key=lambda r: -r["owed"],
    )
    settled_total = sum(Decimal(str(r["settled"])) for r in vendor_rows)
    return {
        "month": f"{year:04d}-{month:02d}",
        "orders": count,
        "revenue": float(revenue),
        "shipping": float(shipping),
        "goods_revenue": float(revenue - shipping),
        "vendor_share": float(vendor_share),
        "profit": float(profit),
        "settled": float(_money(settled_total)),
        "outstanding": float(_money(vendor_share - settled_total)),
        "vendors": vendor_rows,
    }


def _signoff(figures):
    record = MonthlyReconciliation.objects.filter(month=figures["month"]).select_related("confirmed_by").first()
    if not record:
        return None
    same = (
        _money(record.revenue) == _money(figures["revenue"])
        and _money(record.vendor_share) == _money(figures["vendor_share"])
        and _money(record.profit) == _money(figures["profit"])
        and record.orders == figures["orders"]
    )
    who = record.confirmed_by
    return {
        "confirmed_at": record.confirmed_at.isoformat(),
        "confirmed_by": (who.get_full_name() or who.username) if who else "",
        "note": record.note,
        "stale": not same,
        "snapshot": {"revenue": float(record.revenue), "vendor_share": float(record.vendor_share),
                     "profit": float(record.profit), "orders": record.orders},
    }


def _parse_month(value):
    match = MONTH_RE.match(str(value or ""))
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def monthly_accounting(request):
    parsed = _parse_month(request.query_params.get("month") or timezone.localdate().strftime("%Y-%m"))
    if not parsed:
        return Response({"detail": "Use month=YYYY-MM."}, status=400)
    figures = month_figures(*parsed)
    figures["signoff"] = _signoff(figures)
    return Response(figures)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def confirm_monthly_accounting(request):
    """Sign off a month. Current figures are recomputed server-side and stored."""
    parsed = _parse_month(request.data.get("month"))
    if not parsed:
        return Response({"detail": "Use month=YYYY-MM."}, status=400)
    now = timezone.localdate()
    if (parsed[0], parsed[1]) >= (now.year, now.month):
        return Response({"detail": "A month can only be signed off after it has ended."}, status=400)
    figures = month_figures(*parsed)
    with transaction.atomic():
        MonthlyReconciliation.objects.update_or_create(
            month=figures["month"],
            defaults={
                "revenue": _money(figures["revenue"]), "shipping": _money(figures["shipping"]),
                "vendor_share": _money(figures["vendor_share"]), "profit": _money(figures["profit"]),
                "orders": figures["orders"], "note": str(request.data.get("note", ""))[:500],
                "confirmed_by": request.user,
            },
        )
    figures["signoff"] = _signoff(figures)
    return Response(figures)
