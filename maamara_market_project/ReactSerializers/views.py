
# shop/views.py
from rest_framework import viewsets, permissions
from vendorDashboard.models import Vendor, VendorPayout
from .Serializers import VendorPublicSerializer, VendorPayoutSerializer, AdminProfilePic
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action, api_view,permission_classes, authentication_classes
from django.http import JsonResponse
from vendorDashboard.views import get_monthly_vendor_report
from vendorDashboard.views import get_month_range, get_vendor_earnings
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.views.decorators.csrf import csrf_exempt
from django.forms.models import model_to_dict
from django.http import JsonResponse
from datetime import date
from calendar import monthrange
from rest_framework import generics
from django.contrib.auth.models import User
from core.models import Profile
from .models import Item
from django.db.models import Sum, Count
import calendar
from django.db.models.functions import TruncMonth
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import _json
from django.contrib.auth import get_user_model
from allauth.socialaccount.models import SocialToken, SocialAccount
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken
from .users import *
from .views import *
from .Serializers import *
from vendorDashboard.models import *
from core.models import *
from django.core.mail import send_mail
import random
from datetime import timezone as dt_timezone ,datetime, timedelta
from django.views.decorators.http import require_POST
from collections import OrderedDict
import calendar


import logging
from django.http import JsonResponse
from django.shortcuts import render
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.utils.timezone import now
from datetime import timedelta
from core.models import Referral, Wallet, Voucher
from django.utils.crypto import get_random_string
from core.models import *
from django.contrib import messages
from django.contrib.auth.hashers import make_password
import bleach
import re
User = get_user_model()

#custom admin check
from rest_framework.permissions import BasePermission

class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser



#view to show vendors
class VendorAdminViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorPublicSerializer
    permission_classes = [IsAdminUser]


    def get_queryset(self):
    # Return only active vendors, for example
        return Vendor.objects.filter(is_active=True)

   


# -------------------------------
# Sanitizer
# -------------------------------
def sanitize(value):
    if isinstance(value, str):
        return bleach.clean(value)
    return value


# ---------------------------
# Helper: sanitize + validate
# ---------------------------
def sanitize_and_validate(value, pattern=None, lower=False):
    if not value:
        return None
    value = bleach.clean(value).strip()
    if lower:
        value = value.lower()
    if pattern and not re.match(pattern, value):
        return None
    return value    

# -------------------------------
# Vendor net payout API
# -------------------------------
@permission_classes([IsSuperUser])
def vendor_net_payout_api(request):
    data = []

    today = date.today()
    start_date = date(today.year, today.month, 1)
    end_date = date(today.year, today.month, monthrange(today.year, today.month)[1])

    for vendor in Vendor.objects.all():
        result = get_vendor_earnings(vendor, start_date, end_date)
        payout = result.get("payout")
        difference = result.get("difference")

        if not payout:
            continue

        details = {
            "amount": payout.amount,
            "gross_sales": payout.gross_sales,
            "adjustment_amount": payout.adjustment_amount,
            "income": payout.income,
            "profit": payout.profit,
            "paid": payout.paid,
            "paid_at": payout.paid_at,
            "reference": sanitize(payout.reference),
        }

        data.append({
            "vendor_id": vendor.id,
            "vendor_name": sanitize(f"{vendor.surname_name} {vendor.first_name}"),
            "vendor_email": sanitize(vendor.email),
            "vendor_phone": sanitize(getattr(vendor, 'phone_number', '')),
            "vendor_company": sanitize(getattr(vendor, 'company_name', '')),
            "vendor_location": sanitize(getattr(vendor, 'workshop_location', '')),
            "month": start_date.strftime("%B %Y"),
            "net_payout": payout.amount,
            "difference": difference,   # optional — shows month-over-month changes
            "details": details
        })

    return JsonResponse(data, safe=False)



