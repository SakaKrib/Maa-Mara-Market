"""
Keep the public path prefix on request.path for the Django admin.

The shared proxy strips /maamara before forwarding, so under ASGI request.path
(and therefore get_full_path()) lacks the prefix. The admin then builds its
login redirect as next=/admin/, which lands outside this app. Resolution uses
path_info and is untouched; only request.path is corrected.
"""
from django.conf import settings


class AdminPublicPrefixMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        prefix = (getattr(settings, "FORCE_SCRIPT_NAME", None) or "").rstrip("/")
        if (
            prefix
            and request.path_info.startswith("/admin/")
            and not request.path.startswith(prefix + "/")
        ):
            request.path = prefix + request.path
        return self.get_response(request)
