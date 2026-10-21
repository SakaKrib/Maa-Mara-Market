"""Weekly vendor payout batches.

Money is only ever moved by the existing, gated payout screens. This module
decides *what is owed*: which sold items are payable, to whom and how much, and
it records that decision durably so nothing can be paid twice or silently drop.

Rules
-----
* An item is payable once its fulfilment record is COMPLETED (customer accepted,
  or the 72-hour window elapsed with no issue) and ``payout_eligible_at`` is set.
* The weekly cutoff is the Monday 00:00 that ends the week (Sunday 23:59:59
  Africa/Nairobi). Everything eligible before the cutoff and not yet allocated
  is included, so an item that became eligible late is picked up by the next
  batch instead of disappearing across a week or month boundary.
* ``PayoutAllocation.order_item`` is unique: an item belongs to at most one
  payout, whatever retries or concurrent requests do.
* A batch moves DRAFT -> AUDITED -> APPROVED. The auditor and the approver must
  be different admins. Payouts that belong to a batch cannot be sent until the
  batch is APPROVED (enforced in ``payout_guard.gate_send``).
* Provider submission is not settlement: a payout is final only when the
  provider callback or reconciliation sets ``VendorPayout.paid``.
"""
import logging
import uuid
from collections import defaultdict
from datetime import datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from order.fulfillment import _resolve_item_vendor
from order.models import OrderItemFulfillment
from vendorDashboard.models import PayoutAllocation, PayoutBatch, VendorAdjustment, VendorPayout
from vendorDashboard.payout.services.payout_guard import log_event_safely

logger = logging.getLogger(__name__)

PAYOUT_TZ = ZoneInfo("Africa/Nairobi")
ZERO = Decimal("0.00")


