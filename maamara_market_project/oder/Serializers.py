# serializers.py
from rest_framework import serializers
from .models import OderItem, Order, BillingAddress, Payment, Transaction
from ReactSerializers.models import Item
from core.Serializer import ItemSerializer
import bleach


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
        fields = ["method", "amount", "status"]

    def validate(self, attrs):
        if "method" in attrs:
            attrs["method"] = sanitize_text(attrs["method"])
        return attrs
    
    


# ✅ OrderItem Serializer
class OrderItemSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)  # nested item details
    total_item_price = serializers.SerializerMethodField()
    total_discount = serializers.SerializerMethodField()
    amount_saved = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    final_price_for_vendor = serializers.SerializerMethodField()  # ADD THIS

    class Meta:
        model = OderItem
        fields = [
            "id",
            "item",
            "user",
            "quantity",
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
            "final_price_for_vendor",  # ADD THIS
        ]

    def get_total_item_price(self, obj):
        return obj.get_total_item_price()

    def get_total_discount(self, obj):
        return obj.get_total_discount()

    def get_amount_saved(self, obj):
        return obj.get_amount_saved()

    def get_final_price(self, obj):
        return obj.get_final_price()

    def get_final_price_for_vendor(self, obj):
        return obj.get_final_price_for_vendor()  # call your model method



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

    def get_items(self, obj):
        vendor = self.context.get("vendor")
        if not vendor:
            # fallback: return all items if no vendor in context
            order_items = obj.order_items.all()
        else:
            order_items = obj.order_items.filter(item__vendor=vendor)
        return OrderItemSerializer(order_items, many=True).data

    def get_total(self, obj):
        return obj.get_total()

    def get_final_total(self, obj):
        return obj.final_total_of_cart()

    def get_total_qty(self, obj):
        return obj.get_total_qty()

    def get_total_for_vendor(self, obj):
        vendor = self.context.get("vendor")
        if not vendor:
            return None

        order_items = obj.order_items.filter(item__vendor=vendor)
        total = sum(item.get_final_price_for_vendor() for item in order_items)
        return int(round(total))


# fetch transaction for vendor
# serializers.py


class TransactionSerializer(serializers.ModelSerializer):
    order_id = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "mpesa_receipt_number",
            "phone_number",
            "amount",
            "status",
            "created_at",
            "order_id",
            "vendor_name",
            "items",
        ]

    def get_order_id(self, obj):
        return obj.order.id if obj.order else None

    def get_vendor_name(self, obj):
        """
        Return the vendor name from the first item in the order.
        """
        if obj.order:
            first_item = obj.order.items.first()
            if first_item and first_item.item and first_item.item.vendor:
                return first_item.item.vendor.username
        return None

    def get_items(self, obj):
        """
        Return details for all items in the order including quantity sold and remaining quantity.
        """
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
                "price": str(item.price),
                "image": item.image.url if item.image else None,
                "quantity_sold": order_item.item.in_stock,  # computed from the order item
                "remaining_qty": item.in_stock,        # stock or current quantity
            })
        return items_data
