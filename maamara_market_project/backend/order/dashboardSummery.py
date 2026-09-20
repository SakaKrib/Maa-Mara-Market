from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Transaction


class DashboardSummaryView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        selected_date = request.query_params.get("date")
        period_end = timezone.now()

        if selected_date:
            try:
                selected = datetime.strptime(selected_date, "%Y-%m-%d").date()
                period_end = timezone.make_aware(
                    datetime.combine(selected, datetime.max.time())
                )
            except ValueError:
                return Response({"error": "Invalid date. Use YYYY-MM-DD."}, status=400)

        today = period_end.strftime("%d/%m/%Y")
        start_date = period_end - timedelta(days=365)

        income_monthly = (
            Transaction.objects
            .filter(
                transaction_type="C2B",
                created_at__gte=start_date,
                created_at__lte=period_end,
            )
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        expenses_monthly = (
            Transaction.objects
            .filter(
                transaction_type="B2C",
                created_at__gte=start_date,
                created_at__lte=period_end,
            )
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        income_dict = {
            item["month"].strftime("%Y-%m"): float(item["amount"] or 0)
            for item in income_monthly
        }
        expenses_dict = {
            item["month"].strftime("%Y-%m"): float(item["amount"] or 0)
            for item in expenses_monthly
        }

        months = [
            (period_end - timedelta(days=30 * i)).strftime("%Y-%m")
            for i in reversed(range(12))
        ]

        monthly_summary = []
        for month in months:
            income_val = income_dict.get(month, 0)
            expenses_val = expenses_dict.get(month, 0)
            monthly_summary.append({
                "month": month,
                "income": income_val,
                "expenses": expenses_val,
                "cashbook": income_val - expenses_val,
            })

        period_transactions = Transaction.objects.filter(
            created_at__gte=start_date,
            created_at__lte=period_end,
        )

        paypal_balance = period_transactions.filter(
            payment_method__iexact="paypal",
            transaction_type="C2B",
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        mpesa_balance = period_transactions.filter(
            payment_method__iexact="mpesa",
            transaction_type="C2B",
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        income_total = period_transactions.filter(
            transaction_type="C2B"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        expense_total = period_transactions.filter(
            transaction_type="B2C"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        cashbook_total = income_total - expense_total

        categories = [
            "vendors",
            "staffs",
            "kra",
            "refund",
            "training",
            "subscriptions",
            "rent",
        ]

        payments = {}
        for category in categories:
            total = period_transactions.filter(
                category=category
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
            payments[
                category.capitalize() if category != "kra" else "KRA Licenses"
            ] = float(total)

        response = {
            "date": today,
            "accounts": {
                "paypal": {
                    "type": "PayPal",
                    "account": "merchant@paypal.example",
                    "holder": "Maa Mara Market",
                    "amount": float(paypal_balance),
                    "status": "Verified",
                },
                "mpesa": {
                    "type": "M-Pesa",
                    "till": "123456",
                    "holder": "Maa Mara Market",
                    "amount": float(mpesa_balance),
                    "agent_status": "Active",
                },
            },
            "summary_cards": {
                "income": {
                    "amount": float(income_total),
                    "comparison": "Income for the selected period",
                },
                "expenses": {
                    "amount": float(expense_total),
                    "comparison": "Expenses for the selected period",
                },
                "cashbook": {
                    "amount": float(cashbook_total),
                    "comparison": "Income minus expenses for the selected period",
                },
            },
            "payments_for_month": payments,
            "monthly_summary": monthly_summary,
        }

        return Response(response)