# api for vendor
# -------------------------------
# Vendor payout history API
# -------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vendor_payout_history_api(request):
    user = request.user
    if not hasattr(user, "vendor"):
        return Response({"error": "Vendor not found"}, status=404)

    vendor = user.vendor
    payouts = []

    for start_date, end_date in get_month_range(months_back=6, include_current=True):
        payout_data = get_vendor_earnings(vendor, start_date, end_date)
        if payout_data:
            # payout_data is a dict: {"payout": VendorPayout instance, "difference": {...}}
            payout_instance = payout_data.get("payout")

            if payout_instance:
                payout_instance.reference = sanitize(getattr(payout_instance, 'reference', ''))
                payouts.append(payout_instance)

    # Sort by payout_period_start descending
    payouts.sort(key=lambda p: getattr(p, 'payout_period_start', None), reverse=True)

    serializer = VendorPayoutSerializer(payouts, many=True)
    return Response(serializer.data)





# -------------------------------
# Vendor recent payouts API
# -------------------------------
@api_view(["GET"])
@permission_classes([IsSuperUser])
def vendor_recent_payouts_api(request):
    user = request.user
    try:
        vendor = Vendor.objects.get(user=user)
    except Vendor.DoesNotExist:
        return Response({"error": "Vendor not found"}, status=404)

    payouts = []
    for start_date, end_date in get_month_range(months_back=6):
        reference = sanitize(f"{vendor.id}-{start_date.strftime('%Y-%m')}")

        earnings_data = get_vendor_earnings(vendor, start_date, end_date)
        # sanitize string fields inside earnings_data if they exist
        if earnings_data:
            earnings_data["reference"] = sanitize(earnings_data.get("reference", ""))

        payout, created = VendorPayout.objects.get_or_create(
            vendor=vendor,
            reference=reference,
            defaults=earnings_data
        )

        if created and earnings_data:
            payout.adjustments.set(earnings_data.get("applied_adjustments", []))
            payout.save()

        payouts.append(payout)

    serializer = VendorPayoutSerializer(payouts, many=True)
    return Response(serializer.data)

#admin & vendor profile picture

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = Profile.objects.get(user=request.user)
        serializer = AdminProfilePic(profile)

        # Add vendor profile picture if available
        vendor_picture = None
        if hasattr(request.user, "vendor") and request.user.vendor.profile_picture:
            vendor_picture = request.user.vendor.profile_picture.url

        return Response({
            **serializer.data,
            "vendor_profile_picture": vendor_picture
        })

    


# -------------------------------
# Vendor item stats API
# -------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_item_stats(request):
    user = request.user

    if not hasattr(user, 'vendor'):
        return Response({"detail": "Access denied. User is not a vendor."}, status=403)

    vendor = user.vendor
    items = Item.objects.filter(created_by=user)

    total_items = items.count()
    total_likes = items.aggregate(Sum('likes'))['likes__sum'] or 0
    total_views = items.aggregate(Sum('views'))['views__sum'] or 0

    # 🗓️ Monthly breakdown for existing data
    monthly_stats = (
        items
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(
            item_count=Count('id'),
            likes_sum=Sum('likes'),
            views_sum=Sum('views')
        )
        .order_by('month')
    )

    # 🧮 Get the last 6 months (including current)
    today = datetime.today()
    months_list = OrderedDict()
    for i in range(5, -1, -1):  # last 6 months
        month_date = today - timedelta(days=30 * i)
        month_name = calendar.month_abbr[month_date.month]
        months_list[month_name] = {"month": month_name, "total_items": 0, "total_likes": 0, "total_views": 0}

    # 🧩 Merge actual data into the 6-month list
    for entry in monthly_stats:
        month_name = calendar.month_abbr[entry['month'].month]
        if month_name in months_list:
            months_list[month_name] = {
                "month": month_name,
                "total_items": entry['item_count'],
                "total_likes": entry['likes_sum'] or 0,
                "total_views": entry['views_sum'] or 0,
            }

    formatted_monthly_stats = list(months_list.values())

    return Response({
        "vendor_id": vendor.id,
        "vendor_name": vendor.username,
        "total_items": total_items,
        "total_likes": total_likes,
        "total_views": total_views,
        "monthly_stats": formatted_monthly_stats,
    })
    
# views.py or serializers.py


