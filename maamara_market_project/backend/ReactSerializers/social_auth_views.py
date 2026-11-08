import hashlib
import json
import logging
import secrets
import urllib.parse

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token

from .adapters import MyAdapter

from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException, AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.mergeVisitortoUserData import merge_visitor_data_to_user
from core.models import Profile, Wallet

from .social_replay import consume_nonce, issue_nonce, reject_replay
from .apple_auth import (
    APPLE_ISSUER,
    apple_configuration_is_ready,
    authenticate_apple_credential,
    exchange_apple_authorization_code,
)


GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
User = get_user_model()


def verify_google_credential(credential: str) -> dict:
    """Verify Google's signed ID token and its expected Maa Mara audience."""
    client_id = str(getattr(settings, "GOOGLE_CLIENT_ID", "") or "").strip()
    if not isinstance(credential, str) or not credential or len(credential) > 16384 or not client_id:
        raise AuthenticationFailed("Google sign-in is not configured or the credential is invalid.")
    try:
        claims = id_token.verify_oauth2_token(credential, GoogleRequest(), audience=client_id)
    except (ValueError, GoogleAuthError) as exc:
        raise AuthenticationFailed("Google could not verify this sign-in. Please try again.") from exc
    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise AuthenticationFailed("Invalid Google token issuer.")
    if not str(claims.get("sub") or "").strip():
        raise AuthenticationFailed("Google account identifier is missing.")
    email = str(claims.get("email") or "").strip().lower()
    if not email or claims.get("email_verified") is not True:
        raise AuthenticationFailed("A verified Google email address is required.")
    # Consume the one-time token only after account resolution succeeds.
    # Otherwise a downstream account/database rejection can burn a valid token
    # before the client has received a usable Maa Mara session.
    return claims


@transaction.atomic
def authenticate_google_credential(credential: str):
    """Resolve a Google subject to exactly one Maa Mara local user."""
    claims = verify_google_credential(credential)
    subject = str(claims["sub"])
    email = str(claims["email"]).strip().lower()
    social = (SocialAccount.objects.select_for_update().select_related("user")
              .filter(provider="google", uid=subject).first())
    if social:
        user = social.user
    else:
        matches = list(User.objects.select_for_update().filter(email__iexact=email).order_by("pk")[:2])
        if len(matches) > 1:
            raise AuthenticationFailed("This email is associated with multiple accounts. Please contact support.")
        if matches:
            user = matches[0]
            if SocialAccount.objects.filter(provider="google", user=user).exclude(uid=subject).exists():
                raise AuthenticationFailed("This account is already linked to a different Google account.")
        else:
            full_name = str(claims.get("name") or "").strip()
            first = str(claims.get("given_name") or "").strip()
            last = str(claims.get("family_name") or "").strip()
            parts = full_name.split()
            if not first and parts:
                first = parts[0]
            if not last and len(parts) > 1:
                last = " ".join(parts[1:])
            user = User.objects.create_user(
                username=MyAdapter._unique_username(email), email=email, password=None,
                first_name=first[:150], last_name=last[:150],
            )
        if not user.is_active:
            raise AuthenticationFailed("This account is inactive.")
        try:
            with transaction.atomic():
                social, _ = SocialAccount.objects.get_or_create(
                    provider="google", uid=subject,
                    defaults={"user": user, "extra_data": claims},
                )
        except IntegrityError:
            social = (SocialAccount.objects.select_for_update().select_related("user")
                      .filter(provider="google", uid=subject).first())
            if social is None:
                raise
        if social.user_id != user.pk:
            raise AuthenticationFailed("This Google account is already linked to another user.")

    if not user.is_active:
        raise AuthenticationFailed("This account is inactive.")
    if not user.email:
        user.email = email
        user.save(update_fields=["email"])
    if EmailAddress.objects.filter(email__iexact=email).exclude(user=user).exists():
        raise AuthenticationFailed("This email is already associated with another account.")
    address, _ = EmailAddress.objects.get_or_create(
        user=user, email=email,
        defaults={"verified": True, "primary": not EmailAddress.objects.filter(user=user, primary=True).exists()},
    )
    if not address.verified:
        address.verified = True
        address.save(update_fields=["verified"])
    if not social.extra_data:
        social.extra_data = claims
        social.save(update_fields=["extra_data"])

    # Atomically claim the ID token after all account/linking checks pass.
    # The cache add remains the single-use gate for concurrent/replayed requests.
    reject_replay(credential, claims)
    return user


