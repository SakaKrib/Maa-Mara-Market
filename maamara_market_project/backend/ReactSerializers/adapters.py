from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from django.utils.text import slugify

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

try:
    from allauth.core.exceptions import ImmediateHttpResponse
except ImportError:  # Compatibility with older django-allauth releases.
    from allauth.exceptions import ImmediateHttpResponse


User = get_user_model()


class MyAdapter(DefaultSocialAccountAdapter):
    """Safely link verified Google identities to existing email accounts."""

    @staticmethod
    def _abort_google_login(reason):
        frontend_url = settings.FRONTEND_URL.rstrip("/")
        raise ImmediateHttpResponse(
            redirect(f"{frontend_url}/unauthorized?reason={reason}")
        )

    @staticmethod
    def _unique_username(email):
        """Build a stable email-based username without overwriting another user."""
        maximum_length = User._meta.get_field("username").max_length or 150
        email_prefix = email.split("@", 1)[0]
        base = (slugify(email_prefix) or "google-user")[:maximum_length].rstrip("-")
        base = base or "google-user"[:maximum_length]

        username = base
        counter = 2
        while User.objects.filter(username__iexact=username).exists():
            suffix = f"-{counter}"
            username = f"{base[:maximum_length - len(suffix)].rstrip('-')}{suffix}"
            counter += 1
        return username

    @staticmethod
    def _is_verified_google_email(sociallogin, email):
        account = getattr(sociallogin, "account", None)
        extra_data = getattr(account, "extra_data", {}) or {}
        claim = extra_data.get("email_verified")
        if claim is True or str(claim).strip().lower() == "true":
            return True

        # Some allauth provider versions expose the verified state via their
        # normalized EmailAddress objects rather than raw extra_data.
        for address in getattr(sociallogin, "email_addresses", []) or []:
            if (
                getattr(address, "verified", False)
                and (getattr(address, "email", "") or "").strip().casefold()
                == email.casefold()
            ):
                return True
        return False

    def pre_social_login(self, request, sociallogin):
        # Never re-link an identity that is already associated with a user.
        # Its existing local account remains authoritative even if profile data
        # later changes at Google.
        if getattr(sociallogin, "is_existing", False):
            return

        account = getattr(sociallogin, "account", None)
        if not account or getattr(account, "provider", None) != "google":
            return

        extra_data = getattr(account, "extra_data", {}) or {}
        email = (
            getattr(getattr(sociallogin, "user", None), "email", "")
            or extra_data.get("email")
            or ""
        ).strip()
        if not email:
            self._abort_google_login("google-email-missing")

        if not self._is_verified_google_email(sociallogin, email):
            self._abort_google_login("google-email-unverified")

        # Match case-insensitively so older mixed-case records do not create a
        # second account. If legacy duplicate emails exist, fail closed rather
        # than choosing an arbitrary account or linking the identity incorrectly.
        matches = list(
            User.objects.filter(email__iexact=email).order_by("pk")[:2]
        )
        if len(matches) > 1:
            self._abort_google_login("duplicate-local-email")

        if matches:
            sociallogin.connect(request, matches[0])

    def populate_user(self, request, sociallogin, data):
        """Populate a new Google user from Google's profile and email."""
        user = super().populate_user(request, sociallogin, data)
        account = getattr(sociallogin, "account", None)
        extra_data = getattr(account, "extra_data", {}) or {}

        email = (
            data.get("email")
            or extra_data.get("email")
            or getattr(user, "email", "")
            or ""
        ).strip()
        if email:
            user.email = email.lower()

        first_name = (
            data.get("first_name")
            or extra_data.get("given_name")
            or getattr(user, "first_name", "")
            or ""
        ).strip()
        last_name = (
            data.get("last_name")
            or extra_data.get("family_name")
            or getattr(user, "last_name", "")
            or ""
        ).strip()
        full_name = (
            data.get("name")
            or extra_data.get("name")
            or ""
        ).strip()

        if full_name and (not first_name or not last_name):
            name_parts = full_name.split()
            if not first_name and name_parts:
                first_name = name_parts[0]
            if not last_name and len(name_parts) > 1:
                last_name = " ".join(name_parts[1:])

        user.first_name = first_name[:150]
        user.last_name = last_name[:150]
        if user.email:
            user.username = self._unique_username(user.email)

        return user