@login_required
def google_login_callback(request):
    user = request.user

    # Sanitize user info (just in case for logging/debug)
    username = bleach.clean(user.username) if hasattr(user, 'username') else 'Unknown'

    social_accounts = SocialAccount.objects.filter(user=user)
    print("social account for user", social_accounts)

    social_account = social_accounts.first()

    if not social_account:
        print("no social account")
        return redirect(
            'http://localhost:5173/login/callback/?error=' + bleach.clean("NoSocialAccount")
        )

    token = SocialToken.objects.filter(account=social_account, account__provider='google').first()

    if token:
        print('Google token found', bleach.clean(token.token))
        refresh = RefreshToken.for_user(user)
        access_token = bleach.clean(str(refresh.access_token))
        return redirect(f'http://localhost:5173/login/callback/?access_token={access_token}')
    else:
        print("no token found")
        return redirect(
            f'http://localhost:5173/login/callback/?error=' + bleach.clean("NoGoogleToken")
        )


def validate_google_token(request):
    if request.method == 'POST':
        try:
            data = _json.loads(request.body)
            google_access_token = data.get('access_token')

            # Sanitize the token before logging or using it
            sanitized_token = bleach.clean(google_access_token) if google_access_token else None
            print(sanitized_token)

            if not sanitized_token:
                return JsonResponse({"detail": "Access token is missing"}, status=400)
            
            return JsonResponse({"valid": "true"})
        except _json.JSONDecodeError:
            return JsonResponse({"detail": "Invalid JSON"}, status=400)
    
    return JsonResponse({"detail": "Method not allowed"}, status=405)



#fetch item for customer  
from django.db.models import F

@permission_classes([permissions.AllowAny])
class ItemViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ItemSerializer

    def get_queryset(self):
        return Item.objects.filter(available=True, in_stock__gt=0)

    def retrieve(self, request, *args, **kwargs):
        item = self.get_object()
        
        # --- Identify user or visitor ---
        if request.user.is_authenticated:
            user = request.user
            visitor_id = None
            actor_type = "user"
            actor_name = user.username
        else:
            user = None
            visitor_id = request.COOKIES.get("visitorId")
            if visitor_id:
                actor_type = "visitor"
                actor_name = f"Guest ({visitor_id[:8]})"
            else:
                visitor_id = str(uuid.uuid4())
                actor_type = "visitor"
                actor_name = f"Guest ({visitor_id[:8]})"

        # --- Skip views, logs, notifications if viewer is the vendor who owns the item ---
        if item.vendor and item.vendor.user and item.vendor.user == request.user:
            response = Response(self.get_serializer(item).data, status=status.HTTP_200_OK)
            if not request.COOKIES.get("visitor_id") and not user:
                response.set_cookie("visitor_id", visitor_id, max_age=60*60*24*30)  # 30 days
            return response

        # --- Prevent duplicate views ---
        already_viewed = ItemView.objects.filter(
            item=item, user=user, visitor_id=visitor_id
        ).exists()

        if not already_viewed:
            ItemView.objects.create(item=item, user=user, visitor_id=visitor_id)

            # --- Only increment views and notify if viewer is NOT the vendor ---
            if not (item.vendor and item.vendor.user and item.vendor.user == request.user):
                # ✅ Increment views
                Item.objects.filter(pk=item.pk).update(views=F("views") + 1)
                item.refresh_from_db(fields=['views'])
                
                # --- Notify vendor ---
                if item.vendor and item.vendor.user:
                    Notification.objects.create(
                        user=item.vendor.user,
                        title="New Item View",
                        message=f"Your item '{item.name}' was just viewed.",
                        url=f"/vendors-dashboard/vendor/items/{item.id}/item"
                    )
                    
                # --- Notify admins ---
                admins = User.objects.filter(is_superuser=True)
                for admin in admins:
                    Notification.objects.create(
                        user=admin,
                        title="Vendor Item Viewed",
                        message=f"Item '{item.name}' (Vendor: {item.vendor.company_name}) was viewed.",
                        url=f"/admin-dasboard/items/{item.id}/"
                    )
                    print(f"📢 Admin {admin.username} notified")

                # --- Log activity ---
                ActivityLog.objects.create(
                    user=user,
                    actor_type=actor_type,
                    action="item_viewed",
                    item=item,
                    description=f"You viewed '{item.name}'.",
                    related_url=f"/item-client/{item.id}/item"
                )

                if item.vendor and item.vendor.user:
                    ActivityLog.objects.create(
                        user=item.vendor.user,
                        actor_type='vendor',
                        action="item_viewed",
                        item=item,
                        description=f"{actor_name} viewed '{item.name}'.",
                        related_url=f"/item/{item.id}/item"
                    )

                for admin in User.objects.filter(is_staff=True):
                    ActivityLog.objects.create(
                        user=admin,
                        actor_type="admin",
                        action="item_viewed",
                        item=item,
                        description=f"{actor_name} viewed '{item.name}'.",
                        related_url=f"/admin-item/vendorDashboard/items/{item.id}/"
                    )

        # --- Prepare response ---
        response = Response(self.get_serializer(item).data, status=status.HTTP_200_OK)

        # --- Ensure visitor_id cookie is set ---
        if not request.COOKIES.get("visitor_id"):
            response.set_cookie("visitor_id", visitor_id, max_age=60*60*24*30)  # 30 days

        return response
    

