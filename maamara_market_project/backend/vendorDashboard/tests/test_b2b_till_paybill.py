import json
from unittest import mock

from django.test import TestCase
from rest_framework.test import APIClient

from vendorDashboard.models import VendorPayout
from vendorDashboard.payout.services import payment_processors as pp
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin

B2B_CFG = {
    "url": "https://sandbox.example/mpesa/b2b/v1/paymentrequest",
    "initiator_name": "init", "short_code": "123456", "initiator_password": "pw",
    "certificate_path": "/x.cer",
    "result_url": "https://h/mpesa/result", "timeout_url": "https://h/mpesa/timeout",
    "till_result_url": "https://h/mpesa/b2b/till/result",
    "till_timeout_url": "https://h/mpesa/b2b/till/timeout",
    "paybill_result_url": "https://h/mpesa/b2b/paybill/result",
    "paybill_timeout_url": "https://h/mpesa/b2b/paybill/timeout",
}


class B2BDestinationRoutingTests(PayoutTestMixin, TestCase):
    def send(self, vendor_kwargs):
        payout = self.make_payout("MOBILE_MONEY")
        for key, value in vendor_kwargs.items():
            setattr(payout.vendor, key, value)
        payout.vendor.save()
        fake = mock.Mock()
        fake.raise_for_status.return_value = None
        fake.json.return_value = {
            "ResponseCode": "0", "OriginatorConversationID": "orig-1", "ConversationID": "conv-1",
            "ResponseDescription": "accepted",
        }
        with mock.patch.object(pp, "get_mpesa_token", return_value="tok"), \
                mock.patch.object(pp, "generate_security_credential", return_value="cred"), \
                mock.patch.object(pp.requests, "post", return_value=fake) as post:
            result = pp.call_mpesa_payout(payout.vendor, payout.amount, {"b2b": B2B_CFG, "b2c": {}}, payout=payout)
        return result, post

    def test_till_uses_buy_goods_with_receiver_type_4_and_till_callbacks(self):
        result, post = self.send({"mpesa_type": "TILL", "mpesa_till": "5123456"})
        self.assertTrue(result["success"], result)
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["CommandID"], "BusinessBuyGoods")
        self.assertEqual(payload["RecieverIdentifierType"], "4")
        self.assertEqual(payload["PartyB"], "5123456")
        self.assertLessEqual(len(payload["AccountReference"]), 13)
        self.assertEqual(payload["ResultURL"], B2B_CFG["till_result_url"])
        self.assertEqual(payload["QueueTimeOutURL"], B2B_CFG["till_timeout_url"])

    def test_paybill_uses_pay_bill_with_account_and_paybill_callbacks(self):
        result, post = self.send({
            "mpesa_type": "LIPA_NA_MPESA", "mpesa_paybill": "888880", "mpesa_paybill_account": "ACC-77",
        })
        self.assertTrue(result["success"], result)
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["CommandID"], "BusinessPayBill")
        self.assertEqual(payload["RecieverIdentifierType"], "4")
        self.assertEqual(payload["PartyB"], "888880")
        self.assertEqual(payload["AccountReference"], "ACC-77")
        self.assertEqual(payload["ResultURL"], B2B_CFG["paybill_result_url"])

    def test_paybill_without_or_with_overlong_account_is_rejected_before_sending(self):
        for account in ("", "X" * 14):
            result, post = self.send({
                "mpesa_type": "LIPA_NA_MPESA", "mpesa_paybill": "888880", "mpesa_paybill_account": account,
            })
            self.assertFalse(result["success"])
            post.assert_not_called()

    def test_phone_payout_still_uses_b2c_not_b2b(self):
        payout = self.make_payout("MOBILE_MONEY")
        payout.vendor.mpesa_type = "PHONE"
        payout.vendor.mpesa_number = "254700000000"
        payout.vendor.save()
        with mock.patch.object(pp, "call_mpesa_b2c", return_value={"success": True}) as b2c, \
                mock.patch.object(pp, "call_mpesa_b2b") as b2b:
            pp.call_mpesa_payout(payout.vendor, payout.amount, {}, payout=payout)
        b2c.assert_called_once()
        b2b.assert_not_called()

    def test_till_result_callback_marks_paid_and_records_receiver_name(self):
        payout = self.make_payout("MOBILE_MONEY")
        payout.vendor.mpesa_type = "TILL"
        payout.vendor.mpesa_till = "5123456"
        payout.vendor.save()
        payout.mpesa_conversation_id = "conv-9"
        payout.mpesa_originator_conversation_id = "orig-9"
        payout.save()
        body = {"Result": {
            "ResultType": 0, "ResultCode": 0, "ResultDesc": "ok", "ConversationID": "conv-9",
            "OriginatorConversationID": "orig-9", "TransactionID": "TXN12345",
            "ResultParameters": {"ResultParameter": [
                {"Key": "ReceiverPartyPublicName", "Value": "5123456 - Mama Shop"},
            ]},
        }}
        response = APIClient().post("/mpesa/b2b/till/result", json.dumps(body), content_type="application/json")
        self.assertEqual(response.status_code, 200, response.content[:200])
        payout = VendorPayout.objects.get(pk=payout.pk)
        self.assertTrue(payout.paid)
        from order.models import Transaction
        txn = Transaction.objects.get(mpesa_receipt_number="TXN12345")
        self.assertEqual(txn.transaction_type, "B2B")
        self.assertEqual(txn.raw_data["receiver_party_public_name"], "5123456 - Mama Shop")
        self.assertEqual(txn.raw_data["destination_type"], "TILL")
