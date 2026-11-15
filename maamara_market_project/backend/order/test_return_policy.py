from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from decimal import Decimal
from uuid import uuid4

from ReactSerializers.models import Item
from order.models import Order, OrderItem, Payment
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin


class ReturnPolicyTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.vendor = self.make_vendor("MOBILE_MONEY")
        self.customer = User.objects.create_user("rp-buyer", "rp@example.com", "pw")

    def line(self, returnable=True, ordered_days_ago=0):
        item = Item.objects.create(
            name=f"Item {uuid4().hex[:6]}", description="x", created_by=self.vendor.user,
            vendor=self.vendor, price=Decimal("500.00"), returnable=returnable,
        )
        payment = Payment.objects.create(amount=Decimal("500.00"), merchant_reference=uuid4().hex, status="PAID")
        order = Order.objects.create(
            user=self.customer, payment=payment,
            ordered_date=timezone.now() - timedelta(days=ordered_days_ago), status="COMPLETED",
        )
        return OrderItem.objects.create(
            order=order, item=item, user=self.customer, price_at_purchase=Decimal("500.00"), quantity=1
        )

    def client(self):
        c = APIClient()
        c.force_authenticate(self.customer)
        return c

    def submit(self, line):
        return self.client().post(
            f"/api/returns-request/{line.id}/",
            {"reason": "get_something_else", "customer_preference": "exchange"},
            format="multipart",
        )

    def test_returnable_item_within_window_is_accepted(self):
        self.assertEqual(self.submit(self.line()).status_code, 200)

    def test_vendor_non_returnable_item_is_refused_with_contact_link(self):
        response = self.submit(self.line(returnable=False))
        self.assertEqual(response.status_code, 409)
        body = response.json()
        self.assertEqual(body["code"], "NOT_RETURNABLE")
        self.assertEqual(body["support_url"], "/support")
        self.assertIn("contact us", body["error"])

    def test_request_after_the_window_is_refused(self):
        response = self.submit(self.line(ordered_days_ago=15))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "RETURN_WINDOW_EXPIRED")

    def test_request_on_day_13_is_still_accepted(self):
        self.assertEqual(self.submit(self.line(ordered_days_ago=13)).status_code, 200)

    def test_eligibility_endpoint_matches_the_submit_rules(self):
        ok = self.client().get(f"/api/returns-eligibility/{self.line().id}/").json()
        self.assertTrue(ok["eligible"])
        no = self.client().get(f"/api/returns-eligibility/{self.line(returnable=False).id}/").json()
        self.assertFalse(no["eligible"])
        self.assertEqual(no["code"], "NOT_RETURNABLE")
        late = self.client().get(f"/api/returns-eligibility/{self.line(ordered_days_ago=20).id}/").json()
        self.assertEqual(late["code"], "RETURN_WINDOW_EXPIRED")

    def test_other_customers_item_is_not_visible(self):
        other = User.objects.create_user("rp-other", "o@example.com", "pw")
        c = APIClient(); c.force_authenticate(other)
        self.assertEqual(c.get(f"/api/returns-eligibility/{self.line().id}/").status_code, 404)
