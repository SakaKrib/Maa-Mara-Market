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


class MpesaDestinationFieldTests(PayoutTestMixin, TestCase):
    def labels(self, **vendor_fields):
        payout = self.make_payout("MOBILE_MONEY")
        for key, value in vendor_fields.items():
            setattr(payout.vendor, key, value)
        payout.vendor.save()
        return [f["label"] for f in build_payout_review(payout)["destination"]["fields"]]

    def test_paybill_shows_only_paybill_and_account_number(self):
        labels = self.labels(mpesa_type="LIPA_NA_MPESA", mpesa_paybill="400200", mpesa_paybill_account="ACC-1")
        self.assertEqual(labels, ["Paybill number", "Paybill account number"])

    def test_till_shows_only_the_till_number(self):
        labels = self.labels(mpesa_type="TILL", mpesa_till="123456")
        self.assertEqual(labels, ["Buy Goods / Till number"])

    def test_phone_shows_only_the_phone_number(self):
        labels = self.labels(mpesa_type="PHONE", mpesa_number="0712345678")
        self.assertEqual(labels, ["M-Pesa phone number"])


class MpesaB2BConfigTests(PayoutTestMixin, TestCase):
    def test_b2b_url_is_derived_from_the_b2c_host_when_not_set(self):
        import os
        from unittest.mock import patch

        from project01.settings import _default_mpesa_b2b_url

        with patch.dict(os.environ, {"MPESA_URL": "https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest"}):
            self.assertEqual(
                _default_mpesa_b2b_url(),
                "https://sandbox.safaricom.co.ke/mpesa/b2b/v1/paymentrequest",
            )

    def test_missing_settings_are_named_with_their_environment_variable(self):
        from django.test import override_settings

        gateways = {"mpesa": {"b2c": {}, "b2b": {}}}
        with override_settings(PAYMENT_GATEWAYS=gateways):
            from vendorDashboard.payout.services.payout_review import _mpesa_config_problems

            message = _mpesa_config_problems("TILL")[0]
        self.assertIn("MPESA_B2B_RESULT_URL", message)
        self.assertIn("MPESA_B2B_TIMEOUT_URL", message)
