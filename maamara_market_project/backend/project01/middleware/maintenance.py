"""Enforce site maintenance for mutating API requests without stopping callbacks."""
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

jwt_auth = JWTAuthentication()

# These endpoints are required for authentication, account recovery, and
# asynchronous payment-provider callbacks. They must keep working during
# maintenance so existing orders and payments can complete safely.
ALLOWED_WRITE_PREFIXES = (
    "/api/login/",
    "/api/logout/",
    "/api/token/refresh/",
    "/api/get-csrf-token/",
    "/api/check-auth/",
    "/api/password-reset/",
    "/api/password-reset-confirm/",
    "/api/maintenance/",
    "/api/pesapal/ipn/",
    "/api/pesapal/callback/",
    "/api/paypal/webhook/",
    "/api/mpesa/stk-callback/",
    "/api/mpesa/stk-timeout/",
    "/api/mpesa/refund/result/",
    "/api/mpesa/refund/timeout/",
    "/mpesa/result",
    "/mpesa/timeout",
    "/kcb/callback/",
    "/paypal-payout/webhook/",
)


def _request_user(request):
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        return user

    # The frontend authenticates through an HttpOnly JWT cookie, which is not
    # populated by Django's session AuthenticationMiddleware.
    token = request.COOKIES.get("accessToken")
    if not token:
        return None
    try:
        validated = jwt_auth.get_validated_token(token)
        return jwt_auth.get_user(validated)
    except Exception:
        return None


class MaintenanceModeMiddleware:
    """Block non-admin write requests while leaving reads and payment callbacks live."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in ("GET", "HEAD", "OPTIONS", "TRACE"):
            return self.get_response(request)

        path = request.path_info or request.path
        if path.startswith(ALLOWED_WRITE_PREFIXES):
            return self.get_response(request)

        user = _request_user(request)
        if user and (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)):
            return self.get_response(request)

        # Only enforce maintenance for API writes; non-API provider callbacks
        # are explicitly allowlisted above.
        if not path.startswith("/api/"):
            return self.get_response(request)

        from core.models import SiteMaintenanceSettings

        if not SiteMaintenanceSettings.objects.filter(pk=1, enabled=True).exists():
            return self.get_response(request)

        return JsonResponse(
            {
                "detail": (
                    "Maa Mara Market is temporarily in maintenance mode. "
                    "You can still view your existing orders and track deliveries."
                ),
                "maintenance_mode": True,
            },
            status=503,
        )
