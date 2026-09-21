from datetime import datetime
from dateutil.relativedelta import relativedelta
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from vendorDashboard.models import VendorPayout

from .models import Payment, Refund, Transaction


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
        completed_payments = Payment.objects.filter(
            status__iexact="completed",
            timestamp__gte=period_start,
            timestamp__lte=period_end,
        )

        income_total = (
            completed_payments.aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        paypal_income = (
            completed_payments.filter(payment_method__iexact="paypal")
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        mpesa_income = (
            completed_payments.filter(payment_method__iexact="mpesa")
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

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

        expense_total = manual_expenses + vendor_payments_total + refund_total
        cashbook_total = income_total - expense_total

        # Twelve real calendar months ending in the selected/current month.
        chart_month = period_end.date().replace(day=1)
        chart_start = chart_month - relativedelta(months=11)

        monthly_income = (
            Payment.objects.filter(
                status__iexact="completed",
                timestamp__gte=timezone.make_aware(
                    datetime.combine(chart_start, datetime.min.time())
                ),
                timestamp__lte=period_end,
            )
            .annotate(month=TruncMonth("timestamp"))
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
                "status": "Confirmed activity" if paypal_income > 0 else "No activity",
            },
            "mpesa": {
                "type": "M-Pesa",
                "till": None,
                "holder": "Maa Mara Market",
                "amount": float(mpesa_income),
                "agent_status": "Confirmed activity" if mpesa_income > 0 else "No activity",
            },
        }

        return Response({
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
