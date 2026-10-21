from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone

from ReactSerializers.models import Item
from order.models import Order, OrderItem, OrderItemFulfillment, Payment
from vendorDashboard.models import PayoutAllocation, PayoutBatch, VendorPayout
from vendorDashboard.payout.services import payout_guard, weekly_payouts as weekly
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin


class WeekBoundsTests(SimpleTestCase):
    def test_cutoff_is_monday_midnight_nairobi(self):
        monday, sunday, cutoff = weekly.week_bounds(date(2026, 10, 12))
        self.assertEqual(sunday, date(2026, 10, 18))
        local = cutoff.astimezone(weekly.PAYOUT_TZ)
        self.assertEqual((local.date(), local.hour, local.minute), (date(2026, 10, 19), 0, 0))
        self.assertTrue(timezone.is_aware(cutoff))


@override_settings(WEEKLY_PAYOUTS_ENABLED=True, PAYOUT_TWO_PERSON_THRESHOLD=10**9)
class WeeklyBatchTests(PayoutTestMixin, TestCase):
    week_start = date(2026, 10, 5)

    def setUp(self):
        self.admin_a = User.objects.create_user("wa", "wa@example.com", "pw", is_staff=True)
        self.admin_b = User.objects.create_user("wb", "wb@example.com", "pw", is_staff=True)
        self.vendor = self.make_vendor()
        self.vendor_user = self.vendor.user
        self.cutoff = weekly.week_bounds(self.week_start)[2]

    def make_line(self, price="100.00", eligible_at=None, status="COMPLETED", hold="", payment_status="PAID", vendor=None):
        vendor = vendor or self.vendor
        item = Item.objects.create(
            name=f"Item {uuid4().hex[:8]}", description="x", created_by=vendor.user,
            vendor=vendor, price=Decimal(price),
        )
        payment = Payment.objects.create(amount=Decimal(price), merchant_reference=uuid4().hex, status=payment_status)
        order = Order.objects.create(user=vendor.user, payment=payment, ordered_date=timezone.now(), status="COMPLETED")
        line = OrderItem.objects.create(
            order=order, item=item, user=vendor.user, price_at_purchase=Decimal(price), quantity=1,
        )
        OrderItemFulfillment.objects.create(
            order_item=line, status=status, hold_reason=hold,
            payout_eligible_at=eligible_at or (self.cutoff - timedelta(hours=1)),
        )
        return line

    def test_eligible_item_is_allocated_once_and_batch_is_idempotent(self):
        line = self.make_line()
        batch, created = weekly.create_batch(self.admin_a, self.week_start)
        again, created_again = weekly.create_batch(self.admin_a, self.week_start)
        self.assertTrue(created)
        self.assertFalse(created_again)
        self.assertEqual(batch.pk, again.pk)
        self.assertEqual(PayoutAllocation.objects.filter(order_item=line).count(), 1)
        payout = VendorPayout.objects.get(vendor=self.vendor, payout_period_start=self.week_start)
        self.assertEqual(payout.amount, Decimal("100.00"))

    def test_item_eligible_after_cutoff_is_left_for_the_next_week(self):
        self.make_line(eligible_at=self.cutoff + timedelta(minutes=1))
        batch, _ = weekly.create_batch(self.admin_a, self.week_start)
        self.assertEqual(batch.allocations.count(), 0)

    def test_late_item_is_carried_into_the_next_batch_not_lost(self):
        line = self.make_line(eligible_at=self.cutoff + timedelta(hours=5))
        weekly.create_batch(self.admin_a, self.week_start)
        next_batch, _ = weekly.create_batch(self.admin_a, self.week_start + timedelta(days=7))
        self.assertEqual(next_batch.allocations.filter(order_item=line).count(), 1)

    def test_held_unverified_and_returned_items_are_not_paid(self):
        self.make_line(hold="issue reported")
        self.make_line(payment_status="PENDING")
        returned = self.make_line()
        OrderItem.objects.filter(pk=returned.pk).update(is_returned=True)
        self.make_line(status="AWAITING_CONFIRMATION")
        batch, _ = weekly.create_batch(self.admin_a, self.week_start)
        self.assertEqual(batch.allocations.count(), 0)

    def test_inactive_vendor_items_are_carried_forward(self):
        self.make_line()
        self.vendor.is_active = False
        self.vendor.save(update_fields=["is_active"])
        batch, _ = weekly.create_batch(self.admin_a, self.week_start)
        self.assertEqual(batch.allocations.count(), 0)
        self.assertTrue(batch.skipped)

    def test_week_must_have_ended_and_start_on_monday(self):
        with self.assertRaises(weekly.WeeklyPayoutError):
            weekly.create_batch(self.admin_a, date(2026, 10, 6))
        future = timezone.now().astimezone(weekly.PAYOUT_TZ).date()
        future = future - timedelta(days=future.weekday())
        with self.assertRaises(weekly.WeeklyPayoutError):
            weekly.create_batch(self.admin_a, future)

    @override_settings(WEEKLY_PAYOUTS_ENABLED=False)
    def test_disabled_flag_blocks_batches(self):
        with self.assertRaises(weekly.WeeklyPayoutError):
            weekly.create_batch(self.admin_a, self.week_start)

    def test_two_different_admins_must_audit_and_approve(self):
        self.make_line()
        batch, _ = weekly.create_batch(self.admin_a, self.week_start)
        with self.assertRaises(weekly.WeeklyPayoutError):
            weekly.approve_batch(batch.pk, self.admin_b)  # not audited yet
        weekly.audit_batch(batch.pk, self.admin_a)
        with self.assertRaises(weekly.WeeklyPayoutError):
            weekly.approve_batch(batch.pk, self.admin_a)  # same admin
        weekly.approve_batch(batch.pk, self.admin_b)
        batch.refresh_from_db()
        self.assertEqual(batch.status, PayoutBatch.STATUS_APPROVED)

    @patch("vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer")
    def test_payout_cannot_be_sent_until_batch_is_approved(self, bank):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from vendorDashboard.payout.services.vendor_monthly_payout_runner import pay_single_vendor_payout

        bank.return_value = {"success": True}
        self.make_line()
        batch, _ = weekly.create_batch(self.admin_a, self.week_start)
        payout = VendorPayout.objects.get(vendor=self.vendor, payout_period_start=self.week_start)

        def send():
            request = APIRequestFactory().post("/x", {}, format="json")
            force_authenticate(request, user=self.admin_a)
            return pay_single_vendor_payout(request, payout.reference)

        self.assertEqual(send().status_code, 409)
        bank.assert_not_called()
        weekly.audit_batch(batch.pk, self.admin_a)
        weekly.approve_batch(batch.pk, self.admin_b)
        self.assertEqual(send().status_code, 202)
        bank.assert_called_once()

    def test_monthly_earnings_skip_items_owned_by_weekly_batches(self):
        from vendorDashboard.views import get_vendor_earnings

        self.make_line()
        today = timezone.now().date()
        start, end = today.replace(day=1), today
        result = get_vendor_earnings(self.vendor, start, end)
        self.assertEqual(result["payout"].amount, Decimal("0.00"))
        with override_settings(WEEKLY_PAYOUTS_ENABLED=False):
            result = get_vendor_earnings(self.vendor, start, end)
            self.assertEqual(result["payout"].amount, Decimal("100.00"))
