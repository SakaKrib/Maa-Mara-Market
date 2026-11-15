"""End to end: customer asks for an exchange -> admin approves -> credit -> payout deduction."""
from decimal import Decimal
from uuid import uuid4

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from ReactSerializers.models import Item
from order.credits import credit_balance, quote_credit
from order.models import ExchangeCredit, Order, OrderItem, Payment
from vendorDashboard.deductions import vendor_share
from vendorDashboard.models import VendorAdjustment
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin
from vendorDashboard.views import get_vendor_earnings


class ExchangeFlowTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.vendor = self.make_vendor("MOBILE_MONEY")
        self.customer = User.objects.create_user("buyer", "b@example.com", "pw")
        self.admin = User.objects.create_user("admin", "a@example.com", "pw", is_staff=True)
        today = timezone.localdate()
        self.start, self.end = today.replace(day=1), today

    def sale(self, price="1000.00"):
        item = Item.objects.create(
            name=f"Item {uuid4().hex[:6]}", description="x", created_by=self.vendor.user,
            vendor=self.vendor, price=Decimal(price),
        )
        payment = Payment.objects.create(amount=Decimal(price), merchant_reference=uuid4().hex, status="PAID")
        order = Order.objects.create(user=self.customer, payment=payment, ordered_date=timezone.now(), status="COMPLETED")
        return OrderItem.objects.create(
            order=order, item=item, user=self.customer, price_at_purchase=Decimal(price), quantity=1
        )

    def request_exchange(self, line):
        client = APIClient()
        client.force_authenticate(self.customer)
        return client.post(
            f"/api/returns-request/{line.id}/",
            {"reason": "get_something_else", "customer_preference": "exchange"},
            format="json",
        )

    def approve(self, return_id):
        client = APIClient()
        client.force_authenticate(self.admin)
        return client.post(f"/api/returns/{return_id}/approve/", {"action": "approve", "admin_note": "ok"}, format="json")

    def pay_out(self):
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        payout.paid, payout.paid_at = True, timezone.now()
        payout.save(update_fields=["paid", "paid_at"])
        return payout

    def test_exchange_after_the_vendor_was_paid(self):
        line = self.sale("1000.00")
        self.pay_out()

        res = self.request_exchange(line)
        self.assertIn(res.status_code, (200, 201), res.content)
        return_id = res.json()["return_request"]["id"] if "return_request" in res.json() else None
        if return_id is None:
            from vendorDashboard.models import ReturnRequest
            return_id = ReturnRequest.objects.get(item=line).id

        # Nothing is spendable or deducted until the admin approves.
        self.assertEqual(credit_balance(self.customer, None), Decimal("0.00"))
        self.assertFalse(VendorAdjustment.objects.filter(kind="vendor_deduction").exists())

        approved = self.approve(return_id)
        self.assertEqual(approved.status_code, 200, approved.content)

        line.refresh_from_db()
        self.assertTrue(line.is_exchanged)
        self.assertEqual(credit_balance(self.customer, None), Decimal("1000.00"))
        deduction = VendorAdjustment.objects.get(order_item=line, kind="vendor_deduction")
        self.assertEqual(deduction.amount, -vendor_share(line))

        # The customer spends the credit on a 1,500 item: pays the 500 balance only.
        quote = quote_credit(self.customer, None, "1500.00")
        self.assertEqual((quote.applied, quote.charge), (Decimal("1000.00"), Decimal("500.00")))

        # The vendor repays the original sale from their next earnings.
        self.sale("3000.00")
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(payout.amount, Decimal("3000.00") - vendor_share(line))

        # Approving twice neither doubles the credit nor the deduction.
        self.approve(return_id)
        self.assertEqual(ExchangeCredit.objects.count(), 1)
        self.assertEqual(VendorAdjustment.objects.filter(kind="vendor_deduction").count(), 1)

    def test_exchange_before_the_vendor_is_paid_just_drops_the_sale(self):
        line = self.sale("1000.00")
        res = self.request_exchange(line)
        self.assertIn(res.status_code, (200, 201), res.content)
        from vendorDashboard.models import ReturnRequest
        self.assertEqual(self.approve(ReturnRequest.objects.get(item=line).id).status_code, 200)

        self.assertFalse(VendorAdjustment.objects.filter(kind="vendor_deduction").exists())
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(payout.amount, Decimal("0.00"))
        self.assertEqual(credit_balance(self.customer, None), Decimal("1000.00"))
