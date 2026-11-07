from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework import exceptions

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token

from .adapters import MyAdapter

GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
User = get_user_model()


def verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token against Maa Mara's configured Web Client ID."""
    client_id = str(getattr(settings, "GOOGLE_CLIENT_ID", "") or "").strip()
    if not credential or not client_id:
        raise exceptions.AuthenticationFailed(
            "Google sign-in is not configured. Please contact support."
        )

    try:
        claims = id_token.verify_oauth2_token(
            credential,
            GoogleRequest(),
            audience=client_id,
        )
    except (ValueError, GoogleAuthError) as exc:
        raise exceptions.AuthenticationFailed(
            "Google could not verify this sign-in. Please try again."
        ) from exc

    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise exceptions.AuthenticationFailed("Invalid Google token issuer.")

    subject = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower()
    if not subject:
        raise exceptions.AuthenticationFailed("Google account identifier is missing.")
    if not email or claims.get("email_verified") is not True:
        raise exceptions.AuthenticationFailed(
            "A verified Google email address is required."
        )

    return claims


@transaction.atomic
def authenticate_google_credential(credential: str) -> User:
    """Resolve or create one local user for a verified Google identity.

    The stable Google subject is the primary identity key. A verified email is
    used only to link an existing local account when that subject is not linked.
    """
    claims = verify_google_credential(credential)
    subject = str(claims["sub"])
    email = str(claims["email"]).strip().lower()

    social_account = (
        SocialAccount.objects.select_for_update()
        .select_related("user")
        .filter(provider="google", uid=subject)
        .first()
    )

    if social_account:
        user = social_account.user
    else:
        matching_users = list(
            User.objects.select_for_update()
            .filter(email__iexact=email)
            .order_by("pk")[:2]
        )
        if len(matching_users) > 1:
            raise exceptions.AuthenticationFailed(
                "This email is associated with multiple accounts. Please contact support."
            )

        if matching_users:
            user = matching_users[0]
            other_google_identity = SocialAccount.objects.filter(
                provider="google",
                user=user,
            ).exclude(uid=subject).exists()
            if other_google_identity:
                raise exceptions.AuthenticationFailed(
                    "This account is already linked to a different Google account."
                )
        else:
            username = MyAdapter._unique_username(email)
            full_name = str(claims.get("name") or "").strip()
            first_name = str(claims.get("given_name") or "").strip()
            last_name = str(claims.get("family_name") or "").strip()
            if full_name and (not first_name or not last_name):
                name_parts = full_name.split()
                if not first_name and name_parts:
                    first_name = name_parts[0]
                if not last_name and len(name_parts) > 1:
                    last_name = " ".join(name_parts[1:])

            user = User.objects.create_user(
                username=username,
                email=email,
                password=None,
                first_name=first_name[:150],
                last_name=last_name[:150],
            )

        if not user.is_active:
            raise exceptions.AuthenticationFailed("This account is inactive.")

        # A unique (provider, uid) constraint prevents the same Google identity
        # from being attached to two local users. Recheck the owner on retries.
        try:
            with transaction.atomic():
                social_account, _ = SocialAccount.objects.get_or_create(
                    provider="google",
                    uid=subject,
                    defaults={"user": user, "extra_data": claims},
                )
        except IntegrityError:
            social_account = (
                SocialAccount.objects.select_for_update()
                .select_related("user")
                .filter(provider="google", uid=subject)
                .first()
            )
            if social_account is None:
                raise

        if social_account.user_id != user.pk:
            raise exceptions.AuthenticationFailed(
                "This Google account is already linked to another user."
            )

    if not user.is_active:
        raise exceptions.AuthenticationFailed("This account is inactive.")

    # Keep the verified email recorded in django-allauth so existing account
    # and email-management screens continue to work after moving off redirects.
    email_address, _ = EmailAddress.objects.get_or_create(
        user=user,
        email=user.email or email,
        defaults={
            "verified": True,
            "primary": not EmailAddress.objects.filter(user=user, primary=True).exists(),
        },
    )
    if not email_address.verified:
        email_address.verified = True
        email_address.save(update_fields=["verified"])

    extra_data = social_account.extra_data or {}
    if not extra_data:
        social_account.extra_data = claims
        social_account.save(update_fields=["extra_data"])

    return user
