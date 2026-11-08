import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import account_deletion as svc
from .ratelimit import client_ip, hit

logger = logging.getLogger(__name__)
User = get_user_model()
TOKEN_SALT = "maamara.account-deletion"
TOKEN_MAX_AGE = 24 * 3600
RETENTION = [
    "Deleted: your profile and picture, wallet and coins, vouchers, wishlist, reviews, comments, messages and saved sign-in details.",
    "Kept without your personal details: orders, payments, refunds and invoices (tax and accounting law).",
    "Timeline: deletion happens immediately and a confirmation email is sent to you.",
]


def _limited(request, scope, limit, window=3600):
    if getattr(settings, "RATE_LIMITS_ENABLED", True) and hit(scope, client_ip(request), limit, window):
        return Response({"detail": "Too many requests. Please try again later."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    return None


def _mask(email):
    name, _, domain = (email or "").partition("@")
    return f"{name[:2]}***@{domain}" if domain else ""


class AccountDeletionInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "has_password": user.has_usable_password(),
            "email": _mask(user.email),
            "blockers": svc.deletion_blockers(user),
            "retention": RETENTION,
        })


class AccountDeletionCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if (limited := _limited(request, "acct-del-code", 5)):
            return limited
        try:
            sent = svc.send_confirmation_code(request.user)
        except Exception:
            logger.exception("Could not send deletion code")
            return Response({"detail": "We could not send the code. Please try again."}, status=status.HTTP_502_BAD_GATEWAY)
        if not sent:
            return Response({"detail": "Your account has no email address to send a code to."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "We emailed you a confirmation code.", "email": _mask(request.user.email)})


class AccountDeletionView(APIView):
    """Delete the signed-in user's account after re-authentication."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if (limited := _limited(request, "acct-del", 10)):
            return limited
        user = request.user
        if str(request.data.get("confirm", "")).strip().upper() != "DELETE":
            return Response({"detail": 'Type "DELETE" to confirm.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.has_usable_password():
            password = request.data.get("password")
            if not isinstance(password, str) or not user.check_password(password):
                return Response({"detail": "Your password is incorrect."}, status=status.HTTP_403_FORBIDDEN)
        elif not svc.verify_confirmation_code(user, request.data.get("code")):
            return Response({"detail": "The confirmation code is wrong or expired."}, status=status.HTTP_403_FORBIDDEN)

        try:
            email = svc.anonymise_user(user, channel="app")
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        svc.send_completion_email(email)
        response = Response({"detail": "Your account has been deleted."})
        for name in ("accessToken", "refreshToken", "visitorAccessToken", "visitorRefreshToken", "visitorId"):
            response.delete_cookie(name, path="/")
        return response


class PublicDeletionRequestView(APIView):
    """Web deletion request that works without the app: we email a confirmation link."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        if (limited := _limited(request, "acct-del-public", 5)):
            return limited
        email = str(request.data.get("email", "")).strip().lower()
        generic = Response({"detail": "If an account exists for that email, we have sent a confirmation link. It is valid for 24 hours."})
        if not email or "@" not in email or len(email) > 254:
            return Response({"detail": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email, is_active=True).order_by("pk").first()
        if user:
            token = signing.dumps({"uid": user.pk}, salt=TOKEN_SALT)
            link = f"{str(settings.FRONTEND_URL).rstrip('/')}/delete-account?token={token}"
            try:
                send_mail(
                    "Confirm deletion of your Maa Mara Market account",
                    f"We received a request to delete your Maa Mara Market account.\n\nTo confirm, open: {link}\n\n"
                    "The link expires in 24 hours. If you did not ask for this, ignore this email.",
                    getattr(settings, "DEFAULT_FROM_EMAIL", None), [user.email], fail_silently=False,
                )
            except Exception:
                logger.exception("Could not send public deletion link")
        return generic


class PublicDeletionConfirmView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        if (limited := _limited(request, "acct-del-confirm", 10)):
            return limited
        try:
            data = signing.loads(str(request.data.get("token", "")), salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
            user = User.objects.get(pk=data["uid"], is_active=True)
        except (signing.BadSignature, User.DoesNotExist, KeyError):
            return Response({"detail": "This link is invalid, expired or already used."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            email = svc.anonymise_user(user, channel="web")
        except PermissionError as exc:
            from .models import AccountDeletionRecord
            AccountDeletionRecord.objects.create(user_id=user.pk, email_hash=svc.email_hash(user.email), channel="web", status="pending_review")
            support = getattr(settings, "SUPPORT_EMAIL", None) or getattr(settings, "DEFAULT_FROM_EMAIL", None)
            if support:
                try:
                    send_mail("Account deletion needs review", f"User id {user.pk} confirmed a deletion request that needs manual handling: {exc}",
                              getattr(settings, "DEFAULT_FROM_EMAIL", None), [support], fail_silently=True)
                except Exception:
                    pass
            return Response({"detail": str(exc), "pending_review": True}, status=status.HTTP_202_ACCEPTED)
        svc.send_completion_email(email)
        return Response({"detail": "Your account has been deleted."})
