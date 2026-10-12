from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.test import Client, RequestFactory, TestCase

try:
    from allauth.core.exceptions import ImmediateHttpResponse
except ImportError:  # Compatibility with older django-allauth releases.
    from allauth.exceptions import ImmediateHttpResponse

from .adapters import MyAdapter


class GoogleAccountLinkingTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.adapter = MyAdapter()
        self.existing_user = User.objects.create_user(
            username="registered-customer",
            email="Customer.Example@example.com",
            password="a-strong-test-password",
        )

    def _sociallogin(self, email, *, verified=True, is_existing=False):
        account = SimpleNamespace(
            provider="google",
            extra_data={
                "email": email,
                "email_verified": verified,
                "given_name": "Google",
                "family_name": "Customer",
                "name": "Google Customer",
            },
        )
        return SimpleNamespace(
            is_existing=is_existing,
            account=account,
            user=User(username="candidate", email=email),
            email_addresses=[],
            connect=Mock(),
        )

    def test_verified_google_email_links_case_insensitive_existing_user(self):
        sociallogin = self._sociallogin("customer.example@EXAMPLE.com")
        request = self.factory.get("/accounts/google/login/")

        self.adapter.pre_social_login(request, sociallogin)

        sociallogin.connect.assert_called_once_with(request, self.existing_user)
        self.assertEqual(User.objects.filter(email__iexact="customer.example@example.com").count(), 1)

    def test_unverified_google_email_cannot_link_or_create_login(self):
        sociallogin = self._sociallogin("customer.example@example.com", verified=False)
        request = self.factory.get("/accounts/google/login/")

        with self.assertRaises(ImmediateHttpResponse):
            self.adapter.pre_social_login(request, sociallogin)

        sociallogin.connect.assert_not_called()

    def test_duplicate_local_email_records_fail_closed(self):
        User.objects.create_user(
            username="second-customer",
            email="customer.example@example.com",
            password="another-test-password",
        )
        sociallogin = self._sociallogin("customer.example@example.com")
        request = self.factory.get("/accounts/google/login/")

        with self.assertRaises(ImmediateHttpResponse):
            self.adapter.pre_social_login(request, sociallogin)

        sociallogin.connect.assert_not_called()

    def test_new_google_user_gets_names_and_a_unique_email_based_username(self):
        User.objects.create_user(
            username="new-customer",
            email="other@example.com",
            password="test-password",
        )
        sociallogin = self._sociallogin("new-customer@example.com")
        sociallogin.user.username = ""
        sociallogin.user.email = ""
        user = self.adapter.populate_user(
            self.factory.get("/accounts/google/login/"),
            sociallogin,
            {
                "email": "new-customer@example.com",
                "first_name": "Google",
                "last_name": "Customer",
                "name": "Google Customer",
            },
        )

        self.assertEqual(user.email, "new-customer@example.com")
        self.assertEqual(user.first_name, "Google")
        self.assertEqual(user.last_name, "Customer")
        self.assertEqual(user.username, "new-customer-2")
        self.assertFalse(User.objects.filter(username__iexact=user.username).exists())


class EmailLoginTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.password = "Very-Strong-Test-Password-123!"
        self.user = User.objects.create_user(
            username="existing-email-user",
            email="existing.email@example.com",
            password=self.password,
        )

    @patch("ReactSerializers.users.merge_visitor_data_to_user")
    def test_login_accepts_case_insensitive_email(self, merge_visitor_data):
        response = self.client.post(
            "/api/login/",
            {
                "username": "EXISTING.EMAIL@EXAMPLE.COM",
                "password": self.password,
            },
        )

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["user"]["id"], self.user.id)
        self.assertEqual(payload["user"]["email"], self.user.email)
        self.assertIn("accessToken", response.cookies)
        self.assertIn("refreshToken", response.cookies)
        merge_visitor_data.assert_called_once()
