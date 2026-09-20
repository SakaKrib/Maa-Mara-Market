import uuid
import logging

from datetime import timedelta

from django.contrib.auth import authenticate, login as auth_login, logout
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password
from django.shortcuts import redirect
from django.conf import settings
from django.http import JsonResponse
from django.utils.text import slugify
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import permission_classes, api_view
from rest_framework.authentication import SessionAuthentication
from order.views import IsAuthenticatedOrVisitor

from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from core.models import Profile, Wallet, Voucher, Referral, Notification, ActivityLog
from vendorDashboard.models import Vendor
from order.models import Customer, Order
from core.mergeVisitortoUserData import merge_visitor_data_to_user
from .registration import register, verify_otp_register_otp, resend_otp_register_otp

from django.contrib.auth import get_user_model


logger = logging.getLogger(__name__)


@ensure_csrf_cookie
def get_csrf_token(request):
    csrf_token = get_token(request)
    return JsonResponse({
        "success": True,
        "csrfToken": csrf_token,
    })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response({
            "success": True,
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
            },
            "profile": {
                "profile_picture": profile.profile_picture.url if profile.profile_picture else None,
                "date_of_birth": profile.date_of_birth,
                "location": profile.location,
                "phone_number": profile.phone_number,
                "address": profile.address,
                "city": profile.city,
                "country": profile.country,
            },
        })

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        user_fields = ("first_name", "last_name", "email")
        profile_fields = ("date_of_birth", "location", "phone_number", "address", "city", "country")

        for field in user_fields:
            if field in request.data:
                setattr(request.user, field, request.data[field])
        request.user.save(update_fields=[f for f in user_fields if f in request.data])

        for field in profile_fields:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()

        return self.get(request)

