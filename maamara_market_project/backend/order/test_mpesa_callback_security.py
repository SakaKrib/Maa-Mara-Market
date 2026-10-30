from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from order.models import CheckoutSession
from vendorDashboard.models import VendorPayout
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin

STK_URL = "/api/mpesa/stk-callback/"


def success_body(checkout_request_id, amount="100.00"):
    return {"Body": {"stkCallback": {
        "CheckoutRequestID": checkout_request_id, "ResultCode": 0,
        "CallbackMetadata": {"Item": [
            {"Name": "Amount", "Value": float(amount)},
            {"Name": "MpesaReceiptNumber", "Value": "FAKE123456"},
        ]},
    }}}


class StkCallbackSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.session = CheckoutSession.objects.create(
            payment_method="M-Pesa", amount=Decimal("100.00"), status="payment_pending",
            mpesa_checkout_request_id="ws_CO_TEST_1",
            expires_at=timezone.now() + timedelta(hours=1),
        )

    @patch("order.Mpesa.mpesaCheckout.materialize_paid_checkout")
    @patch("order.Mpesa.mpesaCheckout.stk_query_confirms", return_value=False)
    def test_forged_success_callback_is_not_trusted(self, _query, materialize):
        response = self.client.post(STK_URL, success_body("ws_CO_TEST_1"), format="json")
        self.assertEqual(response.status_code, 200)
        materialize.assert_not_called()
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, "payment_pending")
        self.assertIsNone(self.session.order_id)

    @override_settings(MPESA_CALLBACK_TOKEN="s3cret")
    @patch("order.Mpesa.mpesaCheckout.stk_query_confirms", return_value=True)
    def test_wrong_or_missing_token_is_rejected_when_configured(self, query):
        self.assertEqual(self.client.post(STK_URL, success_body("ws_CO_TEST_1"), format="json").status_code, 403)
        self.assertEqual(self.client.post(STK_URL + "?token=nope", success_body("ws_CO_TEST_1"), format="json").status_code, 403)
        query.assert_not_called()

    @override_settings(MPESA_CALLBACK_TOKEN="s3cret")
    @patch("order.Mpesa.mpesaCheckout.stk_query_confirms", return_value=False)
    def test_correct_token_passes_the_gate_but_still_needs_safaricom_confirmation(self, query):
        response = self.client.post(STK_URL + "?token=s3cret", success_body("ws_CO_TEST_1"), format="json")
        self.assertEqual(response.status_code, 200)
        query.assert_called_once()


class QueryHelperTests(TestCase):
    @patch("order.Mpesa.callback_security.requests.post")
    @patch("order.Mpesa.mpesaView.get_mpesa_access_token", return_value="tok")
    def test_confirms_only_on_result_code_zero(self, _tok, post):
        from order.Mpesa.callback_security import stk_query_confirms

        config = {"shortcode": "174379", "passkey": "k", "stk_url": "https://x/mpesa/stkpush/v1/processrequest"}
        with patch.dict("django.conf.settings.PAYMENT_GATEWAYS", {"mpesa": {"stk_push": config}}, clear=False):
            post.return_value.json.return_value = {"ResultCode": "0"}
            self.assertTrue(stk_query_confirms("abc"))
            self.assertIn("stkpushquery/v1/query", post.call_args[0][0])
            post.return_value.json.return_value = {"ResultCode": "1032"}
            self.assertFalse(stk_query_confirms("abc"))
            post.side_effect = __import__("requests").RequestException("down")
            self.assertFalse(stk_query_confirms("abc"))  # fails closed


class PayoutCallbackSecurityTests(PayoutTestMixin, TestCase):
    @override_settings(MPESA_CALLBACK_TOKEN="s3cret")
    def test_b2c_result_without_token_cannot_mark_a_payout_paid(self):
        payout = self.make_payout("MOBILE_MONEY")
        VendorPayout.objects.filter(pk=payout.pk).update(mpesa_conversation_id="AG_1")
        body = {"Result": {"ConversationID": "AG_1", "ResultCode": 0, "TransactionID": "TX1"}}
        response = APIClient().post("/mpesa/result/", body, format="json")
        self.assertEqual(response.status_code, 403)
        payout.refresh_from_db()
        self.assertFalse(payout.paid)
