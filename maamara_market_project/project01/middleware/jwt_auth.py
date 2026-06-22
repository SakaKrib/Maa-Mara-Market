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
        # COOKIE AUTH (ROBUST PARSING)
        # -------------------------
        cookie_header = headers.get(b"cookie")

        if cookie_header:
            cookie = SimpleCookie()
            cookie.load(cookie_header.decode())

            # IMPORTANT: must match your Django cookie name EXACTLY
            token = cookie.get("accessToken")
            if token:
                token = token.value

        # -------------------------
        # OPTIONAL QUERY PARAM FALLBACK
        # (can remove if you want stricter security)
        # -------------------------
        if not token:
            query_string = parse_qs(scope.get("query_string", b"").decode())
            token = query_string.get("token", [None])[0]

        # -------------------------
        # NO TOKEN → SAFE FAIL (NO EXCEPTION)
        # -------------------------
        if not token:
            print("❌ WS REJECT: No token provided")
            scope["user"] = AnonymousUser()
            return await self.inner(scope, receive, send)

        # -------------------------
        # VALIDATE TOKEN
        # -------------------------
        try:
            user = await get_user_from_token(token)
            scope["user"] = user
            print("WS AUTH SUCCESS:", user)

        except Exception as e:
            print("❌ WS AUTH FAILED:", type(e).__name__, str(e))
            scope["user"] = AnonymousUser()
            return await self.inner(scope, receive, send)

        return await self.inner(scope, receive, send)