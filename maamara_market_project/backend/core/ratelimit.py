"""Small cache-backed rate limiter for plain Django and DRF function views."""
import functools

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def hit(scope, ident, limit, window):
    """Count one hit; return True when the caller is over the limit."""
    key = f"rl:{scope}:{ident}"
    if cache.add(key, 1, window):
        return False
    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, window)
        return False
    return count > limit


def rate_limit(scope, limit, window=60):
    """Limit a view per client IP: at most `limit` calls per `window` seconds."""

    def decorator(view):
        @functools.wraps(view)
        def wrapped(request, *args, **kwargs):
            if not getattr(settings, "RATE_LIMITS_ENABLED", True):
                return view(request, *args, **kwargs)
            if hit(scope, client_ip(request), limit, window):
                return JsonResponse(
                    {"detail": "Too many requests. Please wait a moment and try again."},
                    status=429,
                )
            return view(request, *args, **kwargs)

        return wrapped

    return decorator
