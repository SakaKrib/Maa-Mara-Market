from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils.text import slugify
from rest_framework.exceptions import AuthenticationFailed

from .social_replay import reject_replay

from allauth.account.models import EmailAddress
from core.models import Profile
from allauth.socialaccount.models import SocialAccount

User = get_user_model()
APPLE_ISSUER = "https://appleid.apple.com"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
_jwk_client = None


def _apple_signing_key(token: str):
    """Reuse one JWKS client so Apple's keys are cached instead of fetched per login."""
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = jwt.PyJWKClient(APPLE_JWKS_URL, cache_keys=True, lifespan=3600)
    return _jwk_client.get_signing_key_from_jwt(token)


def apple_configuration_is_ready() -> bool:
    if hasattr(settings, "APPLE_SIGN_IN_ENABLED") and not settings.APPLE_SIGN_IN_ENABLED:
        return False
    return bool(
        str(getattr(settings, "APPLE_CLIENT_ID", "") or "").strip()
        and str(getattr(settings, "APPLE_TEAM_ID", "") or "").strip()
        and str(getattr(settings, "APPLE_KEY_ID", "") or "").strip()
        and str(getattr(settings, "APPLE_PRIVATE_KEY", "") or "").strip()
        and str(getattr(settings, "APPLE_REDIRECT_URI", "") or "").startswith("https://")
        and str(getattr(settings, "APPLE_BUNDLE_ID", "") or "").strip()
    )


def _apple_client_secret() -> str:
    if not apple_configuration_is_ready():
        raise AuthenticationFailed("Apple sign-in is not fully configured on the server.")
    now = int(time.time())
    try:
        return jwt.encode(
            {
                "iss": settings.APPLE_TEAM_ID,
                "iat": now,
                "exp": now + 300,
                "aud": APPLE_ISSUER,
                "sub": settings.APPLE_CLIENT_ID,
            },
            settings.APPLE_PRIVATE_KEY,
            algorithm="ES256",
            headers={"kid": settings.APPLE_KEY_ID},
        )
    except (ValueError, jwt.PyJWTError) as exc:
        raise AuthenticationFailed("Apple sign-in credentials could not be loaded.") from exc


