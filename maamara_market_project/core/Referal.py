import uuid
from datetime import timedelta
from django.utils.timezone import now
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Voucher, Referral, Wallet
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import IntegrityError
from oder.models import Order



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_voucher(request):
    """
    Generate a new voucher for the authenticated user.
    Only one active, unredeemed voucher allowed at a time.
    """
    user = request.user

    # ✅ Check if user already has an active voucher
    existing_voucher = Voucher.objects.filter(
        user=user, redeemed=False, expiry_date__gte=now()
    ).exists()
    if existing_voucher:
        return Response(
            {"success": False, "message": "You already have an active voucher."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ✅ Create unique voucher code
    unique_code = f"WELCOME-{uuid.uuid4().hex[:8].upper()}"

    # ✅ Create new voucher
    voucher = Voucher.objects.create(
        user=user,
        code=unique_code,
        discount="10% off",
        expiry_date=now() + timedelta(days=30)
    )

    return Response(
        {
            "success": True,
            "voucher_code": voucher.code,
            "discount": voucher.discount,
            "expiry_date": voucher.expiry_date,
        },
        status=status.HTTP_201_CREATED
    )



# ___________________

# GET REFERAL LINK
#___________________
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_referral_link(request):
    """Return the user's referral link, wallet info, and active vouchers."""
    user = request.user

    # Get or create referral object for this user
    referral, created = Referral.objects.get_or_create(referrer=user)
    if created or not referral.referral_code:
        referral.referral_code = str(uuid.uuid4())[:8]
        referral.save()

    # Build referral link dynamically (update base URL as needed)
    referral_link = f"http://127.0.0.1:8000/register?ref={referral.referral_code}"

    # Get or create wallet
    wallet, _ = Wallet.objects.get_or_create(user=user)

    # Get unredeemed vouchers
    vouchers = Voucher.objects.filter(user=user, redeemed=False, expiry_date__gte=now())

    # Format voucher list
    voucher_data = [
        {"code": v.code, "discount": v.discount, "expiry_date": v.expiry_date}
        for v in vouchers
    ]

    return Response({
        "success": True,
        "referral_code": referral.referral_code,
        "referral_link": referral_link,
        "wallet": {
            "balance": wallet.balance,
            "earned_coins": wallet.earned_coins
        },
        "vouchers": voucher_data
    })



# ___________________

# Track referal
#___________________

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def track_referral(request):
    """
    Track a referral and reward the referrer.
    """
    referral_code = request.data.get("referral_code")

    if not referral_code:
        return Response({"success": False, "message": "Referral code missing."},
                        status=status.HTTP_400_BAD_REQUEST)

    referral = Referral.objects.filter(referral_code=referral_code).first()
    if not referral:
        return Response({"success": False, "message": "Invalid referral code."},
                        status=status.HTTP_404_NOT_FOUND)

    if referral.invited_user:
        return Response({"success": False, "message": "Referral code already used."},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        referral.invited_user = request.user
        referral.save()

        # Ensure referrer has a wallet
        wallet, _ = Wallet.objects.get_or_create(user=referral.referrer)

        # Reward referrer
        wallet.earned_coins += 50
        wallet.balance += 50
        wallet.save()

        # Update total referral count
        referral.referrer.referrals.update_total_referrals()

        return Response({
            "success": True,
            "message": "Referral tracked successfully. Coins awarded to referrer!",
            "referrer": referral.referrer.username,
            "new_referrer_balance": wallet.balance
        })

    except IntegrityError:
        return Response({"success": False, "message": "Referral tracking error, please try again."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


# ___________________

# user account
#___________________

@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def user_account(request):
    """
    Handles profile retrieval and updates for authenticated users.
    Also returns wallet, vouchers, referral, and completed orders.
    """
    user = request.user
    profile = getattr(user, "profile", None)

    # ✅ Ensure wallet & referral exist
    wallet, _ = Wallet.objects.get_or_create(user=user, defaults={"balance": 0, "earned_coins": 0})
    referral, _ = Referral.objects.get_or_create(referrer=user)

    if request.method == "PUT":
        try:
            # Update basic user fields
            user.first_name = request.data.get("first_name", user.first_name)
            user.last_name = request.data.get("last_name", user.last_name)
            user.email = request.data.get("email", user.email)

            # Handle profile picture
            if "profile_picture" in request.FILES and profile:
                profile.profile_picture = request.FILES["profile_picture"]
                profile.save()

            user.save()

            return Response(
                {"success": True, "message": "Profile updated successfully."},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"success": False, "message": f"Error updating profile: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # GET: Return user info
    vouchers = Voucher.objects.filter(user=user, redeemed=False, expiry_date__gte=now())
    orders = Order.objects.filter(user=user, status="completed").order_by("-ordered_date")

    data = {
        "user": {
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "profile_picture": profile.profile_picture.url if profile and profile.profile_picture else None,
        },
        "wallet": {
            "balance": wallet.balance,
            "earned_coins": wallet.earned_coins,
            "total_kes": wallet.total_coins_into_kes(),
        },
        "referral": {
            "referral_code": referral.referral_code,
            "total_referrals": referral.total_referrals,
        },
        "vouchers": [
            {"code": v.code, "discount": v.discount, "expiry_date": v.expiry_date}
            for v in vouchers
        ],
        "orders": [
            {
                "id": o.id,
                "total_amount": o.total_amount,
                "ordered_date": o.ordered_date,
                "status": o.status,
            }
            for o in orders
        ],
    }

    return Response(data, status=status.HTTP_200_OK)

