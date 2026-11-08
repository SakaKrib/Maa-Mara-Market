"""Single place that builds public website links used in emails and redirects.

Links must carry the same public path prefix (e.g. /maamara) that the website is
served under, otherwise they open a different route than the one intended. The
same https URL also doubles as the Android/iOS app link, so an email opens in
the installed app when the app is verified for that domain.
"""
from urllib.parse import urlsplit

from django.conf import settings


def frontend_base():
    """FRONTEND_URL plus the public path prefix, without a trailing slash."""
    base = str(getattr(settings, "FRONTEND_URL", "") or "").strip().rstrip("/")
    prefix = str(getattr(settings, "PUBLIC_PATH_PREFIX", "") or "").strip().rstrip("/")
    if prefix and prefix != "/":
        if urlsplit(base).path.rstrip("/") != prefix:
            base = base + prefix
    return base


def web_url(path="/"):
    path = "/" + str(path or "").lstrip("/")
    return frontend_base() + path
