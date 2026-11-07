from urllib.parse import urlsplit

from django import template
from django.conf import settings

register = template.Library()


def _https_url(value):
    value = str(value or "").strip()
    try:
        parsed = urlsplit(value)
    except ValueError:
        return ""
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        return ""
    return value


@register.simple_tag
def email_app_links():
    """Return safe public app destinations for every shared email template."""
    frontend_url = str(getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
    prefix = str(getattr(settings, "PUBLIC_PATH_PREFIX", "") or "").strip()
    if prefix and prefix != "/":
        current_path = urlsplit(frontend_url).path.rstrip("/")
        if current_path != prefix.rstrip("/"):
            frontend_url = frontend_url + prefix.rstrip("/")
    return {
        "frontend_url": _https_url(frontend_url),
        "android": _https_url(getattr(settings, "ANDROID_APP_DOWNLOAD_URL", "")),
        "ios": _https_url(getattr(settings, "IOS_APP_DOWNLOAD_URL", "")),
    }
