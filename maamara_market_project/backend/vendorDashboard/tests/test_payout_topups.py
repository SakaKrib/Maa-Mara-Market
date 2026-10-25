from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.test import TestCase
from django.utils import timezone

from ReactSerializers.models import Item
from order.models import Order, OrderItem, OrderItemFulfillment, Payment
from vendorDashboard.models import VendorPayout
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin
from vendorDashboard.views import get_vendor_earnings


class PayoutTopUpTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.vendor = self.make_vendor()
        today = timezone.localdate()
        self.start = today.replace(day=1)
        self.end = today

    def sale(self, price="100.00", order_status="COMPLETED", fulfil=None):
        item = Item.objects.create(
            name=f"Item {uuid4().hex[:8]}", description="x", created_by=self.vendor.user,
            vendor=self.vendor, price=Decimal(price),
        )
        payment = Payment.objects.create(amount=Decimal(price), merchant_reference=uuid4().hex, status="PAID")
        order = Order.objects.create(
            user=self.vendor.user, payment=payment, ordered_date=timezone.now(), status=order_status
        )
        line = OrderItem.objects.create(
            order=order, item=item, user=self.vendor.user, price_at_purchase=Decimal(price), quantity=1
        )
        if fulfil:
            OrderItemFulfillment.objects.create(order_item=line, status=fulfil)
        return line

    def mark_paid(self, payout):
        payout.paid = True
        payout.paid_at = timezone.now()
        payout.save(update_fields=["paid", "paid_at"])

    def test_sale_after_a_paid_payout_gets_its_own_top_up_payout(self):
        self.sale("100.00")
        first = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(first.amount, Decimal("100.00"))
        self.mark_paid(first)

        # Nothing new: the paid payout is returned unchanged, no empty duplicate.
        again = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(again.pk, first.pk)

        self.sale("250.00")  # sold and settled after the first payout was paid
        topup = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertNotEqual(topup.pk, first.pk)
        self.assertEqual(topup.amount, Decimal("250.00"))
        first.refresh_from_db()
        self.assertEqual(first.amount, Decimal("100.00"))  # paid snapshot untouched

        # Paying the top-up and regenerating never pays anything twice.
        self.mark_paid(topup)
        final = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(final.pk, topup.pk)
        self.assertEqual(VendorPayout.objects.filter(vendor=self.vendor).count(), 2)

    def test_unpaid_payout_picks_up_new_sales_when_regenerated(self):
        self.sale("100.00")
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.sale("50.00")
        again = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(again.pk, payout.pk)
        self.assertEqual(again.amount, Decimal("150.00"))

    def test_unsettled_orders_are_not_paid_out_yet(self):
        self.sale("100.00", order_status="DELIVERED")
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(payout.amount, Decimal("0.00"))

    def test_item_completed_by_its_own_fulfilment_is_payable(self):
        self.sale("100.00", order_status="AWAITING_CONFIRMATION", fulfil="COMPLETED")
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(payout.amount, Decimal("100.00"))

    def test_late_completed_sale_from_a_closed_month_rolls_into_next_payout(self):
        old = self.sale("100.00")
        Order.objects.filter(pk=old.order_id).update(ordered_date=timezone.now() - timedelta(days=45))
        payout = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(payout.amount, Decimal("100.00"))

    def test_items_from_before_tracking_are_not_paid_twice(self):
        self.sale("100.00")
        legacy = VendorPayout.objects.create(
            vendor=self.vendor, amount=Decimal("100.00"), reference="legacy01",
            payout_period_start=self.start, payout_period_end=self.end,
        )
        self.mark_paid(legacy)  # paid before payouts recorded their items
        result = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertEqual(result.pk, legacy.pk)

    def test_sale_made_after_an_old_untracked_payout_is_payable(self):
        # The vendor was paid 250 for one item before payouts tracked their items.
        earlier = self.sale("250.00")
        Order.objects.filter(pk=earlier.order_id).update(ordered_date=timezone.now() - timedelta(hours=3))
        legacy = VendorPayout.objects.create(
            vendor=self.vendor, amount=Decimal("250.00"), gross_sales=Decimal("250.00"),
            reference="legacy02", payout_period_start=self.start, payout_period_end=self.end,
        )
        VendorPayout.objects.filter(pk=legacy.pk).update(created_at=timezone.now() - timedelta(hours=2))
        self.mark_paid(legacy)

        self.sale("400.00")  # sold and completed after that payout
        topup = get_vendor_earnings(self.vendor, self.start, self.end)["payout"]
        self.assertNotEqual(topup.pk, legacy.pk)
        self.assertEqual(topup.amount, Decimal("400.00"))  # the 250 is not paid again
        self.assertFalse(topup.paid)
