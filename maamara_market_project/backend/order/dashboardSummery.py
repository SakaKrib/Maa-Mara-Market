from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils.timezone import now
from datetime import timedelta, datetime
from decimal import Decimal
from .models import Transaction

class DashboardSummaryView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = datetime.today().strftime("%d/%m/%Y")
        start_date = now() - timedelta(days=365)

        # Aggregate monthly income (C2B)
        income_monthly = (
            Transaction.objects
            .filter(transaction_type="C2B", created_at__gte=start_date)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(amount=Sum('amount'))
            .order_by('month')
        )

        # Aggregate monthly expenses (B2C)
        expenses_monthly = (
            Transaction.objects
            .filter(transaction_type="B2C", created_at__gte=start_date)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(amount=Sum('amount'))
            .order_by('month')
        )

        income_dict = {item['month'].strftime("%Y-%m"): float(item['amount'] or 0) for item in income_monthly}
        expenses_dict = {item['month'].strftime("%Y-%m"): float(item['amount'] or 0) for item in expenses_monthly}

        months = [(now() - timedelta(days=30*i)).strftime("%Y-%m") for i in reversed(range(12))]

        monthly_summary = []
        for month in months:
            income_val = income_dict.get(month, 0)
            expenses_val = expenses_dict.get(month, 0)
            cashbook_val = income_val - expenses_val
            monthly_summary.append({
                "month": month,
                "income": income_val,
                "expenses": expenses_val,
                "cashbook": cashbook_val,
            })

        # Existing overall summary calculations
        paypal_transactions = Transaction.objects.filter(payment_method="paypal", transaction_type="C2B")
        paypal_balance = sum(Decimal(str(t.amount_in_kes)) for t in paypal_transactions) or Decimal('0')
        mpesa_balance = Transaction.objects.filter(payment_method="mpesa", transaction_type="C2B").aggregate(
            total=Sum("amount")
        )["total"] or Decimal('0')
        income_c2b = Transaction.objects.filter(transaction_type="C2B").aggregate(total=Sum("amount"))["total"] or Decimal('0')
        income_paypal = paypal_balance
        income_total = income_c2b + income_paypal
        expense_total = Transaction.objects.filter(transaction_type="B2C").aggregate(total=Sum("amount"))["total"] or Decimal('0')
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
        for cat in categories:
            txs = Transaction.objects.filter(category=cat)
            total_kes = Decimal('0')
            for t in txs:
                if t.payment_method.lower() == "paypal":
                    total_kes += Decimal(str(t.amount_in_kes))
                else:
                    total_kes += t.amount
            payments[cat.capitalize() if cat != "kra" else "KRA Licenses"] = float(total_kes)

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
                    "comparison": "compared to KES 0.00 last month",
                },
                "expenses": {
                    "amount": float(expense_total),
                    "comparison": "compared to KES 240,458 last month",
                },
                "cashbook": {
                    "amount": float(cashbook_total),
                    "comparison": "compared to KES 101,478 last month",
                },
            },
            "payments_for_month": payments,
            "monthly_summary": monthly_summary,  # New time series data for chart
        }

        return Response(response)
