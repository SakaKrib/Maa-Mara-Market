import logging

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.mergeVisitortoUserData import merge_visitor_data_to_user
from core.models import Profile, Wallet

from .google_auth import authenticate_google_credential

logger = logging.getLogger(__name__)
User = get_user_model()
REFRESH_COOKIE_MAX_AGE = 365 * 24 * 3600


class GoogleLoginView(APIView):
    """Exchange a verified Google ID token for Maa Mara's own JWT cookies."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        credential = request.data.get("credential") or request.data.get("id_token")
        if not isinstance(credential, str) or not credential.strip():
            return Response(
                {"success": False, "error": "Google credential is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = authenticate_google_credential(credential.strip())
            profile, _ = Profile.objects.get_or_create(user=user)
            Wallet.objects.get_or_create(
                user=user,
                defaults={"balance": 0, "earned_coins": 0},
            )

            visitor_id = (
                request.COOKIES.get("visitorId")
                or request.data.get("visitorId")
                or request.data.get("visitor_id")
            )
            if visitor_id:
                merge_visitor_data_to_user(user, visitor_id)

            refresh = RefreshToken.for_user(user)
            role = (
                "admin"
                if user.is_superuser or user.is_staff
                else ("vendor" if hasattr(user, "vendor") else "customer")
            )
            incomplete_profile = not all(
                [
                    getattr(profile, "profile_picture", None),
                    getattr(profile, "date_of_birth", None),
                    getattr(profile, "location", None),
                ]
            )

            response = Response(
                {
                    "success": True,
                    "authenticated": True,
                    "incomplete_profile": incomplete_profile,
                    "user": {
                        "id": user.pk,
                        "username": user.username,
                        "email": user.email,
                        "role": role,
                    },
                },
                status=status.HTTP_200_OK,
            )
            response.delete_cookie("visitorAccessToken", path="/")
            response.delete_cookie("visitorRefreshToken", path="/")
            response.delete_cookie("visitorId", path="/")
            response.delete_cookie("user_sessionid", path="/")
            response.delete_cookie("sessionid", path="/")
            response.set_cookie(
                "accessToken",
                str(refresh.access_token),
                httponly=True,
                secure=request.is_secure(),
                samesite="Lax",
                max_age=5 * 60,
                path="/",
            )
            response.set_cookie(
                "refreshToken",
                str(refresh),
                httponly=True,
                secure=request.is_secure(),
                samesite="Lax",
                max_age=REFRESH_COOKIE_MAX_AGE,
                path="/",
            )
            return response
        except Exception as exc:
            from rest_framework.exceptions import APIException

            if isinstance(exc, APIException):
                raise
            logger.exception("Maa Mara Google sign-in failed")
            return Response(
                {
                    "success": False,
                    "error": "We could not complete Google sign-in. Please try again.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
