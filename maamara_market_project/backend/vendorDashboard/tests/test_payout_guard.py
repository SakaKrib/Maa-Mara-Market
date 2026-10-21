from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from vendorDashboard.models import PayoutAuditLog, Vendor, VendorPayout
from vendorDashboard.payout.services import payout_guard
from vendorDashboard.payout.services.vendor_monthly_payout_runner import pay_single_vendor_payout
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin


class DestinationFingerprintTests(SimpleTestCase):
    def vendor(self, **kwargs):
        base = dict(
            payment_method="MOBILE_MONEY", mpesa_type="PHONE", mpesa_number="0712345678",
            mpesa_till=None, mpesa_paybill=None, mpesa_paybill_account=None,
            paypal_email=None, bank_name=None, bank_branch=None, bank_account_name=None,
            bank_account_number=None, bank_swift_code=None, bank_iban=None, bank_country=None,
        )
        base.update(kwargs)
        return SimpleNamespace(**base)

    def test_phone_formats_with_same_number_match(self):
        a = payout_guard.destination_fingerprint(self.vendor(mpesa_number="0712345678"))
        b = payout_guard.destination_fingerprint(self.vendor(mpesa_number="+254 712 345 678"))
        self.assertEqual(a, b)

    def test_changing_number_changes_fingerprint(self):
        a = payout_guard.destination_fingerprint(self.vendor(mpesa_number="0712345678"))
        b = payout_guard.destination_fingerprint(self.vendor(mpesa_number="0712345679"))
        self.assertNotEqual(a, b)

    def test_paybill_account_is_part_of_the_destination(self):
        base = dict(mpesa_type="LIPA_NA_MPESA", mpesa_paybill="400200")
        a = payout_guard.destination_fingerprint(self.vendor(mpesa_paybill_account="111", **base))
        b = payout_guard.destination_fingerprint(self.vendor(mpesa_paybill_account="222", **base))
        self.assertNotEqual(a, b)

    def test_unused_fields_of_other_methods_do_not_matter(self):
        a = payout_guard.destination_fingerprint(self.vendor(paypal_email="a@example.com"))
        b = payout_guard.destination_fingerprint(self.vendor(paypal_email="b@example.com"))
        self.assertEqual(a, b)

    def test_paypal_email_is_case_insensitive(self):
        a = payout_guard.destination_fingerprint(self.vendor(payment_method="PAYPAL", paypal_email="Ann@Example.com"))
        b = payout_guard.destination_fingerprint(self.vendor(payment_method="PAYPAL", paypal_email="ann@example.com"))
        self.assertEqual(a, b)


class TwoPersonThresholdTests(SimpleTestCase):
    @override_settings(PAYOUT_TWO_PERSON_THRESHOLD=50000)
    def test_threshold_is_inclusive(self):
        self.assertFalse(payout_guard.requires_two_person(Decimal("49999.99")))
        self.assertTrue(payout_guard.requires_two_person(Decimal("50000")))

    @override_settings(PAYOUT_TWO_PERSON_THRESHOLD=0)
    def test_zero_threshold_requires_two_admins_for_everything(self):
        self.assertTrue(payout_guard.requires_two_person(Decimal("1.00")))


