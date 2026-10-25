from datetime import datetime
from dateutil.relativedelta import relativedelta
from decimal import Decimal

from django.db.models import Exists, OuterRef, Q, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from vendorDashboard.models import VendorPayout

from .models import Payment, Refund, Transaction
from .revenue import order_revenue, order_vendor_share, paid_orders, with_revenue


# Payment.status uses PAID; older rows and some code paths wrote "completed".
SETTLED_PAYMENT_STATUS = Q(status__iexact="paid") | Q(status__iexact="completed")


def settled_payments():
    """Confirmed customer payments, dated by when they were actually paid.

    Payment has no ``timestamp`` column: ``paid_at`` is the confirmation time and
    ``created_at`` is the fallback for rows confirmed before ``paid_at`` was recorded.
    """
    return Payment.objects.filter(SETTLED_PAYMENT_STATUS).annotate(
        settled_at=Coalesce("paid_at", "created_at")
    )


def orders_without_settled_payment(start=None, end=None):
    """Paid orders whose money is not backed by a settled Payment row.

    Older orders, manual orders and orders whose payment was never marked paid
    still brought money in. Counting them keeps the income figure equal to
    everything customers actually paid, without counting any order twice.
    """
    orders = with_revenue(paid_orders()).exclude(payment__in=settled_payments().values("pk"))
    if start is not None:
        orders = orders.filter(ordered_date__gte=start, ordered_date__lte=end)
    return orders


def income_between(start=None, end=None):
    """All money received from customers (vendor prices + markup + shipping)."""
    payments = settled_payments()
    if start is not None:
        payments = payments.filter(settled_at__gte=start, settled_at__lte=end)
    total = payments.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    extra = Decimal("0.00")
    for order in orders_without_settled_payment(start, end):
        extra += Decimal(str(order_revenue(order)))
    return total + extra


def income_breakdown(start, end):
    """Where the income of paid orders in the period goes: vendors, shipping, shop."""
    revenue = vendors = shipping = 0.0
    orders = with_revenue(paid_orders().filter(ordered_date__gte=start, ordered_date__lte=end))
    for order in orders.prefetch_related("order_items__item"):
        revenue += order_revenue(order)
        vendors += order_vendor_share(order)
        shipping += float(order.shipping_amount or 0)
    return {
        "orders_total": round(revenue, 2),
        "owed_to_vendors": round(vendors, 2),
        "shipping": round(shipping, 2),
        "shop_markup": round(revenue - vendors - shipping, 2),
    }


def channel_filter(channel):
    """Payments made through one channel ("mpesa" or "paypal").

    Older payments (and the M-Pesa till/C2B flow) never wrote their method on
    the Payment row, so a payment also counts when its gateway says so or when
    its recorded customer transaction was made through that channel.
    """
    recorded = Transaction.objects.filter(
        payment=OuterRef("pk"),
        payment_method__iexact=channel,
        transaction_type__in=["C2B", "PayPal"],
        payout__isnull=True,
    )
    return (
        Q(payment_method__iexact=channel)
        | Q(payment_gateway__iexact=channel)
        | Exists(recorded)
    )


def channel_activity(channel, start=None, end=None):
    """Money received through one channel, from confirmed payments only.

    The Accounts cards are a statement of cash that actually arrived, so the
    figure is the sum of settled Payment rows (one per customer payment, in KES).
    Recorded customer transactions that have no settled payment behind them are
    not added in: they are reported separately as ``unmatched`` so someone can
    review them, with the amount in the provider's own currency.
    """
    payments = settled_payments().filter(channel_filter(channel))
    if start is not None:
        payments = payments.filter(settled_at__gte=start, settled_at__lte=end)
    amount = payments.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

    covered = settled_payments().filter(channel_filter(channel)).values("pk")
    unmatched_qs = Transaction.objects.filter(
        transaction_type__in=["C2B", "PayPal"],
        payment_method__iexact=channel,
        payout__isnull=True,
        status__iexact="completed",
    ).exclude(payment__in=covered).select_related("payment")
    if start is not None:
        unmatched_qs = unmatched_qs.filter(created_at__gte=start, created_at__lte=end)

    seen = set()
    unmatched_amount = Decimal("0.00")
    reasons = {"no_payment": 0, "payment_not_confirmed": 0}
    for tx in unmatched_qs.order_by("id"):
        reference = tx.paypal_transaction_id or tx.mpesa_receipt_number or f"tx-{tx.pk}"
        if reference in seen:
            continue  # PayPal stores one row per vendor for the same capture
        seen.add(reference)
        unmatched_amount += Decimal(tx.amount or 0)
        reasons["no_payment" if tx.payment_id is None else "payment_not_confirmed"] += 1

    return {
        "amount": amount,
        "payments": payments.count(),
        "unmatched": {
            "count": len(seen),
            "amount": unmatched_amount,
            "currency": "USD" if channel == "paypal" else "KES",
            "reasons": reasons,
        },
    }


