"""Work out which country a storefront visit came from.

Order of trust: the CDN's country header, then the visitor's IP address looked
up with two providers, then the time zone the browser reports (for example
``Africa/Nairobi`` -> Kenya). The time zone is the last resort because it only
says where the device is set up, but it works for local, proxied and private
addresses where an IP lookup never can, so the geography is not left blank.
"""
import logging
import os
from functools import lru_cache
from ipaddress import ip_address

import requests
from django.core.cache import cache

logger = logging.getLogger(__name__)

GEO_OK_SECONDS = 7 * 24 * 3600
GEO_FAIL_SECONDS = 10 * 60  # a failed lookup is retried soon, never remembered forever

_FALLBACK_ZONES = {
    "Africa/Nairobi": "KE", "Africa/Kampala": "UG", "Africa/Dar_es_Salaam": "TZ",
    "Africa/Kigali": "RW", "Africa/Addis_Ababa": "ET", "Africa/Johannesburg": "ZA",
    "Africa/Lagos": "NG", "Africa/Accra": "GH", "Africa/Cairo": "EG",
    "Europe/London": "GB", "America/New_York": "US", "America/Chicago": "US",
    "America/Los_Angeles": "US", "Asia/Kolkata": "IN", "Asia/Dubai": "AE",
    "Europe/Berlin": "DE", "Europe/Paris": "FR",
}


def _tz_files(name):
    candidates = [f"/usr/share/zoneinfo/{name}", f"/usr/share/lib/zoneinfo/{name}"]
    for path in candidates:
        if os.path.exists(path):
            with open(path, encoding="utf-8") as handle:
                return handle.read()
    try:  # the pip "tzdata" package ships the same tables
        from importlib import resources
        return (resources.files("tzdata") / "zoneinfo" / name).read_text(encoding="utf-8")
    except Exception:
        return ""


@lru_cache(maxsize=1)
def _zone_countries():
    table = dict(_FALLBACK_ZONES)
    for line in _tz_files("zone.tab").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 3:
            table[parts[2].strip()] = parts[0].strip()
    return table


@lru_cache(maxsize=1)
def country_names():
    names = {"KE": "Kenya", "US": "United States", "GB": "United Kingdom"}
    for line in _tz_files("iso3166.tab").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 2:
            names[parts[0].strip()] = parts[1].strip()
    return names


def country_name_for(code):
    code = (code or "").upper()
    return country_names().get(code, code)


def country_from_timezone(timezone_name):
    """ISO country code for an IANA time zone name, or ''."""
    name = (timezone_name or "").strip()[:64]
    if not name or "/" not in name:
        return ""
    return _zone_countries().get(name, "")


def _is_public_ip(ip):
    try:
        parsed = ip_address(ip)
    except (TypeError, ValueError):
        return False
    return not (parsed.is_private or parsed.is_loopback or parsed.is_reserved or parsed.is_link_local)


def _lookup_providers(ip):
    """Yield (code, name) from each free provider until one answers."""
    attempts = (
        (f"https://ipwho.is/{ip}", lambda d: (d.get("country_code"), d.get("country")) if d.get("success", True) else (None, None)),
        (f"https://ipapi.co/{ip}/json/", lambda d: (d.get("country_code"), d.get("country_name"))),
    )
    for url, pick in attempts:
        try:
            response = requests.get(url, timeout=1.5, headers={"User-Agent": "Maa-Mara-Market-Traffic/1.0"})
            if not response.ok:
                continue
            code, name = pick(response.json() or {})
            code = (code or "").upper()
            if len(code) == 2 and code.isalpha():
                yield code, name or ""
                return
        except Exception:
            logger.debug("IP geolocation provider failed for %s", url, exc_info=True)


def country_from_ip(ip):
    if not _is_public_ip(ip):
        return "", ""
    key = f"traffic-geo:{ip}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    result = ("", "")
    for code, name in _lookup_providers(ip):
        result = (code, name or country_name_for(code))
    cache.set(key, result, GEO_OK_SECONDS if result[0] else GEO_FAIL_SECONDS)
    return result


def resolve_country(headers, ip, timezone_name=""):
    """(code, name) from CDN header, then IP, then the browser time zone."""
    code = (
        headers.get("HTTP_CF_IPCOUNTRY") or headers.get("HTTP_X_COUNTRY_CODE") or headers.get("HTTP_X_GEO_COUNTRY") or ""
    ).upper()
    if len(code) == 2 and code.isalpha() and code != "XX":
        return code, country_name_for(code)
    code, name = country_from_ip(ip)
    if code:
        return code, name or country_name_for(code)
    code = country_from_timezone(timezone_name)
    if code:
        return code, country_name_for(code)
    return "", ""
