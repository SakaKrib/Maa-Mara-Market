from unittest.mock import patch

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth.models import User
from django.test import TestCase, override_settings

from core.models import Profile, Wallet


@override_settings(GOOGLE_CLIENT_ID="maamara-web-client.apps.googleusercontent.com")
class GoogleIdentityAuthenticationTests(TestCase):
    def setUp(self):
        self.claims = {
            "iss": "https://accounts.google.com",
            "sub": "google-subject-001",
            "email": "customer@example.com",
            "email_verified": True,
            "given_name": "Maa",
            "family_name": "Mara",
            "name": "Maa Mara",
        }

    @patch("ReactSerializers.google_auth.verify_google_credential")
    def test_new_google_identity_creates_local_user_profile_wallet_and_cookies(self, verify):
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/",
            {"credential": "verified-google-id-token"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()["authenticated"])
        user = User.objects.get(email="customer@example.com")
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.first_name, "Maa")
        self.assertTrue(Profile.objects.filter(user=user).exists())
        self.assertTrue(Wallet.objects.filter(user=user).exists())
        self.assertTrue(SocialAccount.objects.filter(provider="google", uid=self.claims["sub"], user=user).exists())
        self.assertTrue(EmailAddress.objects.filter(user=user, email=user.email, verified=True).exists())
        self.assertTrue(response.cookies["accessToken"]["httponly"])
        self.assertTrue(response.cookies["refreshToken"]["httponly"])

    @patch("ReactSerializers.google_auth.verify_google_credential")
    def test_verified_email_links_existing_account_without_duplicate_user(self, verify):
        existing = User.objects.create_user(username="existing", email="CUSTOMER@example.com", password="Local-password-123!")
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/",
            {"credential": "verified-google-id-token", "visitorId": "visitor-abc"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(User.objects.filter(email__iexact=self.claims["email"]).count(), 1)
        self.assertTrue(SocialAccount.objects.filter(provider="google", uid=self.claims["sub"], user=existing).exists())

    @patch("ReactSerializers.google_auth.verify_google_credential")
    def test_duplicate_local_email_fails_closed(self, verify):
        User.objects.create_user(username="first", email=self.claims["email"], password="First-password-123!")
        User.objects.create_user(username="second", email=self.claims["email"].upper(), password="Second-password-123!")
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/",
            {"credential": "verified-google-id-token"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertFalse(SocialAccount.objects.filter(provider="google", uid=self.claims["sub"]).exists())

    @patch("ReactSerializers.google_auth.verify_google_credential")
    def test_inactive_google_account_is_rejected(self, verify):
        user = User.objects.create_user(username="inactive", email=self.claims["email"], password=None, is_active=False)
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/",
            {"credential": "verified-google-id-token"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertFalse(SocialAccount.objects.filter(provider="google", user=user).exists())

    @patch("ReactSerializers.google_auth.id_token.verify_oauth2_token")
    def test_invalid_google_signature_is_rejected(self, verify):
        from rest_framework.exceptions import AuthenticationFailed
        from ReactSerializers.google_auth import verify_google_credential

        verify.side_effect = ValueError("invalid signature")
        with self.assertRaises(AuthenticationFailed):
            verify_google_credential("invalid-google-token")

    @patch("ReactSerializers.google_auth.id_token.verify_oauth2_token")
    def test_unverified_google_email_is_rejected(self, verify):
        from rest_framework.exceptions import AuthenticationFailed
        from ReactSerializers.google_auth import verify_google_credential

        verify.return_value = {**self.claims, "email_verified": False}
        with self.assertRaises(AuthenticationFailed):
            verify_google_credential("unverified-token")
