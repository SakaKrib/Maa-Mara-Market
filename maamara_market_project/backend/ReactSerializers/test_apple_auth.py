from urllib.parse import parse_qs, urlsplit
from unittest.mock import patch

import jwt
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.throttling import ScopedRateThrottle

from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase, override_settings

from core.models import Profile, Wallet
from ReactSerializers.social_replay import issue_nonce


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
            {"id_token": "verified-apple-id-token", "nonce": issue_nonce(), "full_name": "Apple Customer"},
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
            {"id_token": "returning-apple-id-token", "nonce": issue_nonce()},
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
            {"id_token": "apple-id-token", "nonce": issue_nonce()},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(SocialAccount.objects.filter(provider="apple", uid=self.claims["sub"], user=user).exists())

    @patch("ReactSerializers.apple_auth.verify_apple_identity_token")
    def test_unverified_email_cannot_create_or_link_new_apple_identity(self, verify):
        verify.return_value = {**self.claims, "email_verified": False}
        response = self.client.post(
            "/api/apple/login/",
            {"id_token": "apple-id-token", "nonce": issue_nonce()},
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
            {"id_token": "apple-id-token", "nonce": issue_nonce()},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertFalse(SocialAccount.objects.filter(provider="apple", uid=self.claims["sub"]).exists())

    @patch("ReactSerializers.apple_auth.jwt.decode")
    @patch("ReactSerializers.apple_auth._apple_signing_key")
    def test_apple_nonce_mismatch_is_rejected_after_signature_verification(self, jwks, decode):
        jwks.return_value.get_signing_key_from_jwt.return_value.key = "verified-public-key"
        decode.return_value = {**self.claims, "nonce": "different-nonce"}
        from ReactSerializers.apple_auth import verify_apple_identity_token

        with self.assertRaises(AuthenticationFailed):
            verify_apple_identity_token("signed-apple-token", "expected-hashed-nonce")

    @patch("ReactSerializers.apple_auth.jwt.decode")
    @patch("ReactSerializers.apple_auth._apple_signing_key")
    def test_invalid_apple_signature_is_rejected(self, jwks, decode):
        jwks.return_value.get_signing_key_from_jwt.return_value.key = "verified-public-key"
        decode.side_effect = jwt.InvalidSignatureError("bad signature")
        from ReactSerializers.apple_auth import verify_apple_identity_token

        with self.assertRaises(AuthenticationFailed):
            verify_apple_identity_token("invalid-apple-token", "expected-hashed-nonce")

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


from unittest.mock import patch
from django.contrib.auth.models import User
from rest_framework.exceptions import AuthenticationFailed
from allauth.account.models import EmailAddress


@patch.object(
    ScopedRateThrottle,
    "THROTTLE_RATES",
    {**ScopedRateThrottle.THROTTLE_RATES, "social_auth": "1000/min"},
)
@override_settings(
    GOOGLE_CLIENT_ID="maamara-web-client.apps.googleusercontent.com",
    REST_FRAMEWORK={
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
            # CI executes this auth regression module from one test IP.
            # Preserve production limits while preventing test-order coupling.
            "social_auth": "1000/min",
        },
    },
)
class GoogleIdTokenAuthenticationTests(TestCase):
    def setUp(self):
        self.claims = {
            "iss": "https://accounts.google.com",
            "sub": "google-subject-001",
            "email": "google.customer@example.com",
            "email_verified": True,
            "given_name": "Google",
            "family_name": "Customer",
            "name": "Google Customer",
        }

    @patch("ReactSerializers.social_auth_views.verify_google_credential")
    def test_new_google_identity_creates_local_user_profile_wallet_and_cookies(self, verify):
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/", {"credential": "signed-google-token"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        user = User.objects.get(email=self.claims["email"])
        self.assertEqual(user.first_name, "Google")
        self.assertTrue(Profile.objects.filter(user=user).exists())
        self.assertTrue(Wallet.objects.filter(user=user).exists())
        self.assertTrue(SocialAccount.objects.filter(provider="google", uid=self.claims["sub"], user=user).exists())
        self.assertTrue(EmailAddress.objects.filter(user=user, email=self.claims["email"], verified=True).exists())
        self.assertTrue(response.cookies["accessToken"]["httponly"])
        self.assertTrue(response.cookies["refreshToken"]["httponly"])

    @patch("ReactSerializers.social_auth_views.verify_google_credential")
    def test_existing_verified_email_is_linked_without_duplicate_user(self, verify):
        user = User.objects.create_user(username="local-customer", email=self.claims["email"], password="Local-password-123!")
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/", {"credential": "signed-google-token"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(User.objects.filter(email__iexact=self.claims["email"]).count(), 1)
        self.assertTrue(SocialAccount.objects.filter(provider="google", uid=self.claims["sub"], user=user).exists())

    @patch("ReactSerializers.social_auth_views.verify_google_credential")
    def test_returning_google_subject_reuses_existing_account(self, verify):
        user = User.objects.create_user(username="google-returning", email=self.claims["email"], password=None)
        SocialAccount.objects.create(provider="google", uid=self.claims["sub"], user=user, extra_data=self.claims)
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/", {"credential": "signed-google-token"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(User.objects.filter(email=self.claims["email"]).count(), 1)

    @patch("ReactSerializers.social_auth_views.verify_google_credential")
    def test_duplicate_email_records_fail_closed(self, verify):
        User.objects.create_user(username="google-one", email=self.claims["email"], password="First-password-123!")
        User.objects.create_user(username="google-two", email=self.claims["email"].upper(), password="Second-password-123!")
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/", {"credential": "signed-google-token"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertFalse(SocialAccount.objects.filter(provider="google", uid=self.claims["sub"]).exists())

    @patch("ReactSerializers.social_auth_views.verify_google_credential")
    def test_inactive_user_is_rejected(self, verify):
        user = User.objects.create_user(username="google-inactive", email=self.claims["email"], password=None, is_active=False)
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/", {"credential": "signed-google-token"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertFalse(SocialAccount.objects.filter(provider="google", user=user).exists())

    @patch("ReactSerializers.social_auth_views.id_token.verify_oauth2_token")
    def test_unverified_email_is_rejected(self, verify):
        from ReactSerializers.social_auth_views import verify_google_credential
        verify.return_value = {**self.claims, "email_verified": False}
        with self.assertRaises(AuthenticationFailed):
            verify_google_credential("signed-google-token")

    @patch("ReactSerializers.social_auth_views.id_token.verify_oauth2_token")
    def test_wrong_issuer_is_rejected(self, verify):
        from ReactSerializers.social_auth_views import verify_google_credential
        verify.return_value = {**self.claims, "iss": "https://attacker.example"}
        with self.assertRaises(AuthenticationFailed):
            verify_google_credential("signed-google-token")


    @patch("ReactSerializers.social_auth_views.id_token.verify_oauth2_token")
    def test_invalid_google_signature_is_rejected(self, verify):
        from ReactSerializers.social_auth_views import verify_google_credential
        verify.side_effect = ValueError("invalid signature")
        with self.assertRaises(AuthenticationFailed):
            verify_google_credential("invalid-signature-token")

    @patch("ReactSerializers.social_auth_views.id_token.verify_oauth2_token")
    def test_google_audience_is_pinned_to_web_client_id(self, verify):
        from ReactSerializers.social_auth_views import verify_google_credential
        verify.return_value = self.claims
        verify_google_credential("signed-google-token")
        self.assertEqual(verify.call_args.kwargs["audience"], "maamara-web-client.apps.googleusercontent.com")

    @patch("ReactSerializers.social_auth_views.verify_google_credential")
    def test_conflicting_google_identity_is_rejected(self, verify):
        user = User.objects.create_user(username="google-conflict", email=self.claims["email"], password=None)
        SocialAccount.objects.create(provider="google", uid="different-google-subject", user=user)
        verify.return_value = self.claims
        response = self.client.post(
            "/api/google/login/", {"credential": "signed-google-token"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertFalse(SocialAccount.objects.filter(provider="google", uid=self.claims["sub"]).exists())


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
class AppleNativeNonceAndReplayTests(TestCase):
    def post(self, nonce):
        return self.client.post(
            "/api/apple/login/", {"id_token": "tok", "nonce": nonce}, content_type="application/json"
        )

    def test_nonce_endpoint_issues_unique_values(self):
        a = self.client.get("/api/apple/nonce/").json()["nonce"]
        b = self.client.get("/api/apple/nonce/").json()["nonce"]
        self.assertNotEqual(a, b)

    def test_unissued_or_missing_nonce_is_rejected(self):
        self.assertEqual(self.post("client-made-up").status_code, 401)
        self.assertEqual(self.post("").status_code, 401)

    @patch("ReactSerializers.apple_auth.jwt.decode")
    @patch("ReactSerializers.apple_auth._apple_signing_key")
    def test_nonce_is_single_use_and_bound_to_token(self, key, decode):
        import hashlib
        raw = issue_nonce()
        digest = hashlib.sha256(raw.encode()).hexdigest()
        decode.return_value = {
            "iss": "https://appleid.apple.com", "sub": "s-1", "aud": "com.maamaramarket.app",
            "email": "n@privaterelay.appleid.com", "email_verified": "true", "exp": 4102444800,
            "nonce": digest,
        }
        first = self.post(raw)
        self.assertEqual(first.status_code, 200, first.content)
        self.assertEqual(self.post(raw).status_code, 401)  # nonce already consumed

    @patch("ReactSerializers.apple_auth.jwt.decode")
    @patch("ReactSerializers.apple_auth._apple_signing_key")
    def test_token_minted_for_another_nonce_is_rejected(self, key, decode):
        decode.return_value = {
            "iss": "https://appleid.apple.com", "sub": "s-2", "aud": "com.maamaramarket.app",
            "email": "m@privaterelay.appleid.com", "email_verified": "true", "exp": 4102444800,
            "nonce": "someone-elses-nonce",
        }
        self.assertEqual(self.post(issue_nonce()).status_code, 401)

    @patch("ReactSerializers.apple_auth.jwt.decode")
    @patch("ReactSerializers.apple_auth._apple_signing_key")
    def test_same_token_cannot_be_replayed_with_fresh_nonce(self, key, decode):
        import hashlib
        def claims_for(raw):
            return {"iss": "https://appleid.apple.com", "sub": "s-3", "aud": "com.maamaramarket.app",
                    "email": "r@privaterelay.appleid.com", "email_verified": "true", "exp": 4102444800,
                    "nonce": hashlib.sha256(raw.encode()).hexdigest()}
        raw1 = issue_nonce()
        decode.return_value = claims_for(raw1)
        self.assertEqual(self.post(raw1).status_code, 200)
        raw2 = issue_nonce()
        decode.return_value = claims_for(raw2)
        self.assertEqual(self.post(raw2).status_code, 401)  # same token string "tok" already used