@override_settings(PAYOUT_TWO_PERSON_THRESHOLD=50000, PAYOUT_DESTINATION_HOLD_HOURS=48)
class PayoutGateTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.admin_a = User.objects.create_user("admin_a", "a@example.com", "pw", is_staff=True)
        self.admin_b = User.objects.create_user("admin_b", "b@example.com", "pw", is_staff=True)
        self.payout = self.make_payout()

    def send(self, user, reference=None):
        request = APIRequestFactory().post("/x", {}, format="json", HTTP_X_FORWARDED_FOR="10.0.0.9")
        force_authenticate(request, user=user)
        return pay_single_vendor_payout(request, reference or self.payout.reference)

    def reload(self):
        self.payout.refresh_from_db()
        return self.payout

    @patch("vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer")
    def test_send_records_initiator_and_clears_in_flight_marker(self, bank):
        bank.return_value = {"success": True}
        response = self.send(self.admin_a)
        payout = self.reload()
        self.assertEqual(response.status_code, 202)
        self.assertEqual(payout.initiated_by, self.admin_a)
        self.assertIsNotNone(payout.initiated_at)
        self.assertEqual(payout.initiated_ip, "10.0.0.9")
        self.assertFalse(payout.send_in_progress)
        actions = set(PayoutAuditLog.objects.filter(payout=payout).values_list("action", flat=True))
        self.assertTrue({"send_started", "send_finished"} <= actions)

    @patch("vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer")
    def test_marker_is_committed_before_the_provider_is_called(self, bank):
        seen = {}

        def fake(*args, **kwargs):
            seen["in_progress"] = VendorPayout.objects.get(pk=self.payout.pk).send_in_progress
            return {"success": True}

        bank.side_effect = fake
        self.send(self.admin_a)
        self.assertTrue(seen["in_progress"])

    @patch("vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer")
    def test_unexpected_provider_error_keeps_marker_and_blocks_blind_resend(self, bank):
        bank.side_effect = RuntimeError("boom")
        first = self.send(self.admin_a)
        self.assertEqual(first.status_code, 500)
        self.assertTrue(self.reload().send_in_progress)
        bank.side_effect = None
        bank.return_value = {"success": True}
        second = self.send(self.admin_a)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(bank.call_count, 1)

    @patch("vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer")
    def test_definite_provider_failure_allows_retry(self, bank):
        bank.return_value = {"success": False, "error": "Rejected"}
        self.assertEqual(self.send(self.admin_a).status_code, 400)
        self.assertFalse(self.reload().send_in_progress)

    @patch("vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer")
    def test_large_payout_needs_a_different_admin(self, bank):
        bank.return_value = {"success": True}
        VendorPayout.objects.filter(pk=self.payout.pk).update(amount=Decimal("80000.00"))

        requested = self.send(self.admin_a)
        self.assertEqual(requested.status_code, 202)
        self.assertTrue(requested.data.get("awaiting_approval"))
        bank.assert_not_called()

        same_admin = self.send(self.admin_a)
        self.assertEqual(same_admin.status_code, 403)
        bank.assert_not_called()

        approved = self.send(self.admin_b)
        payout = self.reload()
        self.assertEqual(approved.status_code, 202)
        bank.assert_called_once()
        self.assertEqual(payout.approved_by, self.admin_b)
        self.assertEqual(payout.initiated_by, self.admin_b)
        self.assertIsNone(payout.approval_requested_by)

    @patch("vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer")
    def test_approval_is_void_if_amount_changes(self, bank):
        bank.return_value = {"success": True}
        VendorPayout.objects.filter(pk=self.payout.pk).update(amount=Decimal("80000.00"))
        self.send(self.admin_a)
        VendorPayout.objects.filter(pk=self.payout.pk).update(amount=Decimal("90000.00"))
        response = self.send(self.admin_b)
        self.assertEqual(response.status_code, 202)
        self.assertTrue(response.data.get("awaiting_approval"))
        bank.assert_not_called()

    @patch("vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer")
    def test_approval_expires(self, bank):
        bank.return_value = {"success": True}
        VendorPayout.objects.filter(pk=self.payout.pk).update(amount=Decimal("80000.00"))
        self.send(self.admin_a)
        VendorPayout.objects.filter(pk=self.payout.pk).update(
            approval_requested_at=timezone.now() - timedelta(hours=48)
        )
        response = self.send(self.admin_b)
        self.assertTrue(response.data.get("awaiting_approval"))
        bank.assert_not_called()

    @patch("vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer")
    def test_changed_destination_is_held_then_released(self, bank):
        bank.return_value = {"success": True}
        vendor = self.payout.vendor
        vendor.bank_account_number = "9999999999"
        vendor.save()

        held = self.send(self.admin_a)
        self.assertEqual(held.status_code, 423)
        bank.assert_not_called()

        Vendor.objects.filter(pk=vendor.pk).update(
            payout_destination_changed_at=timezone.now() - timedelta(hours=49)
        )
        released = self.send(self.admin_a)
        self.assertEqual(released.status_code, 202)
        bank.assert_called_once()

    @patch("vendorDashboard.payout.services.vendor_monthly_payout_runner.call_bank_transfer")
    def test_destination_edit_that_bypasses_save_is_still_held(self, bank):
        bank.return_value = {"success": True}
        vendor = self.payout.vendor
        Vendor.objects.filter(pk=vendor.pk).update(bank_account_number="5555555555")
        self.assertEqual(self.send(self.admin_a).status_code, 423)
        bank.assert_not_called()

    def test_unchanged_vendor_has_no_hold(self):
        vendor = self.payout.vendor
        vendor.refresh_from_db()
        self.assertIsNone(payout_guard.destination_hold_until(vendor))
