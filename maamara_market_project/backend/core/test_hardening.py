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


class RateLimitTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_decorator_blocks_after_limit(self):
        from django.http import HttpResponse
        from django.test import RequestFactory
        from core.ratelimit import rate_limit

        @rate_limit("unit-test", 3, 60)
        def view(request):
            return HttpResponse("ok")

        rf = RequestFactory()
        codes = [view(rf.post("/x/")).status_code for _ in range(5)]
        self.assertEqual(codes, [200, 200, 200, 429, 429])

    def test_login_view_is_wrapped(self):
        from ReactSerializers import users

        self.assertTrue(hasattr(users.login_view, "__wrapped__"))
