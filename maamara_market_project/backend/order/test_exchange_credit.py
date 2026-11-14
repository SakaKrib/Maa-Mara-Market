from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from ReactSerializers.models import Item
from order.credits import (
    consume_credit, credit_balance, issue_exchange_credit, quote_credit,
)
from order.models import ExchangeCredit, Order, OrderItem, Payment
from vendorDashboard.models import ReturnRequest, VendorAdjustment
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin


class ExchangeCreditTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.vendor = self.make_vendor("MOBILE_MONEY")
        self.customer = User.objects.create_user("cust", "c@example.com", "pw")
        self.other = User.objects.create_user("other", "o@example.com", "pw")

    def make_return(self, price="500.00", customer=None, visitor_id=None):
        item = Item.objects.create(
            name=f"Item {uuid4().hex[:6]}", description="x", created_by=self.vendor.user,
            vendor=self.vendor, price=Decimal(price),
        )
        payment = Payment.objects.create(amount=Decimal(price), merchant_reference=uuid4().hex, status="PAID")
        order = Order.objects.create(user=customer, payment=payment, ordered_date=timezone.now(), status="COMPLETED")
        line = OrderItem.objects.create(
            order=order, item=item, user=customer, price_at_purchase=Decimal(price), quantity=1
        )
        adjustment = VendorAdjustment.objects.create(
            vendor=self.vendor, order_item=line, amount=Decimal(price), reason="Exchange", customer_preference="exchange"
        )
        return ReturnRequest.objects.create(
            item=line, customer=customer, visitor_id=visitor_id, vendor_adjustment=adjustment,
            customer_preference="exchange", status="approved_exchange",
        )

    def test_credit_is_created_once_from_the_server_side_amount(self):
        rr = self.make_return("500.00", self.customer)
        first = issue_exchange_credit(rr)
        second = issue_exchange_credit(rr)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(first.amount, Decimal("500.00"))
        self.assertEqual(credit_balance(self.customer, None), Decimal("500.00"))
        self.assertEqual(credit_balance(self.other, None), Decimal("0.00"))

    def test_partial_credit_leaves_a_balance_to_pay(self):
        issue_exchange_credit(self.make_return("500.00", self.customer))
        quote = quote_credit(self.customer, None, "800.00")
        self.assertEqual((quote.applied, quote.charge), (Decimal("500.00"), Decimal("300.00")))
        self.assertFalse(quote.covers_all)

    def test_credit_that_covers_the_whole_order_needs_no_payment(self):
        issue_exchange_credit(self.make_return("500.00", self.customer))
        quote = quote_credit(self.customer, None, "350.00")
        self.assertEqual((quote.applied, quote.charge), (Decimal("350.00"), Decimal("0.00")))
        self.assertTrue(quote.covers_all)

    def test_no_credit_changes_nothing(self):
        quote = quote_credit(self.customer, None, "800.00")
        self.assertEqual((quote.applied, quote.charge), (Decimal("0.00"), Decimal("800.00")))

    def test_mpesa_charge_is_rounded_up_to_whole_shillings(self):
        issue_exchange_credit(self.make_return("500.40", self.customer))
        quote = quote_credit(self.customer, None, "800.00", "M-Pesa")
        self.assertEqual(quote.charge, Decimal("300"))
        self.assertEqual(quote.applied + quote.charge, Decimal("800.00"))

    def test_expired_credit_is_ignored(self):
        credit = issue_exchange_credit(self.make_return("500.00", self.customer))
        ExchangeCredit.objects.filter(pk=credit.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(credit_balance(self.customer, None), Decimal("0.00"))

    def test_spending_uses_oldest_credit_first_and_cannot_overspend(self):
        a = issue_exchange_credit(self.make_return("200.00", self.customer))
        b = issue_exchange_credit(self.make_return("300.00", self.customer))
        spent = consume_credit(self.customer, None, Decimal("350.00"))
        self.assertEqual(spent, Decimal("350.00"))
        a.refresh_from_db(); b.refresh_from_db()
        self.assertEqual((a.used_amount, b.used_amount), (Decimal("200.00"), Decimal("150.00")))
        self.assertEqual(consume_credit(self.customer, None, Decimal("999.00")), Decimal("150.00"))
        self.assertEqual(credit_balance(self.customer, None), Decimal("0.00"))

    def test_visitor_credit_belongs_to_that_visitor_only(self):
        issue_exchange_credit(self.make_return("500.00", None, visitor_id="vis-1"))
        self.assertEqual(credit_balance(None, "vis-1"), Decimal("500.00"))
        self.assertEqual(credit_balance(None, "vis-2"), Decimal("0.00"))
        self.assertEqual(credit_balance(self.customer, "vis-1"), Decimal("0.00"))
