import uuid
import logging

from datetime import timedelta

from django.contrib.auth import authenticate, login as auth_login, logout
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password
from django.shortcuts import redirect
from django.http import JsonResponse
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import permission_classes, api_view

from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from core.models import Profile
from vendorDashboard.models import Vendor
from core.mergeVisitortoUserData import merge_visitor_data_to_user





from django.contrib.auth import get_user_model


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
        response.set_cookie("accessToken", access_token, httponly=True, secure=False, samesite='Lax',  max_age=5 * 60,
        path="/",)
        response.set_cookie("refreshToken", refresh_token, httponly=True, secure=False, samesite='Lax', max_age=2592000, path="/")
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



# google login success (fix frontend url in production, hide it in .env)
from django.shortcuts import redirect
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.utils.text import slugify
from allauth.socialaccount.models import SocialAccount
from rest_framework_simplejwt.tokens import RefreshToken
import logging

logger = logging.getLogger(__name__)

def google_login_success(request):

    # ❌ DO NOT RELY ON request.user
    # instead always pull SocialAccount directly
    try:
        social = SocialAccount.objects.get(provider="google", user=request.user)
    except SocialAccount.DoesNotExist:
        return redirect("http://127.0.0.1:5173/unauthorized")

    extra = social.extra_data

    # 🔑 PRIMARY IDENTITY (BEST): Google UID
    google_uid = social.uid  # "sub"
    email = extra.get("email")

    first_name = extra.get("given_name", "") or ""
    last_name = extra.get("family_name", "") or ""

    if not email:
        return redirect("http://127.0.0.1:5173/unauthorized")

    logger.info(f"Google UID: {google_uid}")
    logger.info(f"Google Email: {email}")

    # ================================
    # 🔥 1. FIND EXISTING USER (EMAIL FIRST)
    # ================================
    user = User.objects.filter(email=email).first()

    # ================================
    # 🔥 2. CREATE USER ONLY IF NOT EXISTS
    # ================================
    if not user:
        base_username = slugify(email.split("@")[0])
        username = base_username
        counter = 1

        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

    # ================================
    # 🔥 3. LINK SOCIAL ACCOUNT PROPERLY
    # ================================
    if social.user != user:
        social.user = user
        social.save()

    # ================================
    # 🔥 4. UPDATE MISSING INFO ONLY
    # ================================
    updated = False

    if first_name and not user.first_name:
        user.first_name = first_name
        updated = True

    if last_name and not user.last_name:
        user.last_name = last_name
        updated = True

    if updated:
        user.save()

    # ================================
    # 🔐 5. LOGIN PROPER BACKEND
    # ================================
    login(
        request,
        user,
        backend="django.contrib.auth.backends.ModelBackend"
    )

    # ================================
    # 🔥 6. JWT TOKENS
    # ================================
    refresh = RefreshToken.for_user(user)

    # ================================
    # 🔥 7. REDIRECT (YOUR FRONTEND)
    # ================================
    response = redirect("http://127.0.0.1:5173/login/auth-success")


    # 🔥 DELETE VISITOR TOKENS / SESSION
    response.delete_cookie("visitorAccessToken")
    response.delete_cookie("visitorRefreshToken")
    response.delete_cookie("visitorId")
    response.delete_cookie("user_sessionid")

    response.set_cookie(
        "accessToken",
        str(refresh.access_token),
        httponly=True,
        samesite="Lax",
        max_age=5 * 60,
        path="/",
    )

    response.set_cookie(
        "refreshToken",
        str(refresh),
        httponly=True,
        samesite="Lax",
        max_age=2592000,
        path="/"
    )

    return response



# create acces tokens for visitors

class VisitorTokenView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):

        # ---------------------------------------------------
        # 1. If user is logged in → DO NOT create visitor
        # ---------------------------------------------------
        if request.COOKIES.get("accessToken") and request.COOKIES.get("refreshToken"):
            return Response({
                "message": "Authenticated user detected — visitor not created"
            })

        # ---------------------------------------------------
        # 2. If visitor already exists → reuse it
        # ---------------------------------------------------
        existing_id = request.COOKIES.get("visitorId")
        existing_refresh = request.COOKIES.get("visitorRefreshToken")

        if existing_id and existing_refresh:
            return Response({
                "message": "Visitor already exists",
                "visitor_id": existing_id
            })

        # ---------------------------------------------------
        # 3. Create new visitor identity
        # ---------------------------------------------------
        visitor_id = str(uuid.uuid4())

        refresh = RefreshToken()
        refresh["visitor"] = True
        refresh["visitor_id"] = visitor_id

        access = refresh.access_token
        access["visitor"] = True
        access["visitor_id"] = visitor_id

        # ---------------------------------------------------
        # 4. Response (NO TOKEN LEAK IN JSON)
        # ---------------------------------------------------
        response = Response({
            "message": "Visitor created",
            "visitor_id": visitor_id
        })

        # ---------------------------------------------------
        # 5. Cookies (secure + consistent)
        # ---------------------------------------------------
        cookie_options = {
            "httponly": True,
            "secure": False,  # set True in production (HTTPS)
            "samesite": "Lax",
            "path": "/",
        }

        response.set_cookie(
            "visitorAccessToken",
            str(access),
            max_age=30 * 24 * 3600,
            **cookie_options
        )

        response.set_cookie(
            "visitorRefreshToken",
            str(refresh),
            max_age=30 * 24 * 3600,
            **cookie_options
        )

        response.set_cookie(
            "visitorId",
            visitor_id,
            max_age=30 * 24 * 3600,
            **cookie_options
        )

        return response



# logout view
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@require_http_methods(["POST"])
def logout_view(request):

    # 1. Django session logout
    logout(request)

    # 2. Blacklist refresh token (if using SimpleJWT blacklist)
    refresh_token = request.COOKIES.get("refreshToken")

    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            pass

    # 3. Response
    response = JsonResponse({"message": "Logged out successfully"})

    # 4. Correct cookie deletion (ONLY path/domain allowed)
    response.delete_cookie("accessToken", path="/")
    response.delete_cookie("refreshToken", path="/")

    return response


User = get_user_model()
class CookieRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_refresh = request.COOKIES.get("refreshToken")
        visitor_refresh = request.COOKIES.get("visitorRefreshToken")

        # -------- USER --------
        if user_refresh:
            try:
                refresh = RefreshToken(user_refresh)

                if refresh.payload.get("token_type") != "refresh":
                    return Response({"error": "Invalid token type"}, status=401)

                new_access = refresh.access_token

                response = Response({"message": "refreshed"})

                response.set_cookie(
                    "accessToken",
                    str(new_access),
                    httponly=True,
                    secure=False,
                    samesite="Lax",
                    max_age=5 * 60,
                    path="/",
                )

                return response

            except (TokenError, InvalidToken):
                response = Response({"error": "Invalid user refresh"}, status=401)
                response.delete_cookie("accessToken")
                response.delete_cookie("refreshToken")
                return response

        # -------- VISITOR --------
        if visitor_refresh:
            try:
                refresh = RefreshToken(visitor_refresh)

                if not refresh.payload.get("visitor"):
                    raise TokenError("Not a visitor token")

                new_access = refresh.access_token
                new_access["visitor"] = True
                new_access["visitor_id"] = refresh.payload.get("visitor_id")

                response = Response({"message": "visitor refreshed"})

                response.set_cookie(
                    "visitorAccessToken",
                    str(new_access),
                    httponly=True,
                    secure=False,
                    samesite="Lax",
                    max_age=30 * 24 * 3600,
                    path="/",
                )

                return response

            except (TokenError, InvalidToken):
                response = Response({"error": "Invalid visitor refresh"}, status=401)
                response.delete_cookie("visitorAccessToken")
                response.delete_cookie("visitorRefreshToken")
                return response

        return Response({"error": "No refresh token"}, status=401)