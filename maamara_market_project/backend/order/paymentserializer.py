from rest_framework import serializers
from .models import BillingAddress, Payment, Order, OrderItem
from ReactSerializers.models import Item
import bleach


# ✅ helper sanitizer
def sanitize_text(value):
    return bleach.clean(value.strip()) if isinstance(value, str) else value


class BillingAddressSerializer(serializers.ModelSerializer):
    # ✅ Force country to be a CharField instead of raw Country object
    country = serializers.CharField(source="country.code")

    class Meta:
        model = BillingAddress
        fields = "__all__"

    def validate(self, attrs):
        for field, value in attrs.items():
            if isinstance(value, str):
                attrs[field] = sanitize_text(value)
        return attrs
    

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"

    def validate(self, attrs):
        for field, value in attrs.items():
            if isinstance(value, str):
                attrs[field] = sanitize_text(value)
        return attrs


class ShippingSelectionSerializer(serializers.Serializer):
    provider = serializers.CharField()
    service = serializers.CharField()
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3)


class CheckoutSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    phone = serializers.CharField()
    email = serializers.EmailField()

    street_address = serializers.CharField()
    appartment_address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField()
    state = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField()
    zip = serializers.CharField()

    payment_method = serializers.ChoiceField(choices=["Mpesa", "PayPal"])
    items = serializers.ListField(child=serializers.DictField())  # list of cart items
    shipping = ShippingSelectionSerializer(required=False, allow_null=True)
    visitor_id = serializers.CharField(required=False, allow_blank=True)

    # ✅ sanitize inputs
    def validate(self, attrs):
        for field, value in attrs.items():
            if isinstance(value, str):
                attrs[field] = sanitize_text(value)
        return attrs


class OrderResponseSerializer(serializers.ModelSerializer):
    billing_address = BillingAddressSerializer()
    payment = PaymentSerializer()

    class Meta:
        model = Order
        fields = ["id", "status", "updated_total_price", "paypal_order_id", "shipping_amount", "shipping_provider", "shipping_service", "shipping_provider_amount", "shipping_currency", "billing_address", "payment"]
