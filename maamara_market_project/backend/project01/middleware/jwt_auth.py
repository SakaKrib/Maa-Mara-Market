from http.cookies import SimpleCookie

from channels.db import database_sync_to_async
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken
import logging

logger = logging.getLogger(__name__)

jwt_auth = JWTAuthentication()


@database_sync_to_async
def get_user_from_token(token):
    validated_token = jwt_auth.get_validated_token(token)
    return jwt_auth.get_user(validated_token)


def _cookie_value(headers, name):
    cookie_header = headers.get(b"cookie")
    if not cookie_header:
        return None
    cookie = SimpleCookie()
    cookie.load(cookie_header.decode("latin-1"))
    morsel = cookie.get(name)
    return morsel.value if morsel else None


class JWTAuthMiddleware:
    """Authenticate WebSockets from HttpOnly cookies only.

    User access tokens populate scope["user"]. Visitor access tokens populate
    scope["visitor_id"] without attempting to create a Django user.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        scope["user"] = AnonymousUser()
        scope["visitor_id"] = None
        scope["is_visitor"] = False

        headers = dict(scope.get("headers", []))
        user_token = _cookie_value(headers, "accessToken")

        if user_token:
            try:
                scope["user"] = await get_user_from_token(user_token)
                return await self.inner(scope, receive, send)
            except (InvalidToken, TokenError):
                # Invalid/expired credentials are treated as anonymous.
                pass
            except Exception:
                # Authentication infrastructure failures must not expose token
                # contents or details to the client.
                logger.exception("Unexpected WebSocket JWT authentication failure")

        visitor_token = _cookie_value(headers, "visitorAccessToken")
        if visitor_token:
            try:
                token = AccessToken(visitor_token)
                if (\n                    token.get("token_type") == "access"\n                    and token.get("visitor") is True\n                    and token.get("visitor_id")\n                ):
                    scope["visitor_id"] = str(token["visitor_id"])
                    scope["is_visitor"] = True
            except (InvalidToken, TokenError):
                pass
            except Exception:
                logger.exception("Unexpected visitor-token authentication failure")

        return await self.inner(scope, receive, send)
