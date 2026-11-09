from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import VendorTermsAcceptance
from core.vendor_terms import CURRENT_VERSION, REQUIRED_ACKNOWLEDGEMENTS


class VendorTermsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("seller", "s@example.com", "pw")
        self.client = APIClient()

    def test_requires_login(self):
        self.assertIn(self.client.get("/api/vendor-terms/").status_code, (401, 403))

    def test_status_then_accept_with_all_acknowledgements(self):
        self.client.force_authenticate(self.user)
        self.assertFalse(self.client.get("/api/vendor-terms/").json()["accepted"])
        res = self.client.post("/api/vendor-terms/", {"version": CURRENT_VERSION,
                                                       "acknowledgements": list(REQUIRED_ACKNOWLEDGEMENTS)}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(self.client.get("/api/vendor-terms/").json()["accepted"])
        again = self.client.post("/api/vendor-terms/", {"version": CURRENT_VERSION,
                                                         "acknowledgements": list(REQUIRED_ACKNOWLEDGEMENTS)}, format="json")
        self.assertEqual(again.status_code, 200)
        self.assertEqual(VendorTermsAcceptance.objects.count(), 1)

    def test_missing_acknowledgement_or_old_version_is_refused(self):
        self.client.force_authenticate(self.user)
        partial = self.client.post("/api/vendor-terms/", {"version": CURRENT_VERSION, "acknowledgements": ["pricing"]},
                                   format="json")
        self.assertEqual(partial.status_code, 400)
        self.assertIn("payouts", partial.json()["missing"])
        old = self.client.post("/api/vendor-terms/", {"version": "2020-01-01",
                                                       "acknowledgements": list(REQUIRED_ACKNOWLEDGEMENTS)}, format="json")
        self.assertEqual(old.status_code, 409)
        self.assertEqual(VendorTermsAcceptance.objects.count(), 0)

    def test_vendor_application_is_blocked_until_terms_accepted(self):
        self.client.force_authenticate(self.user)
        res = self.client.post("/api/vendor-request/", {"vendor_data": "{}"}, format="multipart")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "vendor_terms_required")
        VendorTermsAcceptance.objects.create(user=self.user, version=CURRENT_VERSION)
        self.client.raise_request_exception = False  # the empty application fails later; we only check the gate
        res = self.client.post("/api/vendor-request/", {"vendor_data": "{}"}, format="multipart")
        self.assertNotEqual(res.status_code, 403)
