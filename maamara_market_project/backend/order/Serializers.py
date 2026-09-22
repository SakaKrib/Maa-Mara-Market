# serializers.py
from rest_framework import serializers
from .models import OrderItem, Order, BillingAddress, Payment, Transaction
from ReactSerializers.models import Item
from core.Serializer import ItemSerializer
import bleach # type: ignore
from decimal import Decimal


# ✅ Helper sanitizer
def sanitize_text(value):
    return bleach.clean(value.strip()) if value else ""


# ✅ Billing Address Serializer (with sanitization)
class BillingAddressSerializer(serializers.ModelSerializer):
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

    def validate(self, attrs):
        for field in attrs:
            if isinstance(attrs[field], str):
                attrs[field] = sanitize_text(attrs[field])
        return attrs


# ✅ Payment Serializer (with sanitization)
class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "payment_method", "amount", "status", "provider_amount", "provider_currency"]

    def validate(self, attrs):
        if "payment_method" in attrs:
            attrs["payment_method"] = sanitize_text(attrs["payment_method"])
        return attrs


class BaseSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        return self._convert_decimals(data)

    def _convert_decimals(self, obj):
        if isinstance(obj, list):
            return [self._convert_decimals(i) for i in obj]

        if isinstance(obj, dict):
            return {k: self._convert_decimals(v) for k, v in obj.items()}

        if isinstance(obj, Decimal):
            return float(obj)

        return obj


# ✅ OrderItem Serializer
class OrderItemSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)
    item_name = serializers.SerializerMethodField()

    total_item_price = serializers.SerializerMethodField()
    total_discount = serializers.SerializerMethodField()
    amount_saved = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    final_price_for_vendor = serializers.SerializerMethodField()
    selection_summary = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "item",
            "item_name",
            "user",
            "quantity",
            "color_variant",
            "size_stock",
            "age_variant",
            "selected_weight",
            "selected_length",
            "shoe_size",
            "custom_preferences",
            "selection_summary",
            "refunded",
            "refunded_at",
            "is_returned",
            "is_exchanged",
            "status",
            "ordered_date",
            "total_item_price",
            "total_discount",
            "amount_saved",
            "final_price",
            "final_price_for_vendor",
        ]

    def get_item_name(self, obj):
        item = getattr(obj, "item", None)
        return getattr(item, "name", None) or f"Item #{getattr(obj, 'item_id', obj.id)}"

    def get_selection_summary(self, obj):
        return {
            "color": obj.color_variant.color if obj.color_variant else None,
            "size": obj.size_stock.size if obj.size_stock else None,
            "age_group": obj.age_variant.age_group if obj.age_variant else None,
            "weight": obj.selected_weight,
            "length": obj.selected_length,
            "shoe_size": obj.shoe_size,
            "custom_preferences": obj.custom_preferences or {},
        }

    # =========================
    # ULTRA SAFE CONVERTER
    # =========================
    def to_float(self, value):
        if isinstance(value, Decimal):
            return float(value)

        if isinstance(value, dict):
            return {k: self.to_float(v) for k, v in value.items()}

        if isinstance(value, (list, tuple)):
            return [self.to_float(v) for v in value]

        if value is None:
            return 0.0

        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    # =========================
    # FIX: FORCE CLEAN NESTED ITEM TOO
    # =========================
    def to_representation(self, instance):
        data = super().to_representation(instance)
        return self.to_float(data)

    # =========================
    # FIELD METHODS
    # =========================
    def get_total_item_price(self, obj):
        return self.to_float(obj.get_total_item_price())

    def get_total_discount(self, obj):
        return self.to_float(obj.get_total_discount())

    def get_amount_saved(self, obj):
        return self.to_float(obj.get_amount_saved())

    def get_final_price(self, obj):
        return self.to_float(obj.get_final_price())

    def get_final_price_for_vendor(self, obj):
        return self.to_float(obj.get_final_price_for_vendor())


# ✅ Order Serializer
class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    final_total = serializers.SerializerMethodField()
    total_qty = serializers.SerializerMethodField()
    total_for_vendor = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "items",
            "ordered_date",
            "status",
            "updated_total_price",
            "billing_address",
            "payment",
            "total",
            "final_total",
            "total_qty",
            "total_for_vendor",
        ]

    # -----------------------
    # SAFE DECIMAL CONVERTER
    # -----------------------
    def to_float(self, value):
        if isinstance(value, Decimal):
            return float(value)
        return value

    # -----------------------
    # ITEMS (FILTERED BY VENDOR)
    # -----------------------
    def get_items(self, obj):
        vendor = self.context.get("vendor")

        if vendor:
            order_items = obj.order_items.filter(item__vendor=vendor)
        else:
            order_items = obj.order_items.all()

        return OrderItemSerializer(order_items, many=True).data

    # -----------------------
    # TOTAL
    # -----------------------
    def get_total(self, obj):
        return self.to_float(obj.get_total())

    # -----------------------
    # FINAL TOTAL
    # -----------------------
    def get_final_total(self, obj):
        return self.to_float(obj.final_total_of_cart())

    # -----------------------
    # TOTAL QTY
    # -----------------------
    def get_total_qty(self, obj):
        return obj.get_total_qty()

    # -----------------------
    # TOTAL FOR VENDOR
    # -----------------------
    def get_total_for_vendor(self, obj):
        vendor = self.context.get("vendor")

        if not vendor:
            return 0.0

        order_items = obj.order_items.filter(item__vendor=vendor)

        total = sum(
            float(item.get_final_price_for_vendor())
            for item in order_items
        )

        return float(total)


# fetch transaction for vendor
# serializers.py


class TransactionSerializer(serializers.ModelSerializer):
    txid = serializers.SerializerMethodField()
    order_id = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "txid",
            "mpesa_receipt_number",
            "phone_number",
            "amount",
            "status",
            "created_at",
            "order_id",
            "vendor_name",
            "items",
        ]

    # ✅ Transaction ID (VERY IMPORTANT FOR UI)
    def get_txid(self, obj):
        return (
            obj.mpesa_receipt_number
            or obj.paypal_transaction_id
            or obj.account_reference
            or f"TX-{obj.id}"
        )

    def get_order_id(self, obj):
        return obj.order.id if obj.order else None

    # ✅ Safer vendor resolution
    def get_vendor_name(self, obj):
        if obj.vendor:
            return getattr(obj.vendor, "business_name", None) or getattr(obj.vendor, "username", None)

        if obj.order:
            first_item = obj.order.items.first()
            if first_item and first_item.item and first_item.item.vendor:
                return getattr(first_item.item.vendor, "username", None)

        return "Unknown"

    # ✅ Ensure frontend-safe number
    def get_amount(self, obj):
        return float(obj.amount)

    def get_items(self, obj):
        if not obj.order:
            return []

        items_data = []

        for order_item in obj.order.items.all():
            item = order_item.item
            if not item:
                continue

            items_data.append({
                "id": item.id,
                "name": item.name,
                "price": float(item.price),
                "image": item.image.url if item.image else None,

                # ✅ FIXED
                "quantity_sold": order_item.quantity,

                # ✅ current stock
                "remaining_qty": item.in_stock,
            })

        return items_data