def _unmatched_payload(unmatched):
    return {**unmatched, "amount": float(unmatched["amount"])}


class DashboardSummaryView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        selected_date = request.query_params.get("date")

        if selected_date:
            try:
                selected = datetime.strptime(selected_date, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"error": "Invalid date. Use YYYY-MM-DD."},
                    status=400,
                )

            period_start = timezone.make_aware(
                datetime.combine(selected, datetime.min.time())
            )
            period_end = timezone.make_aware(
                datetime.combine(selected, datetime.max.time())
            )
            period_label = selected.strftime("%d/%m/%Y")
            period_description = "Selected date"
        else:
            selected = timezone.localdate()
            period_start = timezone.make_aware(
                datetime.combine(selected.replace(day=1), datetime.min.time())
            )
            period_end = timezone.now()
            period_label = selected.strftime("%d/%m/%Y")
            period_description = "Current month"

        # Customer income is sourced from completed Payment records. This
        # avoids double-counting PayPal Transaction rows, which may exist once
        # per vendor on a multi-vendor order.
        completed_payments = settled_payments().filter(
            settled_at__gte=period_start,
            settled_at__lte=period_end,
        )

        income_total = income_between(period_start, period_end)
        breakdown = income_breakdown(period_start, period_end)

        paypal = channel_activity("paypal", period_start, period_end)
        mpesa = channel_activity("mpesa", period_start, period_end)
        paypal_all = channel_activity("paypal")
        mpesa_all = channel_activity("mpesa")
        paypal_income, mpesa_income = paypal["amount"], mpesa["amount"]

        # Manual accounting entries are B2C transactions. Only completed
        # entries affect the financial summary.
        manual_expenses = (
            Transaction.objects.filter(
                transaction_type="B2C",
                status__iexact="completed",
                payout__isnull=True,
                created_at__gte=period_start,
                created_at__lte=period_end,
            )
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        category_totals = {}
        for category, label in Transaction.CATEGORY_CHOICES:
            total = (
                Transaction.objects.filter(
                    transaction_type="B2C",
                    status__iexact="completed",
                    payout__isnull=True,
                    category=category,
                    created_at__gte=period_start,
                    created_at__lte=period_end,
                ).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            category_totals[label] = float(total)

        # Completed customer refunds are real cash outflows.
        completed_refunds = Refund.objects.filter(status="completed", completed_at__gte=period_start, completed_at__lte=period_end)
        refund_total = completed_refunds.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        category_totals["Refund"] = category_totals.get("Refund", 0) + float(refund_total)

        # Actual vendor settlements are authoritative from VendorPayout. They
        # are separate from manual ledger entries and are included in total
        # expenses/cashbook only when the payout is actually marked paid.
        vendor_payouts = VendorPayout.objects.filter(paid=True)
        if selected_date:
            vendor_payouts = vendor_payouts.filter(
                paid_at__gte=period_start,
                paid_at__lte=period_end,
            )
        else:
            vendor_payouts = vendor_payouts.filter(
                paid_at__gte=period_start,
                paid_at__lte=period_end,
            )

        vendor_payments_total = (
            vendor_payouts.aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        # Paid vendor settlements are recorded in the books automatically under
        # "Vendors", so the accountant does not have to key them in again.
        category_totals["Vendors"] = category_totals.get("Vendors", 0) + float(vendor_payments_total)

        expense_total = manual_expenses + vendor_payments_total + refund_total
        cashbook_total = income_total - expense_total

        # Twelve real calendar months ending in the selected/current month.
        chart_month = period_end.date().replace(day=1)
        chart_start = chart_month - relativedelta(months=11)

        monthly_income = (
            settled_payments()
            .filter(
                settled_at__gte=timezone.make_aware(
                    datetime.combine(chart_start, datetime.min.time())
                ),
                settled_at__lte=period_end,
            )
            .annotate(month=TruncMonth("settled_at"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        monthly_manual_expenses = (
            Transaction.objects.filter(
                transaction_type="B2C",
                status__iexact="completed",
                payout__isnull=True,
                created_at__gte=timezone.make_aware(
                    datetime.combine(chart_start, datetime.min.time())
                ),
                created_at__lte=period_end,
            )
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        monthly_refunds = (
            Refund.objects.filter(status="completed", completed_at__gte=timezone.make_aware(datetime.combine(chart_start, datetime.min.time())), completed_at__lte=period_end)
            .annotate(month=TruncMonth("completed_at"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        monthly_vendor_payouts = (
            VendorPayout.objects.filter(
                paid=True,
                paid_at__gte=timezone.make_aware(
                    datetime.combine(chart_start, datetime.min.time())
                ),
                paid_at__lte=period_end,
            )
            .annotate(month=TruncMonth("paid_at"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        income_dict = {
            item["month"].strftime("%Y-%m"): float(item["amount"] or 0)
            for item in monthly_income
        }
        for order in orders_without_settled_payment(
            timezone.make_aware(datetime.combine(chart_start, datetime.min.time())), period_end
        ):
            key = timezone.localtime(order.ordered_date).strftime("%Y-%m")
            income_dict[key] = income_dict.get(key, 0) + order_revenue(order)
        expense_dict = {
            item["month"].strftime("%Y-%m"): float(item["amount"] or 0)
            for item in monthly_manual_expenses
        }
        payout_dict = {
            item["month"].strftime("%Y-%m"): float(item["amount"] or 0)
            for item in monthly_vendor_payouts
        }

        refund_dict = {item["month"].strftime("%Y-%m"): float(item["amount"] or 0) for item in monthly_refunds}

        monthly_summary = []
        for offset in range(12):
            month = chart_start + relativedelta(months=offset)
            key = month.strftime("%Y-%m")
            income = income_dict.get(key, 0)
            expenses = expense_dict.get(key, 0) + payout_dict.get(key, 0) + refund_dict.get(key, 0)
            monthly_summary.append({
                "month": key,
                "income": income,
                "expenses": expenses,
                "cashbook": income - expenses,
                "vendor_payments": payout_dict.get(key, 0),
                "refunds": refund_dict.get(key, 0),
            })

        # Payment Accounts represent confirmed payment activity for the
        # selected period; they are not fabricated wallet balances.
        accounts = {
            "paypal": {
                "type": "PayPal",
                "account": None,
                "holder": "Maa Mara Market",
                "amount": float(paypal_income),
                "payments": paypal["payments"],
                "all_time_amount": float(paypal_all["amount"]),
                "all_time_payments": paypal_all["payments"],
                "unmatched": _unmatched_payload(paypal["unmatched"]),
                "status": "Confirmed activity" if paypal_income > 0 else "No activity",
            },
            "mpesa": {
                "type": "M-Pesa",
                "till": None,
                "holder": "Maa Mara Market",
                "amount": float(mpesa_income),
                "payments": mpesa["payments"],
                "all_time_amount": float(mpesa_all["amount"]),
                "all_time_payments": mpesa_all["payments"],
                "unmatched": _unmatched_payload(mpesa["unmatched"]),
                "agent_status": "Confirmed activity" if mpesa_income > 0 else "No activity",
            },
        }

        return Response({
            # Identifies the income logic that produced this response, so a stale
            # backend is easy to spot (the page's network response shows it).
            "calculation": "income-v2-paid-orders-and-payments",
            "date": period_label,
            "period": {
                "type": "day" if selected_date else "month",
                "description": period_description,
                "start": period_start.isoformat(),
                "end": period_end.isoformat(),
            },
            "accounts": accounts,
            "summary_cards": {
                "income": {
                    "amount": float(income_total),
                    "comparison": f"Income for {period_description.lower()}",
                    "breakdown": breakdown,
                },
                "expenses": {
                    "amount": float(expense_total),
                    "comparison": f"Expenses for {period_description.lower()}",
                },
                "cashbook": {
                    "amount": float(cashbook_total),
                    "comparison": "Income minus completed expenses",
                },
                "vendor_payments": {
                    "amount": float(vendor_payments_total),
                    "comparison": f"Paid vendor settlements for {period_description.lower()}",
                },
            },
            "payments_for_month": category_totals,
            "monthly_summary": monthly_summary,
        })
