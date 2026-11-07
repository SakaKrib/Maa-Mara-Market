from urllib.parse import parse_qs, urlsplit
from unittest.mock import patch

from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase, override_settings

from core.models import Profile, Wallet


APPLE_SETTINGS = {
    "APPLE_CLIENT_ID": "com.maamaramarket.web",
    "APPLE_TEAM_ID": "TEAM123",
    "APPLE_KEY_ID": "KEY123",
    "APPLE_BUNDLE_ID": "com.maamaramarket.app",
    "APPLE_PRIVATE_KEY": "test-private-key",
    "APPLE_PRIVATE_KEY_PATH": "",
    "APPLE_REDIRECT_URI": "https://maamaramarket.com/maamara/api/apple/callback/",
    "APPLE_SIGN_IN_ENABLED": True,
    "PUBLIC_PATH_PREFIX": "/maamara",
}


@override_settings(
    **APPLE_SETTINGS,
    REST_FRAMEWORK={
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
            "social_auth": "1000/min",
        },
    },
)
class AppleIdentityAuthenticationTests(TestCase):
    def setUp(self):
        self.claims = {
            "iss": "https://appleid.apple.com",
            "sub": "apple-subject-001",
            "aud": "com.maamaramarket.app",
            "email": "relay@privaterelay.appleid.com",
            "email_verified": "true",
            "is_private_email": "true",
            "nonce": "expected-hashed-nonce",
        }

    @patch("ReactSerializers.apple_auth.verify_apple_identity_token")
    def test_native_apple_login_creates_local_account_and_cookies(self, verify):
        verify.return_value = self.claims
        response = self.client.post(
            "/api/apple/login/",
            {"id_token": "verified-apple-id-token", "nonce": "expected-hashed-nonce", "full_name": "Apple Customer"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        user = User.objects.get(email=self.claims["email"])
        self.assertEqual(user.first_name, "Apple")
        self.assertTrue(Profile.objects.filter(user=user).exists())
        self.assertTrue(Wallet.objects.filter(user=user).exists())
        self.assertTrue(SocialAccount.objects.filter(provider="apple", uid=self.claims["sub"], user=user).exists())
        self.assertTrue(response.cookies["accessToken"]["httponly"])
        self.assertTrue(response.cookies["refreshToken"]["httponly"])

    @patch("ReactSerializers.apple_auth.verify_apple_identity_token")
    def test_returning_apple_user_can_sign_in_without_email_or_name(self, verify):
        user = User.objects.create_user(username="apple-returning", email=self.claims["email"], password=None)
        SocialAccount.objects.create(provider="apple", uid=self.claims["sub"], user=user, extra_data=self.claims)
        verify.return_value = {**self.claims, "email": None, "email_verified": False}
        response = self.client.post(
            "/api/apple/login/",
            {"id_token": "returning-apple-id-token", "nonce": "expected-hashed-nonce"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(User.objects.filter(email=self.claims["email"]).count(), 1)

    @patch("ReactSerializers.apple_auth.verify_apple_identity_token")
    def test_verified_apple_email_links_existing_local_account(self, verify):
        user = User.objects.create_user(username="existing-apple", email=self.claims["email"], password="Local-password-123!")
        verify.return_value = self.claims
        response = self.client.post(
            "/api/apple/login/",
            {"id_token": "apple-id-token", "nonce": "expected-hashed-nonce"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(SocialAccount.objects.filter(provider="apple", uid=self.claims["sub"], user=user).exists())

    @patch("ReactSerializers.apple_auth.verify_apple_identity_token")
    def test_unverified_email_cannot_create_or_link_new_apple_identity(self, verify):
        verify.return_value = {**self.claims, "email_verified": False}
        response = self.client.post(
            "/api/apple/login/",
            {"id_token": "apple-id-token", "nonce": "expected-hashed-nonce"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(User.objects.count(), 0)

    @patch("ReactSerializers.apple_auth.verify_apple_identity_token")
    def test_duplicate_local_emails_fail_closed(self, verify):
        User.objects.create_user(username="one", email=self.claims["email"], password="One-password-123!")
        User.objects.create_user(username="two", email=self.claims["email"].upper(), password="Two-password-123!")
        verify.return_value = self.claims
        response = self.client.post(
            "/api/apple/login/",
            {"id_token": "apple-id-token", "nonce": "expected-hashed-nonce"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertFalse(SocialAccount.objects.filter(provider="apple", uid=self.claims["sub"]).exists())

    def test_web_start_uses_secure_short_lived_state_and_nonce_cookies(self):
        with patch("ReactSerializers.social_auth_views.apple_configuration_is_ready", return_value=True):
            response = self.client.get("/api/apple/start/")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response["Location"].startswith("https://appleid.apple.com/auth/authorize?"))
        query = parse_qs(urlsplit(response["Location"]).query)
        self.assertEqual(query["state"][0], response.cookies["maamara_apple_state"].value)
        self.assertEqual(query["nonce"][0], response.cookies["maamara_apple_nonce"].value)
        for cookie_name in ("maamara_apple_state", "maamara_apple_nonce"):
            cookie = response.cookies[cookie_name]
            self.assertTrue(cookie["httponly"])
            self.assertTrue(cookie["secure"])
            self.assertEqual(cookie["samesite"], "None")
            self.assertEqual(cookie["path"], "/maamara/api/apple/callback/")

    def test_web_callback_rejects_state_mismatch(self):
        self.client.cookies["maamara_apple_state"] = "expected-state"
        self.client.cookies["maamara_apple_nonce"] = "expected-nonce"
        response = self.client.post(
            "/api/apple/callback/",
            {"state": "attacker-state", "code": "authorization-code"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("state validation failed", response.data["error"].lower())
