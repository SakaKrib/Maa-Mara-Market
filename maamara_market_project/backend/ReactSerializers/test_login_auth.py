from types import SimpleNamespace
from unittest.mock import Mock, patch

try:
    from allauth.core.exceptions import ImmediateHttpResponse
except ImportError:  # Match the adapter's compatibility with older allauth versions.
    from allauth.exceptions import ImmediateHttpResponse
from django.contrib.auth.models import User
from django.test import RequestFactory, TestCase

from .adapters import MyAdapter


class EmailOrUsernameLoginTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="MarketAdmin",
            email="admin@example.com",
            password="StrongPass123!",
            is_staff=True,
        )

    @patch("ReactSerializers.users.merge_visitor_data_to_user")
    def test_email_login_is_case_insensitive(self, _merge_visitor_data):
        response = self.client.post(
            "/api/login/",
            {"username": "ADMIN@EXAMPLE.COM", "password": "StrongPass123!"},
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["user"]["username"], "MarketAdmin")
        self.assertEqual(response.json()["user"]["role"], "admin")
        self.assertIn("accessToken", response.cookies)
        self.assertIn("refreshToken", response.cookies)

    @patch("ReactSerializers.users.merge_visitor_data_to_user")
    def test_username_login_is_case_insensitive(self, _merge_visitor_data):
        response = self.client.post(
            "/api/login/",
            {"username": "mArKeTaDmIn", "password": "StrongPass123!"},
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["user"]["username"], "MarketAdmin")

    def test_wrong_password_is_rejected(self):
        response = self.client.post(
            "/api/login/",
            {"username": "admin@example.com", "password": "wrong-password"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.json()["success"])

    def test_duplicate_local_emails_are_rejected(self):
        User.objects.create_user(
            username="another-admin",
            email="ADMIN@example.com",
            password="AnotherPass123!",
        )

        response = self.client.post(
            "/api/login/",
            {"username": "admin@example.com", "password": "StrongPass123!"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.json()["success"])


class GoogleAccountLinkingTests(TestCase):
    def setUp(self):
        self.request = RequestFactory().get("/accounts/google/login/")
        self.adapter = MyAdapter()

    def test_verified_google_email_links_to_existing_local_user(self):
        existing_user = User.objects.create_user(
            username="existing-local-user",
            email="Existing@Example.com",
            password="StrongPass123!",
        )
        sociallogin = SimpleNamespace(
            is_existing=False,
            account=SimpleNamespace(
                provider="google",
                extra_data={
                    "email": "existing@example.com",
                    "email_verified": True,
                },
            ),
            user=SimpleNamespace(email="existing@example.com"),
            email_addresses=[],
            connect=Mock(),
        )

        self.adapter.pre_social_login(self.request, sociallogin)

        sociallogin.connect.assert_called_once_with(self.request, existing_user)

    def test_unverified_google_email_is_rejected(self):
        sociallogin = SimpleNamespace(
            is_existing=False,
            account=SimpleNamespace(
                provider="google",
                extra_data={
                    "email": "new@example.com",
                    "email_verified": False,
                },
            ),
            user=SimpleNamespace(email="new@example.com"),
            email_addresses=[],
            connect=Mock(),
        )

        with self.assertRaises(ImmediateHttpResponse) as raised:
            self.adapter.pre_social_login(self.request, sociallogin)

        self.assertIn(
            "reason=google-email-unverified",
            raised.exception.response["Location"],
        )

    def test_google_username_collision_gets_unique_suffix(self):
        User.objects.create_user(
            username="newgoogleuser",
            email="other@example.com",
            password="StrongPass123!",
        )

        username = self.adapter._unique_username("newgoogleuser@example.com")

        self.assertEqual(username, "newgoogleuser-2")
