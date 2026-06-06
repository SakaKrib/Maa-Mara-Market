from urllib.parse import parse_qs
from http.cookies import SimpleCookie

from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth.models import AnonymousUser

jwt_auth = JWTAuthentication()


@database_sync_to_async
def get_user_from_token(token):
    validated_token = jwt_auth.get_validated_token(token)
    return jwt_auth.get_user(validated_token)


class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        headers = dict(scope.get("headers", []))
        token = None

        # -------------------------
        # COOKIE AUTH
        # -------------------------
        cookie_header = headers.get(b"cookie")

        if cookie_header:
            cookie = SimpleCookie()
            cookie.load(cookie_header.decode())

            # ⚠️ make sure this matches your real cookie name
            cookie_value = cookie.get("accessToken") or cookie.get("access")

            if cookie_value:
                token = cookie_value.value

        # -------------------------
        # QUERY PARAM fallback (optional)
        # -------------------------
        if not token:
            query_string = parse_qs(scope.get("query_string", b"").decode())
            token = query_string.get("token", [None])[0]

        # -------------------------
        # NO TOKEN → allow but mark anonymous
        # -------------------------
        if not token:
            scope["user"] = AnonymousUser()
            return await self.inner(scope, receive, send)

        # -------------------------
        # VALIDATE TOKEN SAFELY
        # -------------------------
        try:
            user = await get_user_from_token(token)
            scope["user"] = user

        except Exception as e:
            print("❌ WS JWT FAILED:", type(e).__name__, str(e))
            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)