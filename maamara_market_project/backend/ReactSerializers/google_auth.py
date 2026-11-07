from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils.text import slugify
from rest_framework.exceptions import AuthenticationFailed

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token

User = get_user_model()
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def verify_google_credential(credential: str) -> dict:
    """Verify a Google Identity Services ID token against the Web OAuth client."""
    client_id = str(getattr(settings, "GOOGLE_CLIENT_ID", "") or "").strip()
    if not isinstance(credential, str) or not credential.strip() or not client_id:
        raise AuthenticationFailed("Google sign-in is not configured.")

    try:
        claims = id_token.verify_oauth2_token(
            credential.strip(),
            GoogleRequest(),
            audience=client_id,
        )
    except (ValueError, GoogleAuthError) as exc:
        raise AuthenticationFailed("Google could not verify this sign-in.") from exc

    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise AuthenticationFailed("Invalid Google token issuer.")
    if not str(claims.get("sub") or "").strip():
        raise AuthenticationFailed("Google account identifier is missing.")

    email = str(claims.get("email") or "").strip().lower()
    if not email or claims.get("email_verified") is not True:
        raise AuthenticationFailed("A verified Google email address is required.")
    return claims


def _unique_username(email: str) -> str:
    maximum = User._meta.get_field("username").max_length or 150
    base = (slugify(email.split("@", 1)[0]) or "social-user")[:maximum].rstrip("-")
    base = base or "social-user"
    candidate = base
    suffix = 2
    while User.objects.filter(username__iexact=candidate).exists():
        ending = f"-{suffix}"
        candidate = f"{base[:maximum - len(ending)].rstrip('-')}{ending}"
        suffix += 1
    return candidate


@transaction.atomic
def authenticate_google_credential(credential: str) -> User:
    """Resolve Google sub first; link a new sub only to one verified-email match."""
    claims = verify_google_credential(credential)
    subject = str(claims["sub"])
    email = str(claims["email"]).strip().lower()

    social = (
        SocialAccount.objects.select_for_update()
        .select_related("user")
        .filter(provider="google", uid=subject)
        .first()
    )
    if social:
        user = social.user
    else:
        matches = list(
            User.objects.select_for_update()
            .filter(email__iexact=email)
            .order_by("pk")[:2]
        )
        if len(matches) > 1:
            raise AuthenticationFailed("This email is associated with multiple accounts. Please contact support.")

        if matches:
            user = matches[0]
            if SocialAccount.objects.filter(provider="google", user=user).exclude(uid=subject).exists():
                raise AuthenticationFailed("This account is already linked to a different Google account.")
        else:
            full_name = str(claims.get("name") or "").strip()
            first_name = str(claims.get("given_name") or "").strip()
            last_name = str(claims.get("family_name") or "").strip()
            if full_name and (not first_name or not last_name):
                parts = full_name.split()
                first_name = first_name or (parts[0] if parts else "")
                last_name = last_name or (" ".join(parts[1:]) if len(parts) > 1 else "")
            user = User.objects.create_user(
                username=_unique_username(email),
                email=email,
                password=None,
                first_name=first_name[:150],
                last_name=last_name[:150],
            )

        if not user.is_active:
            raise AuthenticationFailed("This account is inactive.")

        try:
            with transaction.atomic():
                social, _ = SocialAccount.objects.get_or_create(
                    provider="google",
                    uid=subject,
                    defaults={"user": user, "extra_data": claims},
                )
        except IntegrityError:
            social = (
                SocialAccount.objects.select_for_update()
                .select_related("user")
                .filter(provider="google", uid=subject)
                .first()
            )
            if social is None:
                raise
        if social.user_id != user.pk:
            raise AuthenticationFailed("This Google account is already linked to another user.")

    if not user.is_active:
        raise AuthenticationFailed("This account is inactive.")

    updates = []
    if not user.email:
        user.email = email
        updates.append("email")
    if not user.first_name and claims.get("given_name"):
        user.first_name = str(claims["given_name"])[:150]
        updates.append("first_name")
    if not user.last_name and claims.get("family_name"):
        user.last_name = str(claims["family_name"])[:150]
        updates.append("last_name")
    if updates:
        user.save(update_fields=updates)

    canonical_email = (user.email or email).strip().lower()
    if EmailAddress.objects.filter(email__iexact=canonical_email).exclude(user=user).exists():
        raise AuthenticationFailed("This email is already associated with another account.")
    address, _ = EmailAddress.objects.get_or_create(
        user=user,
        email=canonical_email,
        defaults={"verified": True, "primary": not EmailAddress.objects.filter(user=user, primary=True).exists()},
    )
    if not address.verified:
        address.verified = True
        address.save(update_fields=["verified"])
    if not social.extra_data:
        social.extra_data = claims
        social.save(update_fields=["extra_data"])
    return user
