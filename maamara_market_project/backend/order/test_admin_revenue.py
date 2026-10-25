from decimal import Decimal
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from order.models import Order, Payment


class AdminRevenueTests(TestCase):
    def setUp(self):
        admin = get_user_model().objects.create_user(
            username=f"admin-{uuid4().hex[:8]}", password="x", is_staff=True
        )
        self.client = APIClient()
        self.client.force_authenticate(admin)

    def order(self, status, total=0, paid="0.00"):
        payment = Payment.objects.create(
            amount=Decimal(paid), merchant_reference=uuid4().hex, status="PAID"
        )
        return Order.objects.create(
            payment=payment, status=status, ordered_date=timezone.now(), updated_total_price=total
        )

    def test_revenue_counts_paid_orders_even_when_order_total_is_zero(self):
        self.order("completed", total=0, paid="1200.00")  # legacy: total never stored
        self.order("COMPLETED", total=800)
        self.order("DELIVERED", total=500)  # paid, customer has not confirmed yet
        self.order("PENDING_PAYMENT", total=999)  # unpaid cart: not revenue
        self.order("CANCELLED", total=777)  # not revenue

        rows = self.client.get("/api/revenue-analytics/").json()
        self.assertEqual(sum(r["revenue"] for r in rows), 2500.0)
        self.assertEqual(sum(r["orders"] for r in rows), 3)

    def test_sales_activity_matches_revenue(self):
        self.order("completed", total=0, paid="300.00")
        self.order("PAID", total=200)
        data = self.client.get("/api/admin/dashboard-chart-data/").json()
        self.assertEqual(sum(r["sales"] for r in data["sales_activity"]), 500.0)

    def test_dashboard_stats_total_sales(self):
        self.order("completed", total=0, paid="300.00")
        self.order("SHIPPED", total=200)
        from order.revenue import order_revenue, paid_orders, with_revenue

        self.assertEqual(sum(order_revenue(o) for o in with_revenue(paid_orders())), 500.0)