#__________________________________
#vendor items fetch
#__________________________________
@permission_classes([permissions.IsAuthenticated])
class vendorItemViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = ItemSerializer

    def get_queryset(self):
        # Items belonging to logged-in vendor
        return Item.objects.filter(
            available=True, 
            in_stock__gt=0, 
            vendor__user=self.request.user
        )

    def retrieve(self, request, *args, **kwargs):
        item = self.get_object()
        response = Response(self.get_serializer(item).data, status=status.HTTP_200_OK)
        return response


# registration view


# Configure logging

@permission_classes([AllowAny])
@csrf_protect
@transaction.atomic
def register(request):
    if request.method != 'POST':
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    def sanitize_post(field_name):
        value = request.POST.get(field_name)
        return bleach.clean(value) if value else None

    referral_code = sanitize_post("referral_code")
    firstname = sanitize_post("First_name")
    lastname = sanitize_post("Sur_name")
    username = sanitize_post("username")
    email = sanitize_post("email")
    password = sanitize_post("password")
    password2 = sanitize_post("password2")

    if not all([firstname, lastname, username, email, password, password2]):
        return JsonResponse({"success": False, "message": "All fields are required!"}, status=400)

    if password != password2:
        return JsonResponse({"success": False, "message": "Incorrect password. Password did not match!"}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({"success": False, "message": "Email already in use!"}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({"success": False, "message": "Username already exists!"}, status=400)

    otp = get_random_string(length=6, allowed_chars='0123456789')
    now = timezone.now()

    # Define OTP expiry duration (e.g. 3 minutes)
    otp_expiry_minutes = 3
    expires_at = (now + timedelta(minutes=otp_expiry_minutes)).isoformat()

    # Clear old pending registration if exists
    PendingRegistration.objects.filter(email=email).delete()

    hashed_password = make_password(password)

    PendingRegistration.objects.create(
        email=email,
        username=username,
        first_name=firstname,
        last_name=lastname,
        password=hashed_password,
        referral_code=referral_code,
        otp_code=otp,
        otp_sent_at=now
    )

    send_mail(
        subject='Your Maa Mara Market OTP Code',
        message=f'Hi {firstname},\n\nWelcome to Maa Mara Market! Your One-Time Password is: {otp}\n\nPlease enter this code to complete your registration.\n\nCheers,\nMaa Mara Team',
        from_email=None,
        recipient_list=[email],
        fail_silently=False,
    )

    log_activity(
        user=None,
        actor_type='user',
        action='initiated_registration',
        description=f"User '{username}' initiated registration with email '{email}'",
        related_url=None
    )

    return JsonResponse({
        "success": True,
        "message": "Account created. Please check your email for the OTP to verify your account.",
        "email": email,
        "expires_at": expires_at
    })


# ---------------------------
# Verify OTP endpoint
# ---------------------------
@csrf_exempt
@api_view(['POST'])
@authentication_classes([])  # bypass auth
@permission_classes([AllowAny])
@transaction.atomic
def verify_otp_register_otp(request):
    email = sanitize_and_validate(request.data.get("email"), lower=True)
    entered_otp = sanitize_and_validate(str(request.data.get("otp", "")))

    if not email or not entered_otp:
        return Response({"success": False, "message": "Email and OTP are required."}, status=400)

    pending = PendingRegistration.objects.filter(email=email).order_by('-otp_sent_at').first()
    if not pending:
        return Response({"success": False, "message": "Session expired. Please register again."}, status=404)

    if timezone.now() > pending.otp_sent_at + timedelta(minutes=3):
        pending.delete()
        return Response({"success": False, "message": "OTP has expired."}, status=400)

    if entered_otp != pending.otp_code:
        return Response({"success": False, "message": "Incorrect OTP."}, status=400)

    # Create user
    user = User.objects.create(
        username=pending.username,
        email=pending.email,
        first_name=pending.first_name,
        last_name=pending.last_name,
        password=pending.password
    )

    Wallet.objects.get_or_create(user=user, defaults={"balance": 0, "earned_coins": 0})

    referral_tracked = False
    voucher_generated = False

    # Handle referral
    if pending.referral_code:
        referrer = Referral.objects.filter(referral_code=pending.referral_code).first()
        if referrer:
            referral, _ = Referral.objects.get_or_create(
                referrer=referrer.referrer,
                referral_code=pending.referral_code
            )
            if referral.invited_user is None:
                referral.invited_user = user
                referral.save()

                wallet_referrer, _ = Wallet.objects.get_or_create(user=referrer.referrer)
                wallet_referrer.earned_coins += 50
                wallet_referrer.update_balance()
                wallet_referrer.total_coins_into_kes()
                wallet_referrer.save()

                Voucher.objects.create(
                    user=referrer.referrer,
                    code=f"WELCOME-{uuid.uuid4().hex[:8]}",
                    discount="10% off",
                    expiry_date=timezone.now() + timedelta(days=30)
                )

                referral_tracked = True
                voucher_generated = True

                log_activity(
                    user=referrer.referrer,
                    actor_type='user',
                    action='referral_rewarded',
                    description=f"Referrer '{referrer.referrer.username}' rewarded for inviting '{user.username}'",
                    related_url="/referrals"
                )

    # Cleanup
    pending.delete()

    if user:
        log_activity(
            user=user,
            actor_type='user',
            action='otp_verified',
            description='User verified OTP',
            related_url='/...'
        )
    else:
        log_activity(
            user=None,
            actor_type='guest',
            action='otp_verified',
            description=f"Guest user verified OTP for {email}",
            related_url='/...'
        )


    return Response({
        "success": True,
        "message": "Account created successfully.",
        "referral_tracked": referral_tracked,
        "voucher_generated": voucher_generated
    }, status=200)


# ---------------------------
# Resend OTP endpoint
# ---------------------------
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp_register_otp(request):
    email = sanitize_and_validate(str(request.data.get("email", "")).lower())
    if not email:
        return Response({"success": False, "message": "Email is required."}, status=400)

    pending = PendingRegistration.objects.filter(email=email).order_by('-otp_sent_at').first()
    if not pending:
        return Response({"success": False, "message": "Session expired or registration not found. Please register again."}, status=404)

    new_otp = f"{random.randint(100000, 999999)}"
    now = timezone.now()

    pending.otp_code = new_otp
    pending.otp_sent_at = now
    pending.save()

    try:
        send_mail(
            subject="Your New OTP Code",
            message=f"Hi {bleach.clean(pending.first_name)},\n\nYour new OTP is: {new_otp}\nIt will expire in 3 minutes.\n\nIf you did not request this, ignore this message.",
            from_email=None,
            recipient_list=[email],
            fail_silently=False
        )
    except Exception:
        return Response({"success": False, "message": "Failed to send OTP email."}, status=500)

    log_activity(
        user=None,
        actor_type='user',
        action='otp_resent',
        description=f"OTP resent to '{email}'",
        related_url=None
    )

    expires_at = now + timedelta(minutes=3)
    return Response({
        "success": True,
        "message": "A new OTP has been sent to your email.",
        "expires_at": expires_at.isoformat()
    }, status=200)


# vendor update profile
# ✅ Update vendor (with nested brand)
class VendorUpdateProfile(APIView):
    """
    API endpoint to retrieve and update Vendor profile (partial or full)
    """

    def get(self, request, pk, *args, **kwargs):
        # ✅ Fetch vendor safely
        vendor = get_object_or_404(Vendor, pk=pk)
        # ✅ Always pass context for request (needed for nested serializers with images/URLs)
        serializer = VendorForm(vendor, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk, *args, **kwargs):
        vendor = get_object_or_404(Vendor, pk=pk)
        serializer = VendorForm(
            instance=vendor,
            data=request.data,
            partial=True,
            context={"request": request},  # ✅ Ensure proper URL building
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


   