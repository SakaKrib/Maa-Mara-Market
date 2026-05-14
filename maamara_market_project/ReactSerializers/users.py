from django.contrib.auth import authenticate, login as auth_login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie, csrf_protect
from django.middleware.csrf import get_token
from core.models import Profile  # Adjust based on your actual model
import logging
from django.views.decorators.http import require_http_methods
logger = logging.getLogger(__name__)
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
import json
from django.utils.decorators import method_decorator
from rest_framework.decorators import permission_classes
from django.contrib.auth import login
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from vendorDashboard.models import Vendor
from core.mergeVisitortoUserData import merge_visitor_data_to_user
from django.contrib.auth.hashers import check_password
import bleach
from datetime import timedelta
import uuid

logger = logging.getLogger(__name__)

# @ensure_csrf_cookie
# def get_csrf_token(request):
#     return JsonResponse({'csrfToken': request.META.get('CSRF_COOKIE', '')})


@ensure_csrf_cookie
def get_csrf_token(request):
    csrf_token = get_token(request)
    return JsonResponse({'success': True, 'csrfToken': csrf_token})




class HybridCheckAuthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        # Session-based authentication check
        user = request.user
        if user.is_authenticated and user.is_superuser:
            role = self.get_role(user)
            return Response({
                'isAuthenticated': True,
                'authType': 'session',
                'user': {
                    'username': user.username,
                    'email': user.email,
                    'role': role,
                    'id': user.id
                }
            }, status=status.HTTP_200_OK)

        # JWT-based authentication check
        access_token = request.COOKIES.get('accessToken')
        if access_token:
            jwt_authenticator = JWTAuthentication()
            try:
                validated_token = jwt_authenticator.get_validated_token(access_token)
                user = jwt_authenticator.get_user(validated_token)
                role = self.get_role(user)

                response = Response({
                    'isAuthenticated': True,
                    'authType': 'jwt',
                    'user': {
                        'username': user.username,
                        'email': user.email,
                        'role': role,
                        'id': user.id
                    }
                }, status=status.HTTP_200_OK)
                # Clear session cookie if present
                response.delete_cookie('sessionid') 
                return response

            except (InvalidToken, TokenError):
                pass  # Fall through to visitor token check

        # Visitor token check
        visitor_token = request.COOKIES.get('visitorAccessToken')
        if visitor_token:
            # Assuming validate_visitor_token returns True if valid
            return Response({
                'isAuthenticated': True,
                'authType': 'visitor',
                'user': {
                    'username': 'visitor',
                    'role': 'customer',
                    'id': None,
                }
            }, status=status.HTTP_200_OK)

        # Default fallback: not authenticated
        return Response({'isAuthenticated': False, 'user': None}, status=status.HTTP_200_OK)


    def get_role(self, user):
        if user.is_superuser:
            return 'admin'
        elif hasattr(user, 'vendor'):
            return 'vendor'
        else:
            return 'customer'
        


logger = logging.getLogger("ReactSerializers.users")

@csrf_exempt
@permission_classes([AllowAny])
@require_http_methods(["POST"])
def login_view(request):
    logger.info("🔐 Login attempt received")

    # Get visitor_id from cookie or POST data (adjust according to your frontend)
    visitor_id = request.COOKIES.get("visitorId") or request.POST.get("visitorId")

    identifier = request.POST.get("username")  # Can be username or email
    password = request.POST.get("password")
    csrf_token = request.META.get('HTTP_X_CSRFTOKEN')

    logger.debug(f"Identifier: {identifier}, CSRF: {csrf_token}")

    # --- Django User authentication ---
    user = authenticate(request, username=identifier, password=password)

    if user is not None:
        auth_login(request, user)
        role = "admin" if user.is_superuser else ("vendor" if hasattr(user, "vendor") else "customer")
        # Ensure profile exists
        Profile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

         # Merge visitor data after login
        merge_visitor_data_to_user(user, visitor_id)

        incomplete_profile = not all([
            getattr(user.profile, "profile_picture", None),
            getattr(user.profile, "date_of_birth", None),
            getattr(user.profile, "location", None)
        ])

        response = JsonResponse({
            "success": True,
            "incomplete_profile": incomplete_profile,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": role
            }
        })
        response.delete_cookie('visitorAccessToken')
        response.delete_cookie('visitorRefreshToken')
        response.delete_cookie('visitorId')
        response.delete_cookie('user_sessionid')



        # Set JWT cookies
        response.set_cookie("accessToken", access_token, httponly=True, secure=False, samesite='Lax', max_age=300)
        response.set_cookie("refreshToken", refresh_token, httponly=True, secure=False, samesite='Lax', max_age=2592000)
        return response

    # --- Fallback to Vendor table ---
    try:
        vendor = Vendor.objects.get(email=identifier)
    except Vendor.DoesNotExist:
        try:
            vendor = Vendor.objects.get(username=identifier)
        except Vendor.DoesNotExist:
            return JsonResponse({"success": False, "error": "Invalid credentials"}, status=401)

    if check_password(password, vendor.password):
        refresh = RefreshToken.for_user(vendor.user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        response.delete_cookie('visitorAccessToken')
        response.delete_cookie('visitorRefreshToken')
        response.delete_cookie('visitorId')
        response.delete_cookie('user_sessionid')

        response = JsonResponse({
            "success": True,
            "incomplete_profile": False,
            "user": {
                "id": vendor.id,
                "username": vendor.username,
                "role": "vendor",
                "vendor_picture": getattr(vendor, "profile_picture", None)
            }
        })

        response.set_cookie("accessToken", access_token, httponly=True, secure=False, samesite='Lax', max_age=300)
        response.set_cookie("refreshToken", refresh_token, httponly=True, secure=False, samesite='Lax', max_age=2592000)
        return response

    return JsonResponse({"success": False, "error": "Invalid credentials"}, status=401)


# create acces tokens for visitors
import uuid
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken

class VisitorTokenView(APIView):
    authentication_classes = []  # No authentication needed
    permission_classes = []      # Allow any user

    def get(self, request):
        # 🔹 Check for logged-in user tokens first
        existingUserAccessToken = request.COOKIES.get("accessToken")
        existingUserRefreshToken = request.COOKIES.get("refreshToken")

        if existingUserAccessToken and existingUserRefreshToken:

            return Response({
                "message": "User tokens already exist — skipping visitor token creation"
            })

        # 🔹 Check if visitor tokens already exist
        existing_access = request.COOKIES.get("visitorAccessToken")
        existing_id = request.COOKIES.get("visitorId")

        if existing_access and existing_id:
            return Response({
                "message": "Visitor token already exists",
                "visitor_id": existing_id
            })

        # 🔹 Generate a new unique visitor ID
        visitor_id = str(uuid.uuid4())

        # 🔹 Create refresh token for visitor
        refresh = RefreshToken()
        refresh['visitor'] = True
        refresh['visitor_id'] = visitor_id
        refresh.set_exp(lifetime=timedelta(days=30))  # Refresh valid 30 days

        # 🔹 Create access token
        access = AccessToken()
        access['visitor'] = True
        access['visitor_id'] = visitor_id
        access.set_exp(lifetime=timedelta(days=30))  # Access valid 30 days

        # 🔹 Build response
        response = Response({
            'visitor_access': str(access),
            'visitor_refresh': str(refresh),
            'visitor_id': visitor_id
        })

        # 🔹 Set cookies for visitor
        response.set_cookie(
            'visitorAccessToken',
            str(access),
            httponly=True,
            secure=False,    # True in production
            samesite='Lax',  # 'None' in production
            max_age=30 * 24 * 3600
        )
        response.set_cookie(
            'visitorRefreshToken',
            str(refresh),
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=30 * 24 * 3600
        )
        response.set_cookie(
            'visitorId',
            visitor_id,
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=30 * 24 * 3600,
            path='/',
        )

        return response







from django.contrib.auth import logout
from django.http import JsonResponse

@permission_classes([IsAuthenticated])
@require_http_methods(["POST"])
def logout_view(request):
    # Log out the user from Django session
    logout(request)

    # Prepare response
    response = JsonResponse({"message": "Logged out successfully"})

    # Remove JWT cookies
    response.delete_cookie('accessToken')
    response.delete_cookie('refreshToken')

    return response

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils.decorators import method_decorator

User = get_user_model()
@method_decorator(csrf_exempt, name="dispatch")
class CookieRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_refresh = request.COOKIES.get("refreshToken")
        visitor_refresh = request.COOKIES.get("visitorRefreshToken")

        # -------- USER --------
        if user_refresh:
            try:
                refresh = RefreshToken(user_refresh)
                user_id = refresh["user_id"]

                new_access = str(refresh.access_token)

                response = Response({"accessToken": new_access})
                response.set_cookie(
                    "accessToken",
                    new_access,
                    httponly=True,
                    secure=False,
                    samesite="Lax",
                    max_age=3600,
                    path="/",
                )
                return response

            except TokenError:
                return Response({"error": "Invalid user refresh"}, status=401)

        # -------- VISITOR --------
        if visitor_refresh:
            try:
                refresh = RefreshToken(visitor_refresh)

                if refresh.get("visitor") is not True:
                    return Response({"error": "Not a visitor token"}, status=401)

                access = AccessToken()
                access["visitor"] = True
                access["visitor_id"] = refresh["visitor_id"]
                access.set_exp(timedelta(days=30))

                response = Response({"visitor_access": str(access)})
                response.set_cookie(
                    "visitorAccessToken",
                    str(access),
                    httponly=True,
                    secure=False,
                    samesite="Lax",
                    max_age=30 * 24 * 3600,
                    path="/",
                )
                return response

            except TokenError:
                return Response({"error": "Invalid visitor refresh"}, status=401)

        return Response({"error": "No refresh token"}, status=401)