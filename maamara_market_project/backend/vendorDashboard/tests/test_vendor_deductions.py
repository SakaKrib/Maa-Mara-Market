from decimal import Decimal
from uuid import uuid4

from django.test import TestCase
from django.utils import timezone

from ReactSerializers.models import Item
from order.models import Order, OrderItem, Payment
from vendorDashboard.deductions import register_vendor_deduction, vendor_share
from vendorDashboard.models import VendorAdjustment
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin
from vendorDashboard.views import get_vendor_earnings


class VendorDeductionTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.vendor = self.make_vendor("MOBILE_MONEY")
        today = timezone.localdate()
        self.start = today.replace(day=1)
        self.end = today

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

    def pay_out(self):
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        payout.paid = True
        payout.paid_at = timezone.now()
        payout.save(update_fields=["paid", "paid_at"])
        return payout

    def refund(self, line):
        line.refunded = True
        line.save(update_fields=["refunded"])
        return register_vendor_deduction(line, "refund test")

    def test_refund_before_the_vendor_is_paid_needs_no_deduction(self):
        line = self.sale("100.00")
        self.assertIsNone(self.refund(line))
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(payout.amount, Decimal("0.00"))  # never paid for the refunded sale

    def test_refund_after_payout_is_deducted_from_the_next_payout(self):
        line = self.sale("100.00")
        self.pay_out()
        deduction = self.refund(line)
        self.assertEqual(deduction.amount, -vendor_share(line))
        self.assertEqual(deduction.kind, "vendor_deduction")

        self.sale("300.00")
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(payout.amount, Decimal("300.00") - vendor_share(line))
        self.assertEqual(payout.adjustment_amount, -vendor_share(line))
        deduction.refresh_from_db()
        self.assertTrue(deduction.applied)

        # Regenerating the same open payout keeps the deduction and never takes it twice.
        again = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(again.pk, payout.pk)
        self.assertEqual(again.amount, payout.amount)

    def test_deduction_is_recorded_once_per_sale(self):
        line = self.sale("100.00")
        self.pay_out()
        first = self.refund(line)
        second = register_vendor_deduction(line, "again")
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(VendorAdjustment.objects.filter(order_item=line, kind="vendor_deduction").count(), 1)

    def test_deduction_larger_than_earnings_carries_forward(self):
        line = self.sale("1000.00")
        self.pay_out()
        deduction = self.refund(line)

        self.sale("100.00")
        small = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(small.amount, Decimal("100.00"))   # never pushed below zero
        deduction.refresh_from_db()
        self.assertFalse(deduction.applied)                 # still owed

        self.sale("2000.00")
        later = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(later.amount, Decimal("100.00") + Decimal("2000.00") - vendor_share(line))
        deduction.refresh_from_db()
        self.assertTrue(deduction.applied)

    def test_customer_side_records_are_never_paid_out(self):
        line = self.sale("100.00")
        VendorAdjustment.objects.create(vendor=self.vendor, order_item=line, amount=Decimal("170.00"), reason="x")
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(payout.adjustment_amount, Decimal("0.00"))
        self.assertEqual(payout.amount, vendor_share(line))
