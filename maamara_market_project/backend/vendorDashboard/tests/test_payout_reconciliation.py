from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from vendorDashboard.models import Vendor, VendorPayout
from vendorDashboard.payout.services.kcb_payouts import reconcile_kcb_payout
from vendorDashboard.payout.services.vendor_monthly_payout_runner import pay_single_vendor_payout


class PayoutTestMixin:
    def make_vendor(self, payment_method="BANK_TRANSFER"):
        user = User.objects.create_user(
            username=f"vendor_{User.objects.count()}",
            email=f"vendor{User.objects.count()}@example.com",
            password="test-password",
            is_staff=False,
        )
        return Vendor.objects.create(
            user=user,
            surname_name="Test",
            first_name="Vendor",
            phone_number="254700000000",
            username=f"v{user.id}",
            email=user.email,
            id_number=str(10000000 + user.id),
            vendor_code=f"VC{user.id}",
            country="Kenya",
            city="Nairobi",
            address="Test",
            address_2="",
            product_type="Crafts",
            is_food="no",
            product_description="Test products",
            company_name=f"Vendor {user.id}",
            workshop_location="Nairobi",
            payment_method=payment_method,
            bank_account_number="1234567890",
        )

    def make_payout(self, payment_method="BANK_TRANSFER"):
        vendor = self.make_vendor(payment_method)
        return VendorPayout.objects.create(
            vendor=vendor,
            amount=Decimal("1000.00"),
        )


@override_settings(
    PAYMENT_GATEWAYS={
        "kcb": {
            "status_url": "https://kcb.example/status",
            "status_reference_parameter": "transactionReference",
            "auth_url": "https://kcb.example/oauth",
            "client_id": "client",
            "client_secret": "secret",
        }
    }
)
class KCBPayoutReconciliationTests(PayoutTestMixin, TestCase):
    @patch("vendorDashboard.payout.services.kcb_payouts.get_kcb_access_token")
    @patch("vendorDashboard.payout.services.kcb_payouts.requests.get")
    def test_successful_settlement_marks_payout_paid(self, mock_get, mock_token):
        payout = self.make_payout()
        payout.kcb_transaction_reference = "KCB-REF-1"
        payout.kcb_provider_status = "SUBMITTED"
        payout.save(update_fields=["kcb_transaction_reference", "kcb_provider_status"])

        mock_token.return_value = "token"
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {
            "header": {
                "status": "SUCCESS",
                "transactionReference": "KCB-PROVIDER-1",
                "statusDescription": "Settled",
            }
        }
        mock_get.return_value = response

        updated = reconcile_kcb_payout(payout.id)

        self.assertTrue(updated.paid)
        self.assertIsNotNone(updated.paid_at)
        self.assertEqual(updated.kcb_provider_status, "SUCCESS")
        self.assertEqual(updated.kcb_provider_reference, "KCB-PROVIDER-1")

    @patch("vendorDashboard.payout.services.kcb_payouts.get_kcb_access_token")
    @patch("vendorDashboard.payout.services.kcb_payouts.requests.get")
    def test_pending_settlement_does_not_mark_payout_paid(self, mock_get, mock_token):
        payout = self.make_payout()
        payout.kcb_transaction_reference = "KCB-REF-2"
        payout.kcb_provider_status = "SUBMITTED"
        payout.save(update_fields=["kcb_transaction_reference", "kcb_provider_status"])

        mock_token.return_value = "token"
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {"header": {"status": "PENDING"}}
        mock_get.return_value = response

        updated = reconcile_kcb_payout(payout.id)

        self.assertFalse(updated.paid)
        self.assertEqual(updated.kcb_provider_status, "PENDING")


class VendorPayoutSubmissionTests(PayoutTestMixin, TestCase):
    def test_bank_submission_is_accepted_but_not_paid(self):
        payout = self.make_payout()
        factory = APIRequestFactory()
        request = factory.post(f"/api/vendor/payout/{payout.reference}/pay/")
        admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="admin-password",
        )
        force_authenticate(request, user=admin)

        with patch(
            "vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer",
            return_value={
                "success": True,
                "transaction_reference": "KCB-REF-3",
                "settlement_pending": True,
            },
        ) as submit:
            response = pay_single_vendor_payout(request, payout.reference)

        self.assertEqual(response.status_code, 202)
        payout.refresh_from_db()
        self.assertFalse(payout.paid)
        submit.assert_called_once()
        self.assertEqual(submit.call_args.kwargs["payout"].id, payout.id)

    def test_bank_submission_with_existing_pending_reference_is_not_repeated(self):
        payout = self.make_payout()
        payout.kcb_transaction_reference = "KCB-REF-4"
        payout.kcb_provider_status = "SUBMITTED"
        payout.save(update_fields=["kcb_transaction_reference", "kcb_provider_status"])

        factory = APIRequestFactory()
        request = factory.post(f"/api/vendor/payout/{payout.reference}/pay/")
        admin = User.objects.create_superuser(
            username="admin2",
            email="admin2@example.com",
            password="admin-password",
        )
        force_authenticate(request, user=admin)

        with patch(
            "vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer"
        ) as submit:
            response = pay_single_vendor_payout(request, payout.reference)

        self.assertEqual(response.status_code, 409)
        submit.assert_not_called()
