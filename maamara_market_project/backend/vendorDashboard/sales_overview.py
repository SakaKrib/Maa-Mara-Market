"""What a vendor has sold and where each sale stands on the way to payment.

A sale moves through four stages, and the vendor sees all of them:

* ``awaiting``  - the customer paid, the order is not complete yet
* ``ready``     - the order is complete; it joins the next payout
* ``processing``- it is in a payout that was sent but not confirmed
* ``paid_out``  - it is in a payout that was paid to the vendor
"""
from collections import OrderedDict
from datetime import datetime
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from order.models import OrderItem
from order.revenue import paid_orders
from ReactSerializers.models import Item

from .models import Vendor, VendorPayout

# A payout is frozen once it was paid or handed to a payment provider.
SUBMITTED_PAYOUT = (
    Q(paid=True)
    | Q(send_in_progress=True)
    | Q(initiated_at__isnull=False)
    | Q(mpesa_conversation_id__isnull=False, mpesa_conversation_id__gt="")
    | Q(mpesa_originator_conversation_id__isnull=False, mpesa_originator_conversation_id__gt="")
    | Q(kcb_transaction_reference__isnull=False, kcb_transaction_reference__gt="")
    | Q(paypal_batch_id__isnull=False, paypal_batch_id__gt="")
    | Q(paypal_payout_item_id__isnull=False, paypal_payout_item_id__gt="")
)

STAGES = ("awaiting", "ready", "processing", "paid_out")
STAGE_LABELS = {
    "awaiting": "Paid by customer, awaiting delivery confirmation",
    "ready": "Completed, ready for payout",
    "processing": "Payout sent, processing",
    "paid_out": "Paid out to you",
}


def vendor_amount(order_item):
    try:
        return Decimal(str(order_item.get_final_price_for_vendor()))
    except Exception:
        price = getattr(order_item.item, "price", 0) or 0
        return Decimal(str(price)) * order_item.quantity


def is_settled(order_item):
    fulfilment = getattr(order_item, "fulfillment", None)
    return (
        str(order_item.order.status or "").lower() == "completed"
        or str(getattr(fulfilment, "status", "") or "").lower() == "completed"
    )


def classify(vendor, order_items):
    """Return {order_item_id: stage} for a vendor's order items."""
    payouts = VendorPayout.objects.filter(vendor=vendor)
    linked = {}
    for payout in payouts.filter(order_items__in=[oi.pk for oi in order_items]).distinct():
        stage = "paid_out" if payout.paid else "processing"
        for oi_id in payout.order_items.filter(pk__in=[oi.pk for oi in order_items]).values_list("pk", flat=True):
            if linked.get(oi_id) != "paid_out":
                linked[oi_id] = stage

    # Payouts made before items were tracked covered what was settled when they
    # were generated.
    legacy = payouts.filter(SUBMITTED_PAYOUT, amount__gt=0, order_items__isnull=True)
    paid_cut = legacy.filter(paid=True).order_by("-created_at").values_list("created_at", flat=True).first()
    sent_cut = legacy.order_by("-created_at").values_list("created_at", flat=True).first()

    result = {}
    for oi in order_items:
        stage = linked.get(oi.pk)
        if stage is None and is_settled(oi):
            done_at = getattr(getattr(oi, "fulfillment", None), "completed_at", None)
            ordered = oi.order.ordered_date
            def covered(cut):
                return cut is not None and ordered <= cut and not (done_at and done_at > cut)
            if covered(paid_cut):
                stage = "paid_out"
            elif covered(sent_cut):
                stage = "processing"
            else:
                stage = "ready"
        result[oi.pk] = stage or "awaiting"
    return result


def vendor_sales_rows(vendor, since=None):
    items = Item.objects.filter(Q(vendor=vendor) | Q(created_by=vendor.user))
    qs = (
        OrderItem.objects.filter(
            item__in=items,
            order__in=paid_orders().values("id"),
            refunded=False, is_returned=False, is_exchanged=False,
        )
        .select_related("order", "item", "fulfillment")
        .order_by("-order__ordered_date", "-id")
    )
    if since:
        qs = qs.filter(order__ordered_date__gte=since)
    return list(qs)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vendor_sales_overview(request):
    vendor = Vendor.objects.filter(user=request.user).first()
    if not vendor:
        return Response({"detail": "Vendor profile not found."}, status=403)
    try:
        months_back = max(1, min(int(request.query_params.get("months", 6)), 24))
    except (TypeError, ValueError):
        months_back = 6

    today = timezone.localdate()
    first = today.replace(day=1)
    keys = []
    year, month = first.year, first.month
    for _ in range(months_back):
        keys.append((year, month))
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    keys.reverse()
    since = timezone.make_aware(datetime(keys[0][0], keys[0][1], 1))

    rows = vendor_sales_rows(vendor, since)
    stages = classify(vendor, rows)

    months = OrderedDict(
        ((y, m), {"key": f"{y}-{m:02d}", "label": datetime(y, m, 1).strftime("%b %Y"),
                  "total": Decimal("0"), "orders": 0, "units": 0,
                  **{stage: Decimal("0") for stage in STAGES}})
        for y, m in keys
    )
    items = []
    for oi in rows:
        local = timezone.localtime(oi.order.ordered_date)
        bucket = months.get((local.year, local.month))
        amount = vendor_amount(oi)
        stage = stages[oi.pk]
        if bucket is not None:
            bucket["total"] += amount
            bucket[stage] += amount
            bucket["units"] += oi.quantity
            bucket["orders"] += 1
        items.append({
            "id": oi.pk,
            "order_id": oi.order_id,
            "item_name": oi.item.name,
            "quantity": oi.quantity,
            "amount": float(amount),
            "ordered_date": oi.order.ordered_date.isoformat(),
            "month": f"{local.year}-{local.month:02d}",
            "order_status": oi.order.status,
            "stage": stage,
            "stage_label": STAGE_LABELS[stage],
        })

    month_list = [
        {k: (float(v) if isinstance(v, Decimal) else v) for k, v in bucket.items()}
        for bucket in months.values()
    ]
    totals = {"total": 0.0, **{stage: 0.0 for stage in STAGES}}
    for bucket in month_list:
        for key in totals:
            totals[key] += bucket[key]
    return Response({"months": month_list, "totals": totals, "items": items[:500], "stage_labels": STAGE_LABELS})


def vendor_stage_totals(vendor):
    rows = vendor_sales_rows(vendor)
    stages = classify(vendor, rows)
    totals = {stage: Decimal("0") for stage in STAGES}
    for oi in rows:
        totals[stages[oi.pk]] += vendor_amount(oi)
    return totals


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_payout_readiness(request):
    """Per vendor: what is ready to pay, what is still waiting, what was paid."""
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({"detail": "Admin access required."}, status=403)
    vendors = []
    grand = {stage: Decimal("0") for stage in STAGES}
    for vendor in Vendor.objects.filter(is_active=True).select_related("user"):
        totals = vendor_stage_totals(vendor)
        if not any(totals.values()):
            continue
        for stage in STAGES:
            grand[stage] += totals[stage]
        vendors.append({
            "vendor_id": vendor.pk,
            "vendor": vendor.company_name or f"{vendor.first_name} {vendor.surname_name}".strip(),
            **{stage: float(totals[stage]) for stage in STAGES},
        })
    vendors.sort(key=lambda row: (-row["ready"], -row["awaiting"]))
    return Response({
        "totals": {stage: float(grand[stage]) for stage in STAGES},
        "vendors": vendors,
        "stage_labels": STAGE_LABELS,
    })
