"""
Allow cookie-based authentication from the bundled Capacitor WebView.

The native app's origin is https://localhost while the API uses the
tailnet HTTPS hostname. Cookies used by cross-origin requests must therefore
be SameSite=None and Secure. Apply these attributes only to requests from the
exact native WebView origin so existing website/development cookie behavior
is unchanged.
"""


class NativeWebViewCookieMiddleware:
    NATIVE_ORIGINS = {"https://localhost", "capacitor://localhost", "ionic://localhost"}  # Android, iOS (default Capacitor scheme), legacy iOS

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        origin = (request.headers.get("Origin") or "").rstrip("/")

        if origin in self.NATIVE_ORIGINS:
            for cookie in response.cookies.values():
                cookie["samesite"] = "None"
                cookie["secure"] = True

        return response
