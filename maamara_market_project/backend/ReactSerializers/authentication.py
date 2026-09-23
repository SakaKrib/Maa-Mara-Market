from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get("accessToken")
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, TokenError):
            # A stale/expired user access cookie must not prevent DRF
            # permission classes such as IsAuthenticatedOrVisitor from
            # authenticating the same request as a visitor.
            #
            # The existing refresh flow can replace the user access cookie
            # when appropriate; returning None here also lets DRF continue
            # with the request's other authentication/permission handling.
            return None
