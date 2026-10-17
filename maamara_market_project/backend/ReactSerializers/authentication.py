from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get("accessToken")
        if raw_token is None:
            return None
        try:
            validated_token = self.get_validated_token(raw_token)
        except (InvalidToken, TokenError):
            # An expired cookie should not block a valid Authorization header
            # handled by the next configured authentication class. The API
            # client can then refresh the cookie and retry protected requests.
            return None
        return self.get_user(validated_token), validated_token
