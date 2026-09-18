from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile, Wallet, Voucher, Referral
from order.models import  Order, OrderItem, Transaction, Customer, Payment, BillingAddress
from .Serializer import ItemSerializer

User = get_user_model()


# 🧍‍♂️ Basic User Serializer (optional if you want nested user details)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email"]


# 👤 Profile
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "phone_number",
            "address",
            "city",
            "country",
            "profile_picture",
            "location",
            "date_of_birth"
        ]

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.profile_picture:
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None



# ============================================================
# 💰 WALLET SERIALIZER
# ============================================================
class WalletSerializer(serializers.ModelSerializer):
    total_in_kes = serializers.SerializerMethodField()
    can_redeem_min = serializers.SerializerMethodField()
    can_redeem_max = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = [
            "balance",
            "earned_coins",
            "redeem_limit",
            "min_redeemable",
            "total_in_kes",
            "can_redeem_min",
            "can_redeem_max",
        ]

    def get_total_in_kes(self, obj):
        """Convert total coins into KES (shillings)."""
        return obj.total_coins_into_kes()

    def get_can_redeem_min(self, obj):
        """Return minimum redeemable coins rule."""
        return obj.min_redeemable

    def get_can_redeem_max(self, obj):
        """Return maximum redeemable coins rule."""
        return obj.redeem_limit


# ============================================================
# 🤝 REFERRAL SERIALIZER
# ============================================================
class ReferralSerializer(serializers.ModelSerializer):
    referral_link = serializers.SerializerMethodField()

    class Meta:
        model = Referral
        fields = [
            "referral_code",
            "total_referrals",
            "created_at",
            "referral_link",
        ]

    def get_referral_link(self, obj):
        """Generate a full referral link using the code."""
        request = self.context.get("request")
        base_url = request.build_absolute_uri("/") if request else "https://example.com/"
        return f"{base_url}register/?ref={obj.referral_code}"


# ============================================================
# 🎟️ VOUCHER SERIALIZER
# ============================================================
class VoucherSerializer(serializers.ModelSerializer):
    is_active = serializers.SerializerMethodField()
    status_message = serializers.SerializerMethodField()

    class Meta:
        model = Voucher
        fields = [
            "name",
            "code",
            "discount",
            "expiry_date",
            "redeemed",
            "is_active",
            "status_message",
        ]

    def get_is_active(self, obj):
        """Return True if voucher is not expired and not redeemed."""
        from datetime import date
        return (obj.expiry_date >= date.today()) and not obj.redeemed

    def get_status_message(self, obj):
        """Readable voucher status."""
        from datetime import date
        if obj.redeemed:
            return "Voucher already redeemed"
        elif obj.expiry_date < date.today():
            return "Voucher expired"
        return "Voucher active and ready to use"


# 🛒 Order Item
# -------------------- #
#  ORDER ITEM SERIALIZER
# -------------------- #
class OrderItemSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "item",
            "quantity",
            "status",
            "refunded",
            "is_returned",
            "is_exchanged",
            "ordered_date",
            "total_price",
        ]

    def get_total_price(self, obj):
        return obj.get_final_price()


# -------------------- #
#  BILLING ADDRESS SERIALIZER
# -------------------- #
class BillingAddressSerializer(serializers.ModelSerializer):
    country = serializers.SerializerMethodField()

    class Meta:
        model = BillingAddress
        fields = [
            "first_name",
            "last_name",
            "phone",
            "email",
            "street_address",
            "appartment_address",
            "city",
            "state",
            "country",
            "zip",
        ]

    def get_country(self, obj):
        return str(obj.country) if obj.country else None



# -------------------- #
#  PAYMENT SERIALIZER
# -------------------- #
class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "payment_method",
            "amount",
            "transaction_id",
            "status",
            "timestamp",
        ]


# -------------------- #
#  TRANSACTION SERIALIZER
# -------------------- #
class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "transaction_type",
            "payment_method",
            "amount",
            "status",
            "account_reference",
            "created_at",
        ]


# -------------------- #
#  ORDER SERIALIZER
# -------------------- #
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    billing_address = BillingAddressSerializer(read_only=True)
    payment = PaymentSerializer(read_only=True)
    transactions = TransactionSerializer(many=True, read_only=True)
    total_qty = serializers.SerializerMethodField()
    final_total = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "paypal_order_id",
            "status",
            "ordered_date",
            "created_at",
            "updated_total_price",
            "total_qty",
            "final_total",
            "billing_address",
            "payment",
            "transactions",
            "items",
        ]

    def get_total_qty(self, obj):
        return obj.get_total_qty()

    def get_final_total(self, obj):
        return obj.final_total_of_cart()