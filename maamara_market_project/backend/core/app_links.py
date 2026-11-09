"""Digital Asset Links / Universal Links files so emailed links open the apps.

Android only opens an https link in the app when the host serves
``/.well-known/assetlinks.json`` listing the app's package and signing-cert
SHA-256 fingerprint.  iOS needs ``/.well-known/apple-app-site-association``.
Both must be served from the *host root* (not below /maamara).
"""
from django.conf import settings
from django.http import JsonResponse


def _fingerprints():
    raw = getattr(settings, "ANDROID_APP_SHA256_CERT_FINGERPRINTS", "") or ""
    return [f.strip().upper() for f in str(raw).replace(";", ",").split(",") if f.strip()]


def assetlinks(request):
    fingerprints = _fingerprints()
    data = []
    if fingerprints:
        data.append({
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": getattr(settings, "ANDROID_APP_PACKAGE", "com.maamaramarket.app"),
                "sha256_cert_fingerprints": fingerprints,
            },
        })
    response = JsonResponse(data, safe=False)
    response["Cache-Control"] = "public, max-age=300"
    return response


def apple_app_site_association(request):
    team = (getattr(settings, "APPLE_TEAM_ID", "") or "").strip()
    bundle = (getattr(settings, "APPLE_BUNDLE_ID", "") or "").strip()
    prefix = (getattr(settings, "PUBLIC_PATH_PREFIX", "") or "").rstrip("/")
    details = []
    if team and bundle:
        details.append({
            "appID": f"{team}.{bundle}",
            "paths": [f"{prefix}/*" if prefix else "*"],
        })
    response = JsonResponse({"applinks": {"apps": [], "details": details}})
    response["Cache-Control"] = "public, max-age=300"
    return response