logger = logging.getLogger(__name__)
APPLE_STATE_COOKIE = "maamara_apple_state"
APPLE_NONCE_COOKIE = "maamara_apple_nonce"


def _frontend_home() -> str:
    frontend = str(getattr(settings, "MAAMARAMARKET_PUBLIC_FRONTEND_URL", settings.FRONTEND_URL)).rstrip("/")
    prefix = str(getattr(settings, "PUBLIC_PATH_PREFIX", "") or "").strip("/")
    return f"{frontend}/{prefix}/" if prefix else f"{frontend}/"


def _issue_local_session(request, user, *, redirect_response=False):
    """Provision Maa Mara records and issue the same JWT cookies as password login."""
    profile, _ = Profile.objects.get_or_create(user=user)
    Wallet.objects.get_or_create(user=user, defaults={"balance": 0, "earned_coins": 0})

    visitor_id = (
        request.COOKIES.get("visitorId")
        or request.data.get("visitorId")
        or request.data.get("visitor_id")
    )
    if visitor_id:
        merge_visitor_data_to_user(user, visitor_id)

    refresh = RefreshToken.for_user(user)
    role = (
        "admin" if user.is_superuser or user.is_staff
        else ("vendor" if hasattr(user, "vendor") else "customer")
    )
    incomplete_profile = not all([
        getattr(profile, "profile_picture", None),
        getattr(profile, "date_of_birth", None),
        getattr(profile, "location", None),
    ])

    if redirect_response:
        response = HttpResponseRedirect(_frontend_home())
    else:
        response = Response({
            "success": True,
            "authenticated": True,
            "incomplete_profile": incomplete_profile,
            "user": {
                "id": user.pk,
                "username": user.username,
                "email": user.email,
                "role": role,
            },
        }, status=status.HTTP_200_OK)

    for cookie in ("visitorAccessToken", "visitorRefreshToken", "visitorId", "user_sessionid", "sessionid"):
        response.delete_cookie(cookie, path="/")

    response.set_cookie(
        "accessToken", str(refresh.access_token), httponly=True,
        secure=request.is_secure(), samesite="Lax", max_age=5 * 60, path="/",
    )
    response.set_cookie(
        "refreshToken", str(refresh), httponly=True,
        secure=request.is_secure(), samesite="Lax",
        max_age=365 * 24 * 3600, path="/",
    )
    update_last_login(None, user)
    response["Cache-Control"] = "no-store"
    response["Referrer-Policy"] = "no-referrer"
    return response


