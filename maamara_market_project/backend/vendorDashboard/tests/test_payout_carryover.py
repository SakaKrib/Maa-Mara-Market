from datetime import timedelta
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from uuid import uuid4

from ReactSerializers.models import Item
from order.models import Order, OrderItem, Payment
from vendorDashboard.models import VendorPayout
from vendorDashboard.payout.services.payout_guard import STALE_PAYOUT, gate_send
from vendorDashboard.payout.services.payout_review import sale_month_breakdown
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin
from vendorDashboard.views import get_vendor_earnings


class PayoutCarryOverTests(PayoutTestMixin, TestCase):
    """Unpaid earnings from a closed month are never lost and never paid twice."""

    def setUp(self):
        self.vendor = self.make_vendor("MOBILE_MONEY")
        today = timezone.localdate()
        self.cur_start = today.replace(day=1)
        self.cur_end = (self.cur_start + relativedelta(months=1)) - timedelta(days=1)
        self.prev_start = self.cur_start - relativedelta(months=1)
        self.prev_end = self.cur_start - timedelta(days=1)
        self.admin = User.objects.create_user("payer", "p@example.com", "pw", is_staff=True)

    def sale(self, price="100.00"):
        item = Item.objects.create(
            name=f"Item {uuid4().hex[:8]}", description="x", created_by=self.vendor.user,
            vendor=self.vendor, price=Decimal(price),
        )
        payment = Payment.objects.create(amount=Decimal(price), merchant_reference=uuid4().hex, status="PAID")
        order = Order.objects.create(
            user=self.vendor.user, payment=payment, ordered_date=timezone.now(), status="COMPLETED"
        )
        return OrderItem.objects.create(
            order=order, item=item, user=self.vendor.user, price_at_purchase=Decimal(price), quantity=1
        )

    def sale_in_previous_month(self, price):
        line = self.sale(price)
        Order.objects.filter(pk=line.order_id).update(ordered_date=timezone.now() - relativedelta(months=1))
        return line

    def test_last_months_unpaid_sale_is_paid_with_this_months_and_labelled(self):
        self.sale_in_previous_month("200.00")   # never paid last month
        self.sale("100.00")
        payout = get_vendor_earnings(self.vendor, self.cur_start, self.cur_end)["payout"]
        self.assertEqual(payout.amount, Decimal("300.00"))
        months = {row["month"]: row["amount"] for row in sale_month_breakdown(payout)}
        self.assertEqual(months[self.prev_start.strftime("%Y-%m")], "200.00")
        self.assertEqual(months[self.cur_start.strftime("%Y-%m")], "100.00")

    def test_two_sales_in_one_month_add_up_in_one_payout(self):
        self.sale("2000.00")
        self.sale("2000.00")
        payout = get_vendor_earnings(self.vendor, self.cur_start, self.cur_end)["payout"]
        self.assertEqual(payout.amount, Decimal("4000.00"))
        self.assertEqual(payout.order_items.count(), 2)

    def test_group_review_lists_an_unsent_payout_from_an_earlier_month(self):
        self.sale_in_previous_month("200.00")
        old = get_vendor_earnings(self.vendor, self.prev_start, self.prev_end)["payout"]
        self.assertFalse(old.paid)
        client = APIClient()
        client.force_authenticate(self.admin)
        res = client.get("/api/admin/payouts/review/", {"payment_method": "MOBILE_MONEY"})
        self.assertEqual(res.status_code, 200, res.content)
        refs = [row["reference"] for row in res.json()["items"]]
        self.assertIn(old.reference, refs)

    def test_a_payout_with_a_since_returned_sale_cannot_be_sent(self):
        line = self.sale("100.00")
        payout = get_vendor_earnings(self.vendor, self.cur_start, self.cur_end)["payout"]
        line.is_returned = True
        line.save(update_fields=["is_returned"])
        gate = gate_send(VendorPayout.objects.get(pk=payout.pk), self.admin)
        self.assertFalse(gate.ok)
        self.assertEqual(gate.code, STALE_PAYOUT)

    def test_regenerating_drops_the_returned_sale(self):
        keep = self.sale("100.00")
        gone = self.sale("50.00")
        payout = get_vendor_earnings(self.vendor, self.cur_start, self.cur_end)["payout"]
        self.assertEqual(payout.amount, Decimal("150.00"))
        gone.is_returned = True
        gone.save(update_fields=["is_returned"])
        again = get_vendor_earnings(self.vendor, self.cur_start, self.cur_end)["payout"]
        self.assertEqual(again.pk, payout.pk)
        self.assertEqual(again.amount, Decimal("100.00"))
        self.assertEqual(list(again.order_items.all()), [keep])
