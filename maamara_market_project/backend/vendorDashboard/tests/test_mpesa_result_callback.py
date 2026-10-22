import json
from decimal import Decimal
from unittest.mock import patch

from django.test import Client, TestCase

from order.models import Transaction
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin


def result_payload(conversation_id="AG_123", originator="OR_123", code=0, desc="The service request is processed successfully.", receipt="QWE123RTY"):
    result = {
        "ResultType": 0, "ResultCode": code, "ResultDesc": desc,
        "OriginatorConversationID": originator, "ConversationID": conversation_id,
    }
    if receipt is not None:
        result["TransactionID"] = receipt
    return {"Result": result}


@patch("vendorDashboard.calback.create_vendor_payout_invoice")
@patch("vendorDashboard.calback.broadcast_event")
class MpesaResultCallbackTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.client = Client()
        self.payout = self.make_payout("MOBILE_MONEY")
        self.payout.mpesa_conversation_id = "AG_123"
        self.payout.mpesa_originator_conversation_id = "OR_123"
        self.payout.save(update_fields=["mpesa_conversation_id", "mpesa_originator_conversation_id"])

    def post(self, payload):
        return self.client.post("/mpesa/result", data=json.dumps(payload), content_type="application/json")

    def test_successful_result_marks_payout_paid_and_notifies_the_screen(self, broadcast, invoice):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.post(result_payload())
        self.assertEqual(response.status_code, 200)
        self.payout.refresh_from_db()
        self.assertTrue(self.payout.paid)
        self.assertIsNotNone(self.payout.paid_at)
        self.assertEqual(self.payout.mpesa_transaction_id, "QWE123RTY")
        self.assertEqual(self.payout.mpesa_result_code, 0)
        self.assertEqual(Transaction.objects.filter(mpesa_receipt_number="QWE123RTY", payout=self.payout).count(), 1)
        invoice.assert_called_once()
        broadcast.assert_called_once()
        data = broadcast.call_args.kwargs["data"]
        self.assertEqual((data["reference"], data["status"], data["paid"]), (self.payout.reference, "SUCCESS", True))

    def test_replayed_result_does_not_double_process(self, broadcast, invoice):
        self.post(result_payload())
        first_paid_at = type(self.payout).objects.get(pk=self.payout.pk).paid_at
        self.assertEqual(self.post(result_payload()).status_code, 200)
        self.payout.refresh_from_db()
        self.assertEqual(self.payout.paid_at, first_paid_at)
        self.assertEqual(Transaction.objects.filter(mpesa_receipt_number="QWE123RTY").count(), 1)

    def test_failed_result_is_recorded_and_payout_stays_unpaid(self, broadcast, invoice):
        response = self.post(result_payload(code=2001, desc="The initiator information is invalid.", receipt=None))
        self.assertEqual(response.status_code, 200)
        self.payout.refresh_from_db()
        self.assertFalse(self.payout.paid)
        self.assertEqual(self.payout.mpesa_result_code, 2001)
        self.assertIn("initiator information", self.payout.mpesa_result_desc)
        invoice.assert_not_called()

    def test_unmatched_result_is_acknowledged_without_changes(self, broadcast, invoice):
        response = self.post(result_payload(conversation_id="AG_OTHER", originator="OR_OTHER"))
        self.assertEqual(response.status_code, 200)
        self.payout.refresh_from_db()
        self.assertFalse(self.payout.paid)

    def test_success_without_a_receipt_is_not_trusted(self, broadcast, invoice):
        self.post(result_payload(receipt=None))
        self.payout.refresh_from_db()
        self.assertFalse(self.payout.paid)
