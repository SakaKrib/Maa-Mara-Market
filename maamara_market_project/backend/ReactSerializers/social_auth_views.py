import hashlib
import json
import logging
import secrets
import urllib.parse

from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException, AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.mergeVisitortoUserData import merge_visitor_data_to_user
from core.models import Profile, Wallet

from .apple_auth import (
    APPLE_ISSUER,
    apple_configuration_is_ready,
    authenticate_apple_credential,
    exchange_apple_authorization_code,
)
from .google_auth import authenticate_google_credential

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
    throttle_classes = [AnonRateThrottle]

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
    throttle_classes = [AnonRateThrottle]

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
    throttle_classes = [AnonRateThrottle]

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
            user = authenticate_apple_credential(
                identity_token.strip(),
                expected_nonce=nonce.strip() if isinstance(nonce, str) else "",
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
