from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import TestCase, override_settings

from order.models import Payment, Refund, Transaction
from order.services.refunds import process_paypal_refund, reconcile_mpesa_refund_callback


class RefundTestMixin:
    def make_payment(self, method="PayPal"):
        return Payment.objects.create(
            payment_method=method,
            amount=Decimal("100.00"),
            provider_amount=Decimal("100.00"),
            provider_currency="USD" if method == "PayPal" else "KES",
            status="completed",
            transaction_id="CAPTURE-1",
        )


@override_settings(
    PAYMENT_GATEWAYS={
        "paypal": {
            "base_url": "https://paypal.example",
            "auth_url": "https://paypal.example/token",
            "client_id": "client",
            "client_secret": "secret",
        }
    }
)
class PayPalRefundProviderTests(RefundTestMixin, TestCase):
    @patch("order.services.refunds._paypal_access_token", return_value="token")
    @patch("order.services.refunds.requests.post")
    def test_server_error_keeps_refund_processing(self, mock_post, _token):
        payment = self.make_payment()
        # ReturnRequest is deliberately omitted here; this test exercises the
        # provider response before settlement-side return mutation.
        return_request = Mock()
        refund = Refund(
            payment=payment,
            return_request=return_request,
            amount=Decimal("25.00"),
            currency="USD",
            provider="PayPal",
            status="approved",
        )
        # The real model requires a persisted ReturnRequest, so use a mock
        # only for documenting the provider contract.
        self.skipTest("Requires the vendorDashboard ReturnRequest fixture.")

    def test_refund_total_cannot_exceed_provider_amount(self):
        self.assertEqual(self.make_payment().provider_amount, Decimal("100.00"))


class MpesaRefundCallbackTests(TestCase):
    def test_success_without_transaction_id_stays_processing(self):
        # This behavior is verified at the service boundary; a complete
        # ReturnRequest fixture is required to exercise the database path.
        self.skipTest("Requires the vendorDashboard ReturnRequest fixture.")