@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def user_account_view(request):
    """
    Return the account view for either an authenticated user or the current
    visitor. Visitors are identified only by their server-issued visitorId.
    """
    visitor_id = request.COOKIES.get("visitorId")

    if request.user.is_authenticated:
        user = request.user
        profile, _ = Profile.objects.get_or_create(user=user)
        orders = Order.objects.filter(user=user).order_by("-created_at")
        wallet = Wallet.objects.filter(user=user).first()
        vouchers = Voucher.objects.filter(user=user, active=True, redeemed=False)
        referral = Referral.objects.filter(referrer=user).first()
        user_data = {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
        }
        profile_data = {
            "profile_picture": profile.profile_picture.url if profile.profile_picture else None,
            "date_of_birth": profile.date_of_birth,
            "location": profile.location,
            "phone_number": profile.phone_number,
            "address": profile.address,
            "city": profile.city,
            "country": profile.country,
        }
    else:
        if not visitor_id:
            return Response({
                "success": True,
                "authType": "anonymous",
                "user": None,
                "profile": None,
                "orders": [],
                "wallet": None,
                "vouchers": [],
                "referral": None,
            })

        customer = Customer.objects.filter(visitor_id=visitor_id).order_by("-updated_at").first()
        orders = Order.objects.filter(visitor_id=visitor_id).order_by("-created_at")
        user_data = None
        profile_data = {
            "profile_picture": None,
            "date_of_birth": None,
            "location": getattr(customer, "city", None) if customer else None,
            "phone_number": getattr(customer, "phone_number", None) if customer else None,
            "address": getattr(customer, "address", None) if customer else None,
            "city": getattr(customer, "city", None) if customer else None,
            "country": getattr(customer, "country", None) if customer else None,
        }
        if customer:
            user_data = {
                "id": None,
                "username": None,
                "first_name": customer.first_name or "",
                "last_name": customer.last_name or "",
                "email": customer.email or "",
            }

        wallet = None
        vouchers = []
        referral = None

    return Response({
        "success": True,
        "authType": "user" if request.user.is_authenticated else "visitor",
        "user": user_data,
        "profile": profile_data,
        "orders": [{
            "id": order.id,
            "paypal_order_id": order.paypal_order_id,
            "status": order.status,
            "ordered_date": order.ordered_date,
            "created_at": order.created_at,
            "final_total": order.final_total_of_cart(),
            "items": [{
                "id": item.id,
                "quantity": item.quantity,
                "item": {
                    "id": item.item.id,
                    "name": item.item.name,
                },
            } for item in order.items.all()],
        } for order in orders],
        "wallet": wallet and {
            "balance": wallet.balance,
            "earned_coins": wallet.earned_coins,
            "redeem_limit": wallet.redeem_limit,
            "min_redeemable": wallet.min_redeemable,
        },
        "vouchers": [{
            "id": voucher.id,
            "code": voucher.code,
            "discount": voucher.discount,
            "expiry_date": voucher.expiry_date,
        } for voucher in vouchers],
        "referral": referral and {
            "referral_code": referral.referral_code,
            "total_referrals": referral.total_referrals,
        },
    })


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def update_account_view(request):
    visitor_id = request.COOKIES.get("visitorId")

    fields = ("first_name", "last_name", "phone_number", "address", "city", "country", "location")
    if request.user.is_authenticated:
        user = request.user
        for field in ("first_name", "last_name"):
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save(update_fields=["first_name", "last_name"])
        profile, _ = Profile.objects.get_or_create(user=user)
        for field in fields[2:]:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()
        return user_account_view(request)

    if not visitor_id:
        return Response({"success": False, "message": "Visitor session not found."}, status=400)

    customer, _ = Customer.objects.get_or_create(visitor_id=visitor_id)
    for field in fields:
        if field in request.data:
            setattr(customer, field, request.data[field])
    if "first_name" in request.data or "last_name" in request.data:
        customer.full_name = f"{customer.first_name or ''} {customer.last_name or ''}".strip()
    customer.save()
    return user_account_view(request)


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def user_visitor_notifications_view(request):
    """Return notifications for the signed-in user or current visitor."""
    visitor_id = request.COOKIES.get("visitorId")
    if request.user.is_authenticated:
        notifications = Notification.objects.filter(user=request.user)
    elif visitor_id:
        notifications = Notification.objects.filter(visitor_id=visitor_id)
    else:
        notifications = Notification.objects.none()

    notifications = notifications.order_by("-created_at")
    unread_count = notifications.filter(is_read=False).count()
    notifications = notifications[:50]
    return Response({
        "success": True,
        "results": [{
            "id": n.id,
            "title": n.title or "Notification",
            "message": n.message,
            "seen": n.seen,
            "is_read": n.is_read,
            "url": n.url,
            "created_at": n.created_at,
        } for n in notifications],
        "unread_count": unread_count,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def user_visitor_activity_view(request):
    """Return recent activity for the signed-in user or current visitor."""
    visitor_id = request.COOKIES.get("visitorId")
    if request.user.is_authenticated:
        activities = ActivityLog.objects.filter(user=request.user)
    elif visitor_id:
        activities = ActivityLog.objects.filter(visitor_id=visitor_id)
    else:
        activities = ActivityLog.objects.none()

    activities = activities.order_by("-timestamp")[:50]
    return Response({
        "success": True,
        "results": [{
            "id": a.id,
            "action": a.get_action_display(),
            "description": a.description,
            "timestamp": a.timestamp,
            "related_url": a.related_url,
        } for a in activities],
    })




class HybridCheckAuthView(APIView):
    """
    Resolve the current browser identity from, in order:
    1. Django admin session
    2. User access JWT
    3. User refresh JWT (and issue fresh cookies)
    4. Visitor access JWT
    5. Visitor refresh JWT (and issue a fresh access cookie)

    The endpoint intentionally returns 200 for an anonymous browser. This keeps
    initial storefront auth discovery from becoming an error path.
    """

    authentication_classes = [SessionAuthentication]
    permission_classes = [AllowAny]

    @staticmethod
    def _user_payload(user, auth_type="jwt"):
        role = HybridCheckAuthView.get_role(user)
        return {
            "isAuthenticated": True,
            "authType": auth_type,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role,
                "is_vendor": role == "vendor",
                "is_admin": role == "admin",
            },
        }

    @staticmethod
    def _clear_visitor_identity(response):
        response.delete_cookie("visitorAccessToken", path="/")
        response.delete_cookie("visitorRefreshToken", path="/")
        response.delete_cookie("visitorId", path="/")

    @staticmethod
    def _clear_user_session_cookies(response):
        # user_sessionid is the configured Django session cookie. sessionid is
        # also cleared for browsers that may still carry the legacy name.
        response.delete_cookie("user_sessionid", path="/")
        response.delete_cookie("sessionid", path="/")

    def get(self, request):
        session_user = request.user
        if session_user.is_authenticated and session_user.is_superuser:
            return Response(
                self._user_payload(session_user, auth_type="session"),
                status=status.HTTP_200_OK,
            )

        access_token = request.COOKIES.get("accessToken")
        if access_token:
            jwt_authenticator = JWTAuthentication()
            try:
                validated_token = jwt_authenticator.get_validated_token(access_token)
                user = jwt_authenticator.get_user(validated_token)
                response = Response(
                    self._user_payload(user),
                    status=status.HTTP_200_OK,
                )
                self._clear_visitor_identity(response)
                self._clear_user_session_cookies(response)
                return response
            except (InvalidToken, TokenError):
                pass

        refresh_token = request.COOKIES.get("refreshToken")
        if refresh_token:
            try:
                serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
                serializer.is_valid(raise_exception=True)
                refreshed = serializer.validated_data

                refresh = RefreshToken(
                    refreshed.get("refresh") or refresh_token
                )
                user_id = refresh.payload.get("user_id")
                if not user_id:
                    raise TokenError("Refresh token has no user identity")

                user = User.objects.get(pk=user_id)
                response = Response(
                    self._user_payload(user),
                    status=status.HTTP_200_OK,
                )
                response.set_cookie(
                    "accessToken",
                    refreshed["access"],
                    httponly=True,
                    secure=request.is_secure(),
                    samesite="Lax",
                    max_age=5 * 60,
                    path="/",
                )
                if refreshed.get("refresh"):
                    response.set_cookie(
                        "refreshToken",
                        refreshed["refresh"],
                        httponly=True,
                        secure=request.is_secure(),
                        samesite="Lax",
                        max_age=30 * 24 * 3600,
                        path="/",
                    )

                self._clear_visitor_identity(response)
                self._clear_user_session_cookies(response)
                return response
            except (InvalidToken, TokenError, User.DoesNotExist, ValueError):
                pass

        visitor_id_cookie = request.COOKIES.get("visitorId")
        visitor_token = request.COOKIES.get("visitorAccessToken")
        if visitor_token:
            try:
                visitor_access = AccessToken(visitor_token)
                token_visitor_id = visitor_access.get("visitor_id")
                if (
                    not visitor_access.get("visitor")
                    or not token_visitor_id
                    or not visitor_id_cookie
                    or str(token_visitor_id) != str(visitor_id_cookie)
                ):
                    raise TokenError("Visitor identity mismatch")

                return Response(
                    {
                        "isAuthenticated": False,
                        "authType": "visitor",
                        "user": None,
                    },
                    status=status.HTTP_200_OK,
                )
            except (InvalidToken, TokenError):
                pass

        visitor_refresh = request.COOKIES.get("visitorRefreshToken")
        if visitor_refresh:
            try:
                refresh = RefreshToken(visitor_refresh)
                refresh.check_exp()

                token_visitor_id = refresh.payload.get("visitor_id")
                if (
                    not refresh.payload.get("visitor")
                    or not token_visitor_id
                    or not visitor_id_cookie
                    or str(token_visitor_id) != str(visitor_id_cookie)
                ):
                    raise TokenError("Visitor identity mismatch")

                new_access = refresh.access_token
                new_access["visitor"] = True
                new_access["visitor_id"] = token_visitor_id

                response = Response(
                    {
                        "isAuthenticated": False,
                        "authType": "visitor",
                        "user": None,
                    },
                    status=status.HTTP_200_OK,
                )
                response.set_cookie(
                    "visitorAccessToken",
                    str(new_access),
                    httponly=True,
                    secure=request.is_secure(),
                    samesite="Lax",
                    max_age=30 * 24 * 3600,
                    path="/",
                )
                return response
            except (InvalidToken, TokenError):
                pass

        return Response(
            {"isAuthenticated": False, "user": None},
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def get_role(user):
        if user.is_superuser:
            return "admin"
        if hasattr(user, "vendor"):
            return "vendor"
        return "customer"


logger = logging.getLogger("ReactSerializers.users")

@csrf_protect
@permission_classes([AllowAny])
@require_http_methods(["POST"])
def login_view(request):

    visitor_id = request.COOKIES.get("visitorId") or request.POST.get("visitorId")

    identifier = request.POST.get("username")
    password = request.POST.get("password")
    csrf_token = request.META.get('HTTP_X_CSRFTOKEN')

    user = authenticate(request, username=identifier, password=password)

    if user is not None:
        auth_login(request, user)
        role = "admin" if user.is_superuser else ("vendor" if hasattr(user, "vendor") else "customer")
        Profile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

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

        response.set_cookie("accessToken", access_token, httponly=True, secure=request.is_secure(), samesite="Lax", max_age=5 * 60, path="/")
        response.set_cookie("refreshToken", refresh_token, httponly=True, secure=request.is_secure(), samesite="Lax", max_age=2592000, path="/")
        return response

    try:
        vendor = Vendor.objects.get(email=identifier)
    except Vendor.DoesNotExist:
        try:
            vendor = Vendor.objects.get(username=identifier)
        except Vendor.DoesNotExist:
            return JsonResponse({"success": False, "error": "Invalid credentials"}, status=401)

    if check_password(password, vendor.password):
        merge_visitor_data_to_user(vendor.user, visitor_id)
        refresh = RefreshToken.for_user(vendor.user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
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

        response.delete_cookie("visitorAccessToken", path="/")
        response.delete_cookie("visitorRefreshToken", path="/")
        response.delete_cookie("visitorId", path="/")
        response.delete_cookie("user_sessionid", path="/")
        response.set_cookie("accessToken", access_token, httponly=True, secure=request.is_secure(), samesite="Lax", max_age=300, path="/")
        response.set_cookie("refreshToken", refresh_token, httponly=True, secure=request.is_secure(), samesite="Lax", max_age=2592000, path="/")
        return response

    return JsonResponse({"success": False, "error": "Invalid credentials"}, status=401)


from django.shortcuts import redirect
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.utils.text import slugify
from allauth.socialaccount.models import SocialAccount
from rest_framework_simplejwt.tokens import RefreshToken
import logging

logger = logging.getLogger(__name__)

def google_login_success(request):

    try:
        social = SocialAccount.objects.get(provider="google", user=request.user)
    except SocialAccount.DoesNotExist:
        return redirect(f"{settings.FRONTEND_URL}/unauthorized")

    extra = social.extra_data

    google_uid = social.uid
    email = extra.get("email")

    first_name = extra.get("given_name", "") or ""
    last_name = extra.get("family_name", "") or ""

    if not email:
        return redirect(f"{settings.FRONTEND_URL}/unauthorized")

    logger.info("Google authentication completed for a linked account")

    user = User.objects.filter(email=email).first()

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

    if social.user != user:
        social.user = user
        social.save()

    updated = False

    if first_name and not user.first_name:
        user.first_name = first_name
        updated = True

    if last_name and not user.last_name:
        user.last_name = last_name
        updated = True

    if updated:
        user.save()

    login(
        request,
        user,
        backend="django.contrib.auth.backends.ModelBackend"
    )

    refresh = RefreshToken.for_user(user)

    visitor_id = request.COOKIES.get("visitorId")
    merge_visitor_data_to_user(user, visitor_id)

    response = redirect(f"{settings.FRONTEND_URL}/login/auth-success")

    response.delete_cookie("visitorAccessToken")
    response.delete_cookie("visitorRefreshToken")
    response.delete_cookie("visitorId")
    response.delete_cookie("user_sessionid")

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
        max_age=2592000,
        path="/"
    )

    return response


class VisitorTokenView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):

        if request.COOKIES.get("accessToken") or request.COOKIES.get("refreshToken"):
            return Response({
                "message": "Authenticated user detected — visitor not created"
            })

        existing_id = request.COOKIES.get("visitorId")
        existing_refresh = request.COOKIES.get("visitorRefreshToken")

        if existing_id and existing_refresh:
            try:
                existing = RefreshToken(existing_refresh)
                if (not existing.get("visitor") or existing.get("visitor_id") != existing_id):
                    raise TokenError("Visitor identity mismatch")
            except (TokenError, InvalidToken):
                existing_id = None
                existing_refresh = None
            if existing_id and existing_refresh:
                return Response({
                "message": "Visitor already exists",
                "visitor_id": existing_id
            })

        visitor_id = str(uuid.uuid4())

        refresh = RefreshToken()
        refresh["visitor"] = True
        refresh["visitor_id"] = visitor_id

        access = refresh.access_token
        access["visitor"] = True
        access["visitor_id"] = visitor_id

        response = Response({
            "message": "Visitor created",
            "visitor_id": visitor_id
        })

        cookie_options = {
            "httponly": True,
            "secure": request.is_secure(),
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


@api_view(["POST"])
@permission_classes([AllowAny])
@require_http_methods(["POST"])
def logout_view(request):

    logout(request)

    refresh_token = request.COOKIES.get("refreshToken")

    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            pass

    response = JsonResponse({"message": "Logged out successfully"})

    for cookie_name in (
        "accessToken",
        "refreshToken",
        "visitorAccessToken",
        "visitorRefreshToken",
        "visitorId",
        "user_sessionid",
        "sessionid",
    ):
        response.delete_cookie(cookie_name, path="/")

    return response


User = get_user_model()
class CookieRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user_refresh = request.COOKIES.get("refreshToken")
        visitor_refresh = request.COOKIES.get("visitorRefreshToken")

        if user_refresh:
            try:
                serializer = TokenRefreshSerializer(data={"refresh": user_refresh})
                serializer.is_valid(raise_exception=True)
                data = serializer.validated_data

                response = Response({"message": "refreshed"})
                response.set_cookie(
                    "accessToken",
                    data["access"],
                    httponly=True,
                    secure=request.is_secure(),
                    samesite="Lax",
                    max_age=5 * 60,
                    path="/",
                )

                if "refresh" in data:
                    response.set_cookie(
                        "refreshToken",
                        data["refresh"],
                        httponly=True,
                        secure=request.is_secure(),
                        samesite="Lax",
                        max_age=30 * 24 * 3600,
                        path="/",
                    )
                return response

            except (TokenError, InvalidToken, ValueError):
                response = Response({"error": "Invalid user refresh"}, status=401)
                response.delete_cookie("accessToken", path="/")
                response.delete_cookie("refreshToken", path="/")
                return response

        if visitor_refresh:
            try:
                refresh = RefreshToken(visitor_refresh)

                visitor_id = request.COOKIES.get("visitorId")
                token_visitor_id = refresh.payload.get("visitor_id")
                if (
                    not refresh.payload.get("visitor")
                    or not token_visitor_id
                    or not visitor_id
                    or str(token_visitor_id) != str(visitor_id)
                ):
                    raise TokenError("Visitor identity mismatch")

                new_access = refresh.access_token
                new_access["visitor"] = True
                new_access["visitor_id"] = token_visitor_id

                response = Response({"message": "visitor refreshed"})
                response.set_cookie(
                    "visitorAccessToken",
                    str(new_access),
                    httponly=True,
                    secure=request.is_secure(),
                    samesite="Lax",
                    max_age=30 * 24 * 3600,
                    path="/",
                )
                return response

            except (TokenError, InvalidToken):
                response = Response({"error": "Invalid visitor refresh"}, status=401)
                response.delete_cookie("visitorAccessToken", path="/")
                response.delete_cookie("visitorRefreshToken", path="/")
                response.delete_cookie("visitorId", path="/")
                return response

        return Response({"error": "No refresh token"}, status=401)