def exchange_apple_authorization_code(code: str) -> dict:
    if not apple_configuration_is_ready():
        raise AuthenticationFailed("Apple sign-in is not configured.")
    if not isinstance(code, str) or not code.strip() or len(code) > 4096:
        raise AuthenticationFailed("Apple authorization code is missing or invalid.")

    body = urllib.parse.urlencode({
        "client_id": settings.APPLE_CLIENT_ID,
        "client_secret": _apple_client_secret(),
        "code": code.strip(),
        "grant_type": "authorization_code",
        "redirect_uri": settings.APPLE_REDIRECT_URI,
    }).encode("utf-8")
    request = urllib.request.Request(
        APPLE_TOKEN_URL,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        raise AuthenticationFailed("Apple could not validate the sign-in request.") from exc
    if not isinstance(payload.get("id_token"), str) or not payload["id_token"]:
        raise AuthenticationFailed("Apple did not return a valid identity token.")
    return payload


def verify_apple_identity_token(identity_token: str, expected_nonce: str) -> dict:
    if not isinstance(identity_token, str) or not identity_token or len(identity_token) > 16384:
        raise AuthenticationFailed("Apple identity token is missing or invalid.")
    if not isinstance(expected_nonce, str) or not expected_nonce:
        raise AuthenticationFailed("Apple sign-in nonce is required.")

    audiences = [
        value for value in (
            getattr(settings, "APPLE_CLIENT_ID", ""),
            getattr(settings, "APPLE_BUNDLE_ID", ""),
        ) if value
    ]
    if not audiences:
        raise AuthenticationFailed("Apple sign-in is not configured.")
    try:
        key = _apple_signing_key(identity_token)
        claims = jwt.decode(
            identity_token,
            key.key,
            algorithms=["RS256"],
            audience=audiences,
            issuer=APPLE_ISSUER,
            options={"require": ["iss", "aud", "exp", "sub", "nonce"]},
        )
    except jwt.PyJWTError as exc:
        raise AuthenticationFailed("Apple identity token could not be verified.") from exc
    except Exception as exc:  # JWKS download or network failure
        raise AuthenticationFailed("Apple sign-in is temporarily unavailable. Please try again.") from exc

    if not secrets_compare(str(claims.get("nonce") or ""), expected_nonce):
        raise AuthenticationFailed("Apple sign-in nonce validation failed.")
    if not str(claims.get("sub") or "").strip():
        raise AuthenticationFailed("Apple account identifier is missing.")
    return claims


def secrets_compare(left: str, right: str) -> bool:
    import hmac
    return hmac.compare_digest(left, right)


def _email_verified(value) -> bool:
    return value is True or (isinstance(value, str) and value.strip().lower() == "true")


def _unique_username(email: str) -> str:
    maximum = User._meta.get_field("username").max_length or 150
    base = (slugify(email.split("@", 1)[0]) or "apple-user")[:maximum].rstrip("-") or "apple-user"
    candidate, suffix = base, 2
    while User.objects.filter(username__iexact=candidate).exists():
        ending = f"-{suffix}"
        candidate = f"{base[:maximum - len(ending)].rstrip('-')}{ending}"
        suffix += 1
    return candidate


@transaction.atomic
def authenticate_apple_credential(identity_token: str, expected_nonce: str, supplied_name: str = "") -> User:
    """Resolve Apple's stable subject through Profile while preserving legacy links."""
    claims = verify_apple_identity_token(identity_token, expected_nonce)
    subject = str(claims["sub"])
    email = str(claims.get("email") or "").strip().lower()
    verified = _email_verified(claims.get("email_verified"))
    full_name = str(supplied_name or "").strip()[:255]

    linked_profile = (
        Profile.objects.select_for_update()
        .select_related("user")
        .filter(apple_subject=subject)
        .first()
    )
    legacy_social = None
    if linked_profile:
        user = linked_profile.user
    else:
        legacy_social = (
            SocialAccount.objects.select_for_update()
            .select_related("user")
            .filter(provider="apple", uid=subject)
            .first()
        )
        if legacy_social:
            user = legacy_social.user
        else:
            if not email or not verified:
                raise AuthenticationFailed(
                    "Apple did not provide a verified email for this account. Sign in using your existing method first."
                )
            matches = list(
                User.objects.select_for_update()
                .filter(email__iexact=email)
                .order_by("pk")[:2]
            )
            if len(matches) > 1:
                raise AuthenticationFailed(
                    "This email is associated with multiple accounts. Please contact support."
                )
            if matches:
                user = matches[0]
                existing_profile = Profile.objects.select_for_update().filter(user=user).first()
                if existing_profile and existing_profile.apple_subject and existing_profile.apple_subject != subject:
                    raise AuthenticationFailed("This account is already linked to a different Apple account.")
                if SocialAccount.objects.filter(provider="apple", user=user).exclude(uid=subject).exists():
                    raise AuthenticationFailed("This account is already linked to a different Apple account.")
            else:
                parts = full_name.split()
                user = User.objects.create_user(
                    username=_unique_username(email),
                    email=email,
                    password=None,
                    first_name=(parts[0] if parts else "")[:150],
                    last_name=(" ".join(parts[1:]) if len(parts) > 1 else "")[:150],
                )

    if not user.is_active:
        raise AuthenticationFailed("This account is inactive.")
    updates = []
    if email and verified and not user.email:
        user.email = email
        updates.append("email")
    if full_name:
        parts = full_name.split()
        if not user.first_name and parts:
            user.first_name = parts[0][:150]
            updates.append("first_name")
        if not user.last_name and len(parts) > 1:
            user.last_name = " ".join(parts[1:])[:150]
            updates.append("last_name")
    if updates:
        user.save(update_fields=updates)

    profile, _ = Profile.objects.select_for_update().get_or_create(user=user)
    if profile.apple_subject and profile.apple_subject != subject:
        raise AuthenticationFailed("This account is already linked to a different Apple account.")
    owner = Profile.objects.select_for_update().filter(apple_subject=subject).exclude(user=user).first()
    if owner:
        raise AuthenticationFailed("This Apple account is already linked to another user.")
    if not profile.apple_subject:
        try:
            profile.apple_subject = subject
            profile.save(update_fields=["apple_subject"])
        except IntegrityError as exc:
            raise AuthenticationFailed("This Apple account is already linked to another user.") from exc

    canonical_email = (user.email or email).strip().lower()
    if canonical_email:
        if EmailAddress.objects.filter(email__iexact=canonical_email).exclude(user=user).exists():
            raise AuthenticationFailed("This email is already associated with another account.")
        address, _ = EmailAddress.objects.get_or_create(
            user=user,
            email=canonical_email,
            defaults={
                "verified": verified,
                "primary": not EmailAddress.objects.filter(user=user, primary=True).exists(),
            },
        )
        if verified and not address.verified:
            address.verified = True
            address.save(update_fields=["verified"])

    if legacy_social and not legacy_social.extra_data:
        legacy_social.extra_data = claims
        legacy_social.save(update_fields=["extra_data"])

    # Claim the verified token only after account linking and profile checks pass.
    reject_replay(identity_token, claims)
    return user
