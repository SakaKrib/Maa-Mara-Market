from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from ReactSerializers.models import Item
from order.models import MonthlyReconciliation, Order, OrderItem, Payment
from vendorDashboard.models import VendorPayout
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin


class MonthlyAccountingTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.vendor = self.make_vendor()
        admin = get_user_model().objects.create_user(f"adm-{uuid4().hex[:6]}", password="x", is_staff=True)
        self.admin = admin
        self.client = APIClient()
        self.client.force_authenticate(admin)
        today = timezone.localdate()
        self.this_month = today.strftime("%Y-%m")
        last = today.replace(day=1) - timedelta(days=1)
        self.last_month = last.strftime("%Y-%m")
        self.last_dt = timezone.now().replace(year=last.year, month=last.month, day=15)

    def sale(self, status="COMPLETED", when=None, price="100.00", total="170.00", shipping="20.00"):
        item = Item.objects.create(
            name=f"Item {uuid4().hex[:6]}", description="x", created_by=self.vendor.user,
            vendor=self.vendor, price=Decimal(price),
        )
        payment = Payment.objects.create(amount=Decimal(total), merchant_reference=uuid4().hex, status="PAID")
        order = Order.objects.create(
            user=self.vendor.user, payment=payment, ordered_date=when or timezone.now(), status=status,
            updated_total_price=Decimal(total), shipping_amount=Decimal(shipping),
        )
        return OrderItem.objects.create(
            order=order, item=item, user=self.vendor.user, price_at_purchase=Decimal(price), quantity=1
        )

    def get(self, month):
        res = self.client.get(f"/api/admin/monthly-accounting/?month={month}")
        self.assertEqual(res.status_code, 200, res.content)
        return res.json()

    def test_requires_admin(self):
        anon = APIClient()
        self.assertIn(anon.get("/api/admin/monthly-accounting/").status_code, (401, 403))
        plain = APIClient()
        plain.force_authenticate(get_user_model().objects.create_user("plain", password="x"))
        self.assertEqual(plain.get("/api/admin/monthly-accounting/").status_code, 403)
        self.assertEqual(plain.post("/api/admin/monthly-accounting/confirm/", {"month": self.last_month}).status_code, 403)

    def test_bad_month_rejected(self):
        self.assertEqual(self.client.get("/api/admin/monthly-accounting/?month=2026-13").status_code, 400)
        self.assertEqual(self.client.get("/api/admin/monthly-accounting/?month=abc").status_code, 400)

    def test_figures_add_up_and_exclude_other_months_and_unpaid(self):
        line = self.sale()
        self.sale(status="PENDING_PAYMENT")
        self.sale(when=self.last_dt)
        data = self.get(self.this_month)
        vendor_price = float(line.get_final_price_for_vendor())
        self.assertEqual(data["orders"], 1)
        self.assertEqual(data["revenue"], 170.0)
        self.assertEqual(data["shipping"], 20.0)
        self.assertEqual(data["vendor_share"], round(vendor_price, 2))
        self.assertEqual(data["profit"], round(170.0 - 20.0 - vendor_price, 2))
        self.assertEqual(data["outstanding"], data["vendor_share"])
        self.assertEqual(data["settled"], 0)
        self.assertEqual(data["vendors"][0]["owed"], data["vendor_share"])
        self.assertEqual(self.get(self.last_month)["orders"], 1)

    def test_paid_item_without_vendor_does_not_break_monthly_accounting(self):
        line = self.sale()
        line.item.vendor = None
        line.item.save(update_fields=["vendor"])

        data = self.get(self.this_month)

        self.assertEqual(data["orders"], 1)
        self.assertEqual(len(data["vendors"]), 1)
        self.assertIsNone(data["vendors"][0]["vendor_id"])
        self.assertEqual(data["vendors"][0]["vendor"], "Unassigned vendor")
        self.assertEqual(data["vendors"][0]["owed"], data["vendor_share"])

    def test_paid_payout_marks_amount_settled(self):
        line = self.sale()
        before = self.get(self.this_month)
        payout = VendorPayout.objects.create(
            vendor=self.vendor, amount=Decimal(str(before["vendor_share"])), paid=True, reference=uuid4().hex[:12],
        )
        payout.order_items.add(line)
        data = self.get(self.this_month)
        self.assertEqual(data["settled"], before["vendor_share"])
        self.assertEqual(data["outstanding"], 0)
        self.assertEqual(data["vendors"][0]["status"], "paid")
        self.assertEqual(data["payout_status"], "paid")

    def test_status_moves_unpaid_processing_paid(self):
        line = self.sale()
        self.assertEqual(self.get(self.this_month)["vendors"][0]["status"], "unpaid")
        payout = VendorPayout.objects.create(
            vendor=self.vendor, amount=Decimal("1.00"), paid=False, reference=uuid4().hex[:12],
        )
        payout.order_items.add(line)
        data = self.get(self.this_month)
        self.assertEqual(data["vendors"][0]["status"], "processing")
        self.assertEqual(data["payout_status"], "partial")
        payout.paid = True
        payout.save()
        self.assertEqual(self.get(self.this_month)["vendors"][0]["status"], "paid")

    def test_confirm_stores_snapshot_and_flags_later_changes(self):
        self.sale(when=self.last_dt)
        res = self.client.post("/api/admin/monthly-accounting/confirm/", {"month": self.last_month, "note": "checked"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        record = MonthlyReconciliation.objects.get(month=self.last_month)
        self.assertEqual(record.confirmed_by, self.admin)
        self.assertFalse(self.get(self.last_month)["signoff"]["stale"])
        self.sale(when=self.last_dt)  # a late sale lands in the signed-off month
        self.assertTrue(self.get(self.last_month)["signoff"]["stale"])

    def test_cannot_sign_off_current_or_future_month(self):
        res = self.client.post("/api/admin/monthly-accounting/confirm/", {"month": self.this_month}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(MonthlyReconciliation.objects.exists())

    def test_chart_rows_carry_month_key(self):
        self.sale()
        rows = self.client.get("/api/revenue-analytics/").json()
        self.assertEqual(rows[-1]["month_key"], self.this_month)


class MonthlyAccountingRequestTests(PayoutTestMixin, TestCase):
    """The panel must always get a readable JSON reply, whatever month text it sends."""

    def setUp(self):
        admin = get_user_model().objects.create_user(f"adm-{uuid4().hex[:6]}", password="x", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(admin)

    def test_month_formats_are_accepted(self):
        for value in ("2026-11", "2026-1", "2026/11", "2026-11-05", "2026-11-05T10:00:00Z"):
            res = self.client.get("/api/admin/monthly-accounting/", {"month": value})
            self.assertEqual(res.status_code, 200, (value, res.content))

    def test_invalid_month_gets_a_message(self):
        for value in ("2026-13", "november", "20261"):
            res = self.client.get("/api/admin/monthly-accounting/", {"month": value})
            self.assertEqual(res.status_code, 400)
            self.assertIn("detail", res.json())

    def test_calculation_failure_returns_json_detail(self):
        from unittest import mock

        self.client.raise_request_exception = False
        with mock.patch("order.monthly_accounting.month_figures", side_effect=RuntimeError("boom")):
            res = self.client.get("/api/admin/monthly-accounting/", {"month": "2026-11"})
        self.assertEqual(res.status_code, 500)
        self.assertIn("detail", res.json())
