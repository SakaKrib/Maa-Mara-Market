from django.core.files.uploadedfile import SimpleUploadedFile
from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient

from vendorDashboard.models import Vendor
from vendorDashboard.tests.test_payout_reconciliation import PayoutTestMixin

PNG = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
       b"\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa7\x9a\xa0\xa0\x00\x00\x00\x00IEND\xaeB`\x82")


class VendorSelfServiceTests(PayoutTestMixin, TestCase):
    def setUp(self):
        self.vendor = self.make_vendor("BANK_TRANSFER")
        self.vendor.bank_name = "KCB"
        self.vendor.bank_account_name = "Test Vendor"
        self.vendor.save()
        # setUp's own edit is not a vendor change: start with no hold.
        Vendor.objects.filter(pk=self.vendor.pk).update(payout_destination_changed_at=None)
        self.vendor.refresh_from_db()
        self.api = APIClient()
        self.api.force_authenticate(self.vendor.user)

    def profile_url(self, pk=None):
        return f"/api/vendor-update-profile/{pk or self.vendor.pk}/"

    def test_profile_update_ignores_protected_fields(self):
        code, tax = self.vendor.vendor_code, self.vendor.tax_number
        res = self.api.patch(self.profile_url(), {
            "city": "Mombasa", "vendor_code": "HACK", "tax_number": "A1",
            "payment_method": "PAYPAL", "paypal_email": "x@y.com", "bank_account_number": "999",
        }, format="multipart")
        self.assertEqual(res.status_code, 200, res.content)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.city, "Mombasa")
        self.assertEqual(self.vendor.vendor_code, code)
        self.assertEqual(self.vendor.tax_number, tax)
        self.assertEqual(self.vendor.payment_method, "BANK_TRANSFER")
        self.assertEqual(self.vendor.bank_account_number, "1234567890")
        self.assertIsNone(self.vendor.payout_destination_changed_at)

    def test_cannot_edit_another_vendor(self):
        other = self.make_vendor()
        self.assertEqual(self.api.patch(self.profile_url(other.pk), {"city": "X"}).status_code, 403)

    def test_images_and_brand_saved(self):
        res = self.api.patch(self.profile_url(), {
            "profile_picture": SimpleUploadedFile("p.png", PNG, "image/png"),
            "company_logo": SimpleUploadedFile("c.png", PNG, "image/png"),
            "brand_logo": SimpleUploadedFile("b.png", PNG, "image/png"),
            "brand_name": "Mara Crafts", "brand_description": "Hand made",
        }, format="multipart")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertTrue(data["profile_picture"])
        self.assertTrue(data["vendor_company_logo"])
        self.assertTrue(data["brand"]["logo"])
        self.assertEqual(data["brand"]["name"], "Mara Crafts")

    def test_payment_details_get_prefilled(self):
        res = self.api.get("/api/vendor/payment-details/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["bank_name"], "KCB")
        self.assertIsNone(res.json()["hold_until"])

    def test_changing_destination_starts_hold(self):
        res = self.api.patch("/api/vendor/payment-details/", {
            "payment_method": "MOBILE_MONEY", "mpesa_type": "TILL", "mpesa_till": "123456",
        }, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertTrue(body["destination_changed"])
        self.assertIsNotNone(body["hold_until"])
        self.assertEqual(body["hold_hours"], 48)

    def test_tax_number_only_does_not_start_hold(self):
        res = self.api.patch("/api/vendor/payment-details/", {"tax_number": "P051234567Z"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertFalse(res.json()["destination_changed"])
        self.assertIsNone(res.json()["hold_until"])
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.tax_number, "P051234567Z")

    def test_validation_errors(self):
        res = self.api.patch("/api/vendor/payment-details/", {
            "payment_method": "MOBILE_MONEY", "mpesa_type": "LIPA_NA_MPESA",
            "mpesa_paybill": "abc", "mpesa_paybill_account": "x" * 14,
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("mpesa_paybill", res.json()["errors"])
        self.assertIn("mpesa_paybill_account", res.json()["errors"])

    def test_non_vendor_rejected(self):
        client = APIClient()
        self.assertIn(client.get("/api/vendor/payment-details/").status_code, (401, 403))

    def test_destination_change_sends_email_once(self):
        with self.captureOnCommitCallbacks(execute=True):
            res = self.api.patch("/api/vendor/payment-details/", {
                "payment_method": "PAYPAL", "paypal_email": "pay@example.com",
            }, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("payout details were changed", mail.outbox[0].subject)
        self.assertNotIn("pay@example.com", mail.outbox[0].body)

    def test_tax_only_change_sends_no_email(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.api.patch("/api/vendor/payment-details/", {"tax_number": "P0512"}, format="json")
        self.assertEqual(len(mail.outbox), 0)

    def test_account_payload_flags_vendor_and_referral_date(self):
        from core.models import Referral
        Referral.objects.create(referrer=self.vendor.user)
        res = self.api.get("/api/user/account/")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertTrue(data["is_vendor"])
        self.assertTrue(data["referral"]["created_at"])
