from django.core.cache import cache
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class UploadLockdownTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("u1", "u1@example.com", "pw12345!")

    def _file(self, name="a.png", size=10):
        return {"file": SimpleUploadedFile(name, b"x" * size)}

    def test_anonymous_upload_rejected(self):
        res = self.client.post("/api/upload/", self._file(), format="multipart")
        self.assertIn(res.status_code, (401, 403))

    def test_active_content_rejected(self):
        self.client.force_authenticate(self.user)
        for name in ("x.html", "x.svg", "x.js"):
            res = self.client.post("/api/upload/", self._file(name), format="multipart")
            self.assertEqual(res.status_code, 400, name)

    def test_oversize_rejected(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(
            "/api/upload/", self._file("big.png", 5 * 1024 * 1024 + 1), format="multipart"
        )
        self.assertEqual(res.status_code, 400)


class VendorCounterPermissionTests(TestCase):
    def test_counter_requires_admin(self):
        client = APIClient()
        self.assertIn(client.get("/api/vendor/requests/unseen-count/").status_code, (401, 403))
        user = User.objects.create_user("plain", "p@example.com", "pw12345!")
        client.force_authenticate(user)
        self.assertEqual(client.get("/api/vendor/requests/unseen-count/").status_code, 403)
        admin = User.objects.create_superuser("adm", "a@example.com", "pw12345!")
        client.force_authenticate(admin)
        self.assertEqual(client.get("/api/vendor/requests/unseen-count/").status_code, 200)


class LoginRateLimitTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(RATE_LIMITS_ENABLED=True)
    def test_login_is_throttled(self):
        from django.urls import reverse, NoReverseMatch
        from ReactSerializers import users
        from django.test import RequestFactory

        rf = RequestFactory()
        codes = []
        for _ in range(12):
            req = rf.post("/login/", {"username": "nobody", "password": "bad"})
            codes.append(users.login_view(req).status_code)
        self.assertEqual(codes[-1], 429)
        self.assertNotEqual(codes[0], 429)