class WeeklyPayoutError(Exception):
    """A rule was broken; the message is safe to show to an admin."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def weekly_enabled():
    return bool(getattr(settings, "WEEKLY_PAYOUTS_ENABLED", False))


def require_enabled():
    if not weekly_enabled():
        raise WeeklyPayoutError("Weekly payouts are not enabled.", status=409)


def week_bounds(week_start):
    """Return (monday, sunday, cutoff_at) for the week starting on ``week_start``."""
    monday = week_start
    sunday = monday + timedelta(days=6)
    cutoff = datetime.combine(monday + timedelta(days=7), time.min, tzinfo=PAYOUT_TZ)
    return monday, sunday, cutoff


def last_completed_week_start(now=None):
    """Monday of the most recent week that has fully ended in Nairobi time."""
    now = (now or timezone.now()).astimezone(PAYOUT_TZ)
    this_monday = now.date() - timedelta(days=now.weekday())
    return this_monday - timedelta(days=7)


def _vendor_amount(order_item):
    try:
        return Decimal(str(order_item.get_final_price_for_vendor())).quantize(Decimal("0.01"))
    except AttributeError:
        base = getattr(order_item.item, "vendor_price", None) or getattr(order_item.item, "price", 0)
        return (Decimal(str(base)) * order_item.quantity).quantize(Decimal("0.01"))


def _customer_amount(order_item):
    try:
        return Decimal(str(order_item.get_final_price())).quantize(Decimal("0.01"))
    except (AttributeError, TypeError, ValueError):
        return ZERO


def eligible_fulfillments(cutoff):
    """Completed, unheld, unreturned, unallocated items eligible before ``cutoff``."""
    return (
        OrderItemFulfillment.objects.filter(
            status="COMPLETED",
            payout_eligible_at__isnull=False,
            payout_eligible_at__lt=cutoff,
            hold_reason="",
            order_item__payout_allocation__isnull=True,
            order_item__refunded=False,
            order_item__is_returned=False,
            order_item__is_exchanged=False,
        )
        .select_related("order_item__order__payment", "order_item__item", "order_item__item__vendor",
                        "order_item__item__created_by")
        .order_by("order_item_id")
    )


@transaction.atomic
def create_batch(actor, week_start=None):
    """Create (or return) the draft batch for a week. Idempotent per week."""
    require_enabled()
    week_start = week_start or last_completed_week_start()
    if week_start.weekday() != 0:
        raise WeeklyPayoutError("A payout week must start on a Monday.")
    monday, sunday, cutoff = week_bounds(week_start)
    if timezone.now() < cutoff:
        raise WeeklyPayoutError("That payout week has not ended yet.", status=409)

    batch, created = PayoutBatch.objects.select_for_update().get_or_create(
        week_start=monday,
        defaults={"week_end": sunday, "cutoff_at": cutoff, "created_by": actor},
    )
    if not created:
        return batch, False

    by_vendor = defaultdict(list)
    skipped = []
    for fulfillment in eligible_fulfillments(cutoff):
        order_item = fulfillment.order_item
        order = order_item.order
        if not order.payment_confirmed:
            skipped.append({"order_item": order_item.pk, "reason": "customer payment not verified"})
            continue
        vendor = _resolve_item_vendor(order_item.item)
        if vendor is None:
            skipped.append({"order_item": order_item.pk, "reason": "item has no vendor"})
            continue
        if not vendor.is_active:
            skipped.append({"order_item": order_item.pk, "reason": "vendor inactive; carried forward"})
            continue
        amount = _vendor_amount(order_item)
        if amount <= 0:
            skipped.append({"order_item": order_item.pk, "reason": "non-positive vendor amount"})
            continue
        by_vendor[vendor.pk].append((vendor, order_item, amount, fulfillment.payout_eligible_at))

    for entries in by_vendor.values():
        vendor = entries[0][0]
        gross = sum((e[2] for e in entries), ZERO)
        income = sum((_customer_amount(e[1]) for e in entries), ZERO)

        adjustments = list(
            VendorAdjustment.objects.filter(
                vendor=vendor, applied=False, created_at__lt=cutoff,
            ).filter(Q(order_item__is_returned=True) | Q(order_item__is_exchanged=True))
        )
        adjustment_total = sum((a.amount or ZERO for a in adjustments), ZERO)
        net = gross + adjustment_total
        if net <= 0:
            skipped.append({"vendor": vendor.pk, "reason": "net payout not positive after adjustments; carried forward"})
            continue

        payout, payout_created = VendorPayout.objects.get_or_create(
            vendor=vendor, payout_period_start=monday, payout_period_end=sunday,
            defaults={
                "amount": net, "gross_sales": gross, "adjustment_amount": adjustment_total,
                "income": income, "profit": income - net,
                "reference": str(uuid.uuid4())[:8],
            },
        )
        if not payout_created:
            # A payout already exists for this vendor/week (for example created by
            # the monthly flow). Never rewrite one that is paid or in flight.
            if payout.paid or payout.send_in_progress:
                skipped.append({"vendor": vendor.pk, "reason": "a payout for this week is already paid or in progress"})
                continue
            payout.amount, payout.gross_sales = net, gross
            payout.adjustment_amount, payout.income, payout.profit = adjustment_total, income, income - net
            payout.save(update_fields=["amount", "gross_sales", "adjustment_amount", "income", "profit"])

        for _vendor, order_item, amount, eligible_at in entries:
            order = order_item.order
            PayoutAllocation.objects.create(
                batch=batch, vendor=vendor, order_item=order_item, payment=order.payment,
                payment_reference=getattr(order.payment, "merchant_reference", "") or "",
                vendor_amount=amount, eligible_at=eligible_at, payout=payout,
            )
        for adj in adjustments:
            adj.applied = True
            adj.save(update_fields=["applied"])
        if adjustments:
            payout.adjustments.add(*adjustments)
        log_event_safely(payout, "weekly_batch_allocated", actor, batch=batch.pk, items=len(entries), amount=str(net))

    batch.skipped = skipped
    batch.save(update_fields=["skipped"])
    return batch, True


@transaction.atomic
def audit_batch(batch_id, actor):
    require_enabled()
    batch = PayoutBatch.objects.select_for_update().get(pk=batch_id)
    if batch.status != PayoutBatch.STATUS_DRAFT:
        raise WeeklyPayoutError("This batch has already been audited.", status=409)
    batch.status = PayoutBatch.STATUS_AUDITED
    batch.audited_by = actor
    batch.audited_at = timezone.now()
    batch.save(update_fields=["status", "audited_by", "audited_at"])
    return batch


@transaction.atomic
def approve_batch(batch_id, actor):
    require_enabled()
    batch = PayoutBatch.objects.select_for_update().get(pk=batch_id)
    if batch.status != PayoutBatch.STATUS_AUDITED:
        raise WeeklyPayoutError("Only an audited batch can be approved.", status=409)
    if batch.audited_by_id == getattr(actor, "pk", None):
        raise WeeklyPayoutError("A different admin must approve a batch you audited.", status=403)
    batch.status = PayoutBatch.STATUS_APPROVED
    batch.approved_by = actor
    batch.approved_at = timezone.now()
    batch.save(update_fields=["status", "approved_by", "approved_at"])
    for payout in VendorPayout.objects.filter(allocations__batch=batch).distinct():
        log_event_safely(payout, "weekly_batch_approved", actor, batch=batch.pk)
    return batch


def payout_blocked_by_batch(payout):
    """Return a reason string if ``payout`` belongs to an unapproved batch."""
    statuses = set(
        PayoutBatch.objects.filter(allocations__payout=payout).values_list("status", flat=True)
    )
    if statuses and statuses != {PayoutBatch.STATUS_APPROVED}:
        return "This payout belongs to a weekly batch that has not been audited and approved by two different admins."
    return ""


def batch_summary(batch):
    payouts = {}
    for alloc in batch.allocations.select_related("vendor", "payout"):
        p = payouts.setdefault(alloc.payout_id, {
            "payout_reference": alloc.payout.reference if alloc.payout else None,
            "vendor": alloc.vendor.company_name,
            "payment_method": alloc.vendor.payment_method,
            "amount": ZERO, "items": 0,
            "paid": bool(alloc.payout and alloc.payout.paid),
            "submitted": bool(alloc.payout and (alloc.payout.mpesa_conversation_id or alloc.payout.kcb_transaction_reference
                                               or alloc.payout.paypal_batch_id)),
        })
        p["amount"] += alloc.vendor_amount
        p["items"] += 1
    rows = [{**v, "amount": str(v["amount"])} for v in payouts.values()]
    return {
        "id": batch.pk, "week_start": batch.week_start.isoformat(), "week_end": batch.week_end.isoformat(),
        "cutoff_at": batch.cutoff_at.isoformat(), "status": batch.status,
        "created_by": getattr(batch.created_by, "username", None),
        "audited_by": getattr(batch.audited_by, "username", None),
        "approved_by": getattr(batch.approved_by, "username", None),
        "payouts": rows, "skipped": batch.skipped,
        "total": str(sum((Decimal(r["amount"]) for r in rows), ZERO)),
    }
