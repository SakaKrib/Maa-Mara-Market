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
    """Safe public destinations for the shared email footer.

    The website link is a normal https URL: when the app is installed and
    verified for this domain, Android/iOS open the app instead of the browser.
    Store links come from ANDROID_APP_LINK / IOS_APP_LINK and are hidden until set.
    """
    from core.public_urls import frontend_base

    site = _https_url(frontend_base())
    return {
        "frontend_url": site,
        "android": _https_url(getattr(settings, "ANDROID_APP_LINK", "")),
        "ios": _https_url(getattr(settings, "IOS_APP_LINK", "")),
        "primary_app_url": site,
        "primary_app_label": "Open Maa Mara Market",
    }
