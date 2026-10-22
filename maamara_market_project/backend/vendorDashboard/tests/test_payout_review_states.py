from django.test import TestCase

from vendorDashboard.payout.services.payout_review import build_payout_review
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin


class PayoutReviewStateTests(PayoutTestMixin, TestCase):
    def test_submitted_mpesa_payout_is_reported_as_awaiting_confirmation(self):
        payout = self.make_payout("MOBILE_MONEY")
        payout.mpesa_conversation_id = "AG_1"
        payout.save(update_fields=["mpesa_conversation_id"])
        review = build_payout_review(payout)
        self.assertEqual(review["state"], "submitted")
        self.assertFalse(review["can_pay"])
        self.assertFalse(review["paid"])

    def test_provider_failure_is_explained_and_payout_can_be_retried_state(self):
        payout = self.make_payout("MOBILE_MONEY")
        payout.mpesa_conversation_id = "AG_2"
        payout.mpesa_result_code = 2001
        payout.mpesa_result_desc = "The initiator information is invalid."
        payout.save(update_fields=["mpesa_conversation_id", "mpesa_result_code", "mpesa_result_desc"])
        review = build_payout_review(payout)
        self.assertNotEqual(review["state"], "submitted")
        self.assertIn("initiator information is invalid", review["provider_failure"])

    def test_paid_payout_exposes_receipt(self):
        payout = self.make_payout("MOBILE_MONEY")
        payout.paid = True
        payout.mpesa_transaction_id = "QWE123RTY"
        payout.mpesa_result_code = 0
        payout.save(update_fields=["paid", "mpesa_transaction_id", "mpesa_result_code"])
        review = build_payout_review(payout)
        self.assertEqual(review["state"], "paid")
        self.assertEqual(review["receipt"], "QWE123RTY")
        self.assertEqual(review["provider_failure"], "")
