from decimal import Decimal
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from ReactSerializers.models import Item
from order.models import Order, OrderItem, Payment
from vendorDashboard.models import VendorPayout
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin
from vendorDashboard.views import get_vendor_earnings


class VendorSalesOverviewTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.vendor = self.make_vendor()
        self.client = APIClient()
        self.client.force_authenticate(self.vendor.user)
        today = timezone.localdate()
        self.start, self.end = today.replace(day=1), today

    def sale(self, status, price="100.00"):
        item = Item.objects.create(
            name=f"Item {uuid4().hex[:6]}", description="x", created_by=self.vendor.user,
            vendor=self.vendor, price=Decimal(price),
        )
        payment = Payment.objects.create(amount=Decimal(price), merchant_reference=uuid4().hex, status="PAID")
        order = Order.objects.create(
            user=self.vendor.user, payment=payment, ordered_date=timezone.now(), status=status,
        )
        return OrderItem.objects.create(
            order=order, item=item, user=self.vendor.user, price_at_purchase=Decimal(price), quantity=1
        )

    def overview(self):
        response = self.client.get("/api/vendor/sales-overview/?months=6")
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def stage_of(self, line):
        rows = {row["id"]: row for row in self.overview()["items"]}
        return rows[line.pk]["stage"]

    def test_paid_sale_shows_immediately_as_awaiting_then_ready(self):
        line = self.sale("PAID")
        self.assertEqual(self.stage_of(line), "awaiting")
        Order.objects.filter(pk=line.order_id).update(status="COMPLETED")
        self.assertEqual(self.stage_of(line), "ready")

    def test_unpaid_orders_are_not_sales(self):
        line = self.sale("PENDING_PAYMENT")
        self.assertNotIn(line.pk, [row["id"] for row in self.overview()["items"]])

    def test_sale_moves_to_paid_out_once_its_payout_is_paid(self):
        line = self.sale("COMPLETED")
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(self.stage_of(line), "processing")
        payout.paid = True
        payout.paid_at = timezone.now()
        payout.save(update_fields=["paid", "paid_at"])
        self.assertEqual(self.stage_of(line), "paid_out")

        later = self.sale("COMPLETED", "250.00")  # sold after the payout was paid
        self.assertEqual(self.stage_of(later), "ready")
        self.assertEqual(self.stage_of(line), "paid_out")

    def test_months_and_totals_include_every_paid_sale(self):
        self.sale("PAID", "100.00")
        self.sale("COMPLETED", "200.00")
        data = self.overview()
        self.assertEqual(len(data["months"]), 6)
        self.assertEqual(data["totals"]["total"], data["totals"]["awaiting"] + data["totals"]["ready"])
        self.assertGreater(data["totals"]["total"], 0)

    def test_admin_readiness_lists_ready_and_awaiting_per_vendor(self):
        self.sale("COMPLETED", "100.00")
        self.sale("PAID", "50.00")
        admin = get_user_model().objects.create_user(username=f"adm{uuid4().hex[:6]}", password="x", is_staff=True)
        client = APIClient()
        client.force_authenticate(admin)
        data = client.get("/api/admin/payout-readiness/").json()
        row = next(v for v in data["vendors"] if v["vendor_id"] == self.vendor.pk)
        self.assertGreater(row["ready"], 0)
        self.assertGreater(row["awaiting"], 0)
        self.assertEqual(client.get("/api/admin/payout-readiness/").status_code, 200)

    def test_revenue_analytics_reports_profit(self):
        self.sale("PAID", "100.00")
        admin = get_user_model().objects.create_user(username=f"adm{uuid4().hex[:6]}", password="x", is_staff=True)
        client = APIClient()
        client.force_authenticate(admin)
        rows = client.get("/api/revenue-analytics/").json()
        self.assertTrue(rows and "profit" in rows[0])
