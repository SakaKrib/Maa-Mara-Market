from decimal import Decimal
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from order.models import Payment, Transaction
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin


class AccountsLedgerTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username=f"admin-{uuid4().hex[:8]}", password="x", is_staff=True
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_summary_loads_and_counts_paid_payments_and_paid_payouts(self):
        Payment.objects.create(
            amount=Decimal("500.00"), merchant_reference=uuid4().hex, status="PAID",
            payment_method="MPESA", paid_at=timezone.now(),
        )
        Payment.objects.create(  # unpaid payments are not income
            amount=Decimal("900.00"), merchant_reference=uuid4().hex, status="PENDING",
        )
        payout = self.make_payout("MOBILE_MONEY")
        payout.paid = True
        payout.paid_at = timezone.now()
        payout.save(update_fields=["paid", "paid_at"])

        response = self.client.get("/api/dashboard/summary/")
        self.assertEqual(response.status_code, 200, response.content)
        cards = response.json()["summary_cards"]
        self.assertEqual(cards["income"]["amount"], 500.0)
        self.assertEqual(cards["vendor_payments"]["amount"], 1000.0)
        self.assertEqual(cards["cashbook"]["amount"], -500.0)
        # The paid payout is booked under Vendors without anyone keying it in.
        self.assertEqual(response.json()["payments_for_month"]["Vendors"], 1000.0)

    def test_paid_payout_appears_once_in_accounts_history(self):
        payout = self.make_payout("MOBILE_MONEY")
        payout.paid = True
        payout.paid_at = timezone.now()
        payout.mpesa_transaction_id = "QWE123"
        payout.save(update_fields=["paid", "paid_at", "mpesa_transaction_id"])
        Transaction.objects.create(  # the provider's own row for the same payout
            transaction_type="B2C", payment_method="mpesa", amount=payout.amount,
            payout=payout, vendor=payout.vendor, mpesa_receipt_number="QWE123",
            status="Completed", raw_data={},
        )
        rows = self.client.get("/api/transactions/history/").json()["results"]
        settlements = [row for row in rows if row["source"] == "vendor_settlement"]
        self.assertEqual(len(settlements), 1)
        self.assertEqual(sum(1 for row in rows if row["txid"] == "QWE123"), 1)

    def test_manual_entries_can_be_edited_and_deleted(self):
        created = self.client.post(
            "/api/transactions/", {"category": "rent", "payment_method": "mpesa", "amount": "250"}, format="json"
        )
        self.assertEqual(created.status_code, 201, created.content)
        tx_id = created.json()["id"]
        edited = self.client.patch(
            f"/api/transactions/{tx_id}/", {"amount": "300"}, format="json"
        )
        self.assertEqual(edited.status_code, 200, edited.content)
        deleted = self.client.delete(f"/api/transactions/{tx_id}/delete/")
        self.assertEqual(deleted.status_code, 200, deleted.content)

    def test_dashboard_transactions_name_who_paid_and_do_not_count_payouts_as_revenue(self):
        customer = get_user_model().objects.create_user(username="jane", password="x", first_name="Jane", last_name="W")
        payment = Payment.objects.create(
            amount=Decimal("700.00"), merchant_reference=uuid4().hex, status="PAID", user=customer,
        )
        Transaction.objects.create(
            transaction_type="C2B", payment_method="pesapal", amount=Decimal("700.00"),
            payment=payment, status="completed", raw_data={},
        )
        payout = self.make_payout("MOBILE_MONEY")
        Transaction.objects.create(
            transaction_type="B2C", payment_method="mpesa", amount=Decimal("1000.00"),
            payout=payout, vendor=payout.vendor, mpesa_receipt_number="R1", status="Completed", raw_data={},
        )
        body = self.client.get("/api/admin-transactions/").json()
        self.assertEqual(body["summary"]["total_revenue"], 700.0)
        by_source = {row["source"]: row for row in body["results"]}
        self.assertEqual(by_source["customer_payment"]["payer_name"], "Jane W")
        self.assertEqual(by_source["customer_payment"]["direction"], "in")
        self.assertEqual(by_source["vendor_payout"]["direction"], "out")
        self.assertTrue(by_source["vendor_payout"]["payer_name"].startswith("Paid to"))


class PaymentChannelTests(PayoutTestMixin, TestCase):
    """Accounts shows M-Pesa and PayPal activity separately."""

    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username=f"admin-{uuid4().hex[:8]}", password="x", is_staff=True
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def pay(self, amount, method="UNKNOWN", gateway="PESAPAL", transaction_method=None):
        payment = Payment.objects.create(
            amount=Decimal(amount), merchant_reference=uuid4().hex, status="PAID",
            payment_method=method, payment_gateway=gateway, paid_at=timezone.now(),
        )
        if transaction_method:
            Transaction.objects.create(
                payment=payment, transaction_type="PayPal" if transaction_method == "paypal" else "C2B",
                payment_method=transaction_method, amount=Decimal(amount), raw_data={},
                status="Completed", mpesa_receipt_number=uuid4().hex[:10] if transaction_method == "mpesa" else None,
            )
        return payment

    def accounts(self):
        response = self.client.get("/api/dashboard/summary/")
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["accounts"]

    def test_payments_are_split_by_channel(self):
        self.pay("500.00", method="MPESA", gateway="MPESA")
        self.pay("300.00", method="PAYPAL", gateway="PAYPAL")
        accounts = self.accounts()
        self.assertEqual(accounts["mpesa"]["amount"], 500.0)
        self.assertEqual(accounts["paypal"]["amount"], 300.0)

    def test_older_payments_are_classified_from_their_recorded_transaction(self):
        # The till (C2B) flow used to leave the payment as UNKNOWN.
        self.pay("700.00", transaction_method="mpesa")
        self.pay("200.00", transaction_method="paypal")
        accounts = self.accounts()
        self.assertEqual(accounts["mpesa"]["amount"], 700.0)
        self.assertEqual(accounts["paypal"]["amount"], 200.0)

    def test_a_payment_with_several_transactions_is_counted_once(self):
        payment = self.pay("400.00", transaction_method="paypal")
        for _ in range(2):  # PayPal records one transaction per vendor
            Transaction.objects.create(
                payment=payment, transaction_type="PayPal", payment_method="paypal",
                amount=Decimal("200.00"), raw_data={}, status="Completed",
                paypal_transaction_id=uuid4().hex[:10],
            )
        self.assertEqual(self.accounts()["paypal"]["amount"], 400.0)

    def test_unmatched_transactions_are_reported_not_added_to_income(self):
        # A PayPal capture (USD) recorded with no payment, saved once per vendor.
        for _ in range(2):
            Transaction.objects.create(
                transaction_type="PayPal", payment_method="paypal", amount=Decimal("10.00"),
                raw_data={}, status="completed", paypal_transaction_id="CAP1",
            )
        self.pay("250.00", method="PAYPAL", gateway="PAYPAL")
        card = self.accounts()["paypal"]
        self.assertEqual(card["amount"], 250.0)  # confirmed payments only
        self.assertEqual(card["payments"], 1)
        self.assertEqual(card["unmatched"]["count"], 1)  # the capture, counted once
        self.assertEqual(card["unmatched"]["amount"], 10.0)
        self.assertEqual(card["unmatched"]["currency"], "USD")
        self.assertEqual(card["unmatched"]["reasons"]["no_payment"], 1)

    def test_transaction_whose_payment_is_not_confirmed_is_flagged_with_the_reason(self):
        pending = Payment.objects.create(
            amount=Decimal("500.00"), merchant_reference=uuid4().hex, status="PENDING",
            payment_method="MPESA", payment_gateway="MPESA",
        )
        Transaction.objects.create(
            transaction_type="C2B", payment_method="mpesa", amount=Decimal("500.00"), raw_data={},
            status="Completed", payment=pending, mpesa_receipt_number="RCPT1",
        )
        card = self.accounts()["mpesa"]
        self.assertEqual(card["amount"], 0.0)
        self.assertEqual(card["unmatched"]["reasons"]["payment_not_confirmed"], 1)
