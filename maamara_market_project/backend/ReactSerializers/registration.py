"""Customer registration and OTP verification endpoints.

The module is deliberately separate from authentication/session handling so the
large users module remains maintainable. API paths and response keys remain
compatible with the existing frontend.
"""
from __future__ import annotations

import logging
import secrets
import string
from datetime import timedelta

import bleach
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.models import PendingRegistration, Referral, Voucher, Wallet
from core.mergeVisitortoUserData import merge_visitor_data_to_user

logger = logging.getLogger(__name__)
User = get_user_model()
OTP_EXPIRY_MINUTES = 3


def _clean(value: object, *, lower: bool = False) -> str:
    value = "" if value is None else str(value).strip()
    value = bleach.clean(value, tags=[], attributes={}, strip=True)
    return value.lower() if lower else value


def _otp() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(6))


@csrf_protect
@permission_classes([AllowAny])
@transaction.atomic
def register(request):
    if request.method != "POST":
        return JsonResponse(
            {"success": False, "message": "Method not allowed"},
            status=405,
        )

    firstname = _clean(request.POST.get("First_name"))
    lastname = _clean(request.POST.get("Sur_name"))
    username = _clean(request.POST.get("username"))
    email = _clean(request.POST.get("email"), lower=True)
    password = str(request.POST.get("password") or "")
    password2 = str(request.POST.get("password2") or "")
    referral_code = _clean(request.POST.get("referral_code"))

    if not all([firstname, lastname, username, email, password, password2]):
        return JsonResponse(
            {"success": False, "message": "All fields are required!"},
            status=400,
        )
    if password != password2:
        return JsonResponse(
            {"success": False, "message": "Passwords do not match!"},
            status=400,
        )
    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse(
            {"success": False, "message": "Email already in use!"},
            status=400,
        )
    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"success": False, "message": "Username already exists!"},
            status=400,
        )

    now = timezone.now()
    pending, _ = PendingRegistration.objects.update_or_create(
        email=email,
        defaults={
            "username": username,
            "first_name": firstname,
            "last_name": lastname,
            "password": make_password(password),
            "referral_code": referral_code or None,
            "otp_code": _otp(),
            "otp_sent_at": now,
        },
    )

    html_content = render_to_string(
        "emails/registration_otp.html",
        {
            "first_name": firstname,
            "otp": pending.otp_code,
            "otp_expiry_minutes": OTP_EXPIRY_MINUTES,
            "frontend_url": settings.FRONTEND_URL.rstrip("/"),
        },
    )
    email_message = EmailMultiAlternatives(
        subject="Your Maa Mara Market OTP Code",
        body=f"Hi {firstname}, your OTP expires in {OTP_EXPIRY_MINUTES} minutes.",
        to=[email],
    )
    email_message.attach_alternative(html_content, "text/html")
    email_message.send(fail_silently=False)

    return JsonResponse(
        {
            "success": True,
            "message": "Account created. Please check your email for the OTP to verify your account.",
            "email": email,
            "expires_at": (now + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat(),
        }
    )


@csrf_protect
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@transaction.atomic
def verify_otp_register_otp(request):
    email = _clean(request.data.get("email"), lower=True)
    entered_otp = _clean(request.data.get("otp"))

    visitor_id = (
        request.COOKIES.get("visitorId")
        or request.data.get("visitorId")
    )

    if not email or not entered_otp:
        return Response(
            {"success": False, "message": "Email and OTP are required."},
            status=400,
        )

    pending = (
        PendingRegistration.objects.select_for_update()
        .filter(email=email)
        .order_by("-otp_sent_at")
        .first()
    )
    if not pending:
        return Response(
            {"success": False, "message": "Session expired. Please register again."},
            status=404,
        )

    if not pending.otp_sent_at or timezone.now() > pending.otp_sent_at + timedelta(minutes=OTP_EXPIRY_MINUTES):
        pending.delete()
        return Response(
            {"success": False, "message": "OTP has expired."},
            status=400,
        )

    if not secrets.compare_digest(entered_otp, pending.otp_code):
        return Response(
            {"success": False, "message": "Incorrect OTP."},
            status=400,
        )

    if User.objects.filter(email__iexact=pending.email).exists():
        pending.delete()
        return Response(
            {"success": False, "message": "An account already exists for this email."},
            status=409,
        )

    user = User.objects.create(
        username=pending.username,
        email=pending.email,
        first_name=pending.first_name,
        last_name=pending.last_name,
        password=pending.password,
    )
    Wallet.objects.get_or_create(user=user, defaults={"balance": 0, "earned_coins": 0})

    # Do not merge visitor-owned records during OTP verification.
    # Verification must remain responsible only for validating the OTP and
    # creating the account. The normal login flow already performs the
    # idempotent visitor-to-user merge while the visitor cookie is available.
    # Keeping that migration out of this transaction prevents unrelated cart,
    # order, profile, or visitor-data issues from rolling back a valid OTP.
    merge_result = {"moved": 0, "deduplicated": 0, "deferred_to_login": True}

    referral_tracked = False
    voucher_generated = False
    if pending.referral_code:
        referrer = (
            Referral.objects.select_for_update()
            .filter(referral_code=pending.referral_code)
            .first()
        )
        if referrer and referrer.referrer_id and referrer.invited_user_id is None:
            referrer.invited_user = user
            referrer.save(update_fields=["invited_user"])

            referrer_wallet, _ = Wallet.objects.get_or_create(user=referrer.referrer)
            referrer_wallet.earned_coins += 50
            referrer_wallet.update_balance()

            Voucher.objects.create(
                user=referrer.referrer,
                code=f"WELCOME-{secrets.token_hex(4).upper()}",
                discount="10% off",
                expiry_date=timezone.localdate() + timedelta(days=30),
            )
            referral_tracked = True
            voucher_generated = True

    pending.delete()

    try:
        html_content = render_to_string(
            "emails/registration_verification.html",
            {
                "first_name": user.first_name,
                "username": user.username,
                "dashboard_url": f"{settings.FRONTEND_URL.rstrip('/')}/user-account",
                "frontend_url": settings.FRONTEND_URL.rstrip("/"),
            },
        )
        email_message = EmailMultiAlternatives(
            subject="Your Maa Mara Market Account is Verified!",
            body=f"Hi {user.first_name}, your account has been verified!",
            to=[user.email],
        )
        email_message.attach_alternative(html_content, "text/html")
        email_message.send(fail_silently=False)
    except Exception:
        logger.exception("Failed to send registration verification email", extra={"user_id": user.pk})

    return Response(
        {
            "success": True,
            "message": "Account created successfully.",
            "referral_tracked": referral_tracked,
            "voucher_generated": voucher_generated,
            "visitor_merge": merge_result,
        },
        status=200,
    )


@csrf_protect
@api_view(["POST"])
@permission_classes([AllowAny])
def resend_otp_register_otp(request):
    email = _clean(request.data.get("email"), lower=True)
    if not email:
        return Response(
            {"success": False, "message": "Email is required."},
            status=400,
        )

    pending = (
        PendingRegistration.objects
        .filter(email=email)
        .order_by("-otp_sent_at")
        .first()
    )
    if not pending:
        return Response(
            {"success": False, "message": "Session expired or registration not found. Please register again."},
            status=404,
        )

    now = timezone.now()
    pending.otp_code = _otp()
    pending.otp_sent_at = now
    pending.save(update_fields=["otp_code", "otp_sent_at"])

    html_content = render_to_string(
        "emails/resend_otp.html",
        {
            "first_name": pending.first_name,
            "otp": pending.otp_code,
            "otp_expiry_minutes": OTP_EXPIRY_MINUTES,
            "frontend_url": settings.FRONTEND_URL.rstrip("/"),
        },
    )
    email_message = EmailMultiAlternatives(
        subject="Your New OTP Code",
        body=f"Hi {pending.first_name}, your new OTP expires in {OTP_EXPIRY_MINUTES} minutes.",
        to=[email],
    )
    email_message.attach_alternative(html_content, "text/html")
    email_message.send(fail_silently=False)

    return Response(
        {
            "success": True,
            "message": "A new OTP has been sent.",
            "expires_at": (now + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat(),
        }
    )
