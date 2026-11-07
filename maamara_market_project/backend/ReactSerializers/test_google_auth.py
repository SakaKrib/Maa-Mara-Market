from unittest.mock import patch

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.exceptions import AuthenticationFailed

from core.models import Profile, Wallet


@override_settings(GOOGLE_CLIENT_ID="test-google-web-client.apps.googleusercontent.com")
class GoogleIdentityAuthenticationTests(TestCase):
    def setUp(self):
        self.claims = {
            "iss": "https://accounts.google.com",
            "sub": "google-subject-123",
            "email": "new.customer@example.com",
            "email_verified": True,
            "given_name": "New",
            "family_name": "Customer",
            "name": "New Customer",
        }

    @patch("ReactSerializers.google_auth.verify_google_credential")
    @patch("ReactSerializers.google_auth_views.merge_visitor_data_to_user")
    def test_new_google_identity_creates_one_local_account_and_session(
        self, merge_visitor, verify
    ):
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/",
            {"credential": "verified-google-id-token"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertTrue(payload["authenticated"])
        self.assertEqual(payload["user"]["email"], self.claims["email"])

        user = User.objects.get(email=self.claims["email"])
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.first_name, "New")
        self.assertEqual(user.last_name, "Customer")
        self.assertTrue(Profile.objects.filter(user=user).exists())
        self.assertTrue(Wallet.objects.filter(user=user).exists())
        self.assertTrue(
            SocialAccount.objects.filter(
                provider="google", uid=self.claims["sub"], user=user
            ).exists()
        )
        self.assertTrue(
            EmailAddress.objects.filter(
                user=user, email=self.claims["email"], verified=True
            ).exists()
        )
        self.assertIn("accessToken", response.cookies)
        self.assertTrue(response.cookies["accessToken"]["httponly"])
        self.assertIn("refreshToken", response.cookies)
        verify.assert_called_once_with("verified-google-id-token")
        merge_visitor.assert_not_called()

    @patch("ReactSerializers.google_auth.verify_google_credential")
    @patch("ReactSerializers.google_auth_views.merge_visitor_data_to_user")
    def test_verified_google_email_links_existing_local_account(
        self, merge_visitor, verify
    ):
        existing = User.objects.create_user(
            username="existing-customer",
            email="NEW.CUSTOMER@example.com",
            password="ExistingPassword123!",
        )
        verify.return_value = self.claims

        response = self.client.post(
            "/api/google/login/",
            {"credential": "verified-google-id-token", "visitorId": "visitor-123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(User.objects.filter(email__iexact=self.claims["email"]).count(), 1)
        self.assertTrue(
            SocialAccount.objects.filter(
                provider="google", uid=self.claims["sub"], user=existing
            ).exists()
        )
        merge_visitor.assert_called_once_with(existing, "visitor-123")

    @patch("ReactSerializers.google_auth.verify_google_credential")
    def test_returning_google_identity_reuses_the_same_user(self, verify):
        user = User.objects.create_user(
            username="returning-customer",
            email=self.claims["email"],
            password=None,
        )
        SocialAccount.objects.create(
            provider="google",
            uid=self.claims["sub"],
            user=user,
            extra_data=self.claims,
        )
        verify.return_value = self.claims

        first = self.client.post(
            "/api/google/login/",
            {"credential": "verified-google-id-token"},
            content_type="application/json",
        )
        second = self.client.post(
            "/api/google/login/",
            {"credential": "verified-google-id-token"},
            content_type="application/json",
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(User.objects.filter(email=self.claims["email"]).count(), 1)
        self.assertEqual(
            SocialAccount.objects.filter(provider="google", uid=self.claims["sub"]).count(),
            1,
        )

    @patch("ReactSerializers.google_auth.verify_google_credential")
    def test_duplicate_local_emails_fail_closed(self, verify):
        User.objects.create_user(
            username="first-customer",
            email=self.claims["email"],
            password="FirstPassword123!",
        )
        User.objects.create_user(
            username="second-customer",
            email=self.claims["email"].upper(),
            password="SecondPassword123!",
        )
        verify.return_value = self.claims

        response = self.client.post(
            "/api/google/login/",
            {"credential": "verified-google-id-token"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            SocialAccount.objects.filter(provider="google", uid=self.claims["sub"]).count(),
            0,
        )

    @patch("ReactSerializers.google_auth.id_token.verify_oauth2_token")
    def test_unverified_google_email_is_rejected(self, verify):
        from ReactSerializers.google_auth import verify_google_credential

        verify.return_value = {**self.claims, "email_verified": False}
        with self.assertRaises(AuthenticationFailed):
            verify_google_credential("unverified-token")

    @patch("ReactSerializers.google_auth.verify_google_credential")
    def test_inactive_local_account_cannot_sign_in(self, verify):
        user = User.objects.create_user(
            username="inactive-customer",
            email=self.claims["email"],
            password=None,
            is_active=False,
        )
        verify.return_value = self.claims

        response = self.client.post(
            "/api/google/login/",
            {"credential": "verified-google-id-token"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertFalse(
            SocialAccount.objects.filter(provider="google", user=user).exists()
        )
