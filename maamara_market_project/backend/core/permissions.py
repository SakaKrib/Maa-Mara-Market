from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class IsAuthenticatedOrVisitor(BasePermission):
    """Allow an authenticated user or a visitor with a cookie-bound visitor token."""

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return True

        visitor_id = request.COOKIES.get("visitorId")
        visitor_token = request.COOKIES.get("visitorAccessToken")
        if not visitor_id or not visitor_token:
            return False

        try:
            validated = JWTAuthentication().get_validated_token(visitor_token)
        except (InvalidToken, TokenError):
            return False

        token_visitor_id = str(validated.get("visitor_id", ""))
        return bool(validated.get("visitor", False) and token_visitor_id == str(visitor_id))