class GoogleLoginView(APIView):
    """Exchange a verified Google ID token for Maa Mara's own JWT cookies."""
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "social_auth"

    def post(self, request):
        credential = request.data.get("credential") or request.data.get("id_token")
        if not isinstance(credential, str) or not credential.strip():
            return Response(
                {"success": False, "error": "Google credential is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = authenticate_google_credential(credential.strip())
            return _issue_local_session(request, user)
        except AuthenticationFailed as exc:
            return Response(
                {"success": False, "error": str(exc.detail)},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except APIException:
            raise
        except Exception:
            logger.exception("Maa Mara Google sign-in failed")
            return Response(
                {"success": False, "error": "We could not complete Google sign-in. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AppleAuthConfigView(APIView):
    """Expose public Apple configuration only; never expose the private key."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        enabled = apple_configuration_is_ready()
        return Response({
            "enabled": enabled,
            "clientId": settings.APPLE_CLIENT_ID if enabled else "",
            "redirectUrl": settings.APPLE_REDIRECT_URI if enabled else "",
            "bundleId": settings.APPLE_BUNDLE_ID,
        })


class AppleNativeNonceView(APIView):
    """One-time nonce for native iOS Apple sign-in; the client sends its SHA-256 to Apple."""
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "social_auth"

    def get(self, request):
        response = Response({"nonce": issue_nonce()})
        response["Cache-Control"] = "no-store"
        return response


class AppleLoginStartView(APIView):
    """Start the Apple website flow with short-lived, HttpOnly state and nonce cookies."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        if not apple_configuration_is_ready():
            return Response(
                {"error": "Apple sign-in is not configured. Please use Google or email and password."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        state = secrets.token_urlsafe(32)
        raw_nonce = secrets.token_urlsafe(32)
        nonce = hashlib.sha256(raw_nonce.encode("utf-8")).hexdigest()
        query = urllib.parse.urlencode({
            "client_id": settings.APPLE_CLIENT_ID,
            "redirect_uri": settings.APPLE_REDIRECT_URI,
            "response_type": "code",
            "response_mode": "form_post",
            "scope": "name email",
            "state": state,
            "nonce": nonce,
        })
        callback_path = f"{str(getattr(settings, 'PUBLIC_PATH_PREFIX', '') or '').rstrip('/')}/api/apple/callback/"
        response = HttpResponseRedirect(f"{APPLE_ISSUER}/auth/authorize?{query}")
        cookie_options = {
            "max_age": 300, "secure": True, "httponly": True,
            "samesite": "None", "path": callback_path or "/api/apple/callback/",
        }
        response.set_cookie(APPLE_STATE_COOKIE, state, **cookie_options)
        response.set_cookie(APPLE_NONCE_COOKIE, nonce, **cookie_options)
        response["Cache-Control"] = "no-store"
        response["Referrer-Policy"] = "no-referrer"
        return response


class AppleLoginCallbackView(APIView):
    """Validate Apple's website callback, exchange its code, verify the token and issue Maa Mara cookies."""
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "social_auth"

    def post(self, request):
        state = str(request.data.get("state") or "")
        expected_state = request.COOKIES.get(APPLE_STATE_COOKIE, "")
        nonce = request.COOKIES.get(APPLE_NONCE_COOKIE, "")
        if not state or not expected_state or not secrets.compare_digest(state, expected_state) or not nonce:
            return Response(
                {"error": "Apple sign-in state validation failed. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if request.data.get("error"):
            return HttpResponseRedirect(f"{_frontend_home()}?apple=cancelled")

        code = request.data.get("code")
        if not isinstance(code, str) or not code.strip():
            return Response(
                {"error": "Apple did not return an authorization code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token_response = exchange_apple_authorization_code(code.strip())
            user_payload = request.data.get("user") or {}
            if isinstance(user_payload, str):
                try:
                    user_payload = json.loads(user_payload)
                except ValueError:
                    user_payload = {}
            if not isinstance(user_payload, dict):
                user_payload = {}
            name = user_payload.get("name") or {}
            if not isinstance(name, dict):
                name = {}
            full_name = " ".join(
                part.strip() for part in (name.get("firstName", ""), name.get("lastName", ""))
                if isinstance(part, str) and part.strip()
            )
            user = authenticate_apple_credential(
                token_response["id_token"],
                expected_nonce=nonce,
                supplied_name=full_name,
            )
            response = _issue_local_session(request, user, redirect_response=True)
            callback_path = f"{str(getattr(settings, 'PUBLIC_PATH_PREFIX', '') or '').rstrip('/')}/api/apple/callback/"
            response.delete_cookie(APPLE_STATE_COOKIE, path=callback_path or "/api/apple/callback/", samesite="None")
            response.delete_cookie(APPLE_NONCE_COOKIE, path=callback_path or "/api/apple/callback/", samesite="None")
            return response
        except AuthenticationFailed as exc:
            logger.info("Apple sign-in rejected: %s", exc.detail)
            return HttpResponseRedirect(f"{_frontend_home()}?apple=failed")
        except Exception:
            logger.exception("Maa Mara Apple callback failed")
            return HttpResponseRedirect(f"{_frontend_home()}?apple=failed")


class AppleLoginView(APIView):
    """Verify a native iOS Apple identity token and issue Maa Mara JWT cookies."""
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "social_auth"

    def post(self, request):
        if not apple_configuration_is_ready():
            return Response(
                {"success": False, "error": "Apple sign-in is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        identity_token = request.data.get("id_token") or request.data.get("identity_token")
        nonce = request.data.get("nonce")
        supplied_name = request.data.get("full_name") or ""
        if not isinstance(identity_token, str) or not identity_token.strip():
            return Response(
                {"success": False, "error": "Apple identity token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            # The nonce must be one this server issued moments ago (single use).
            expected_nonce = consume_nonce(nonce.strip() if isinstance(nonce, str) else "")
            user = authenticate_apple_credential(
                identity_token.strip(),
                expected_nonce=expected_nonce,
                supplied_name=supplied_name if isinstance(supplied_name, str) else "",
            )
            return _issue_local_session(request, user)
        except AuthenticationFailed as exc:
            return Response(
                {"success": False, "error": str(exc.detail)},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except APIException:
            raise
        except Exception:
            logger.exception("Maa Mara native Apple sign-in failed")
            return Response(
                {"success": False, "error": "We could not complete Apple sign-in. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
