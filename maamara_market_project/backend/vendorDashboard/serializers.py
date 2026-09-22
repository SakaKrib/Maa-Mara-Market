from rest_framework import serializers
from .models import VendorItemRequest, VendorDraft
from ReactSerializers.Serializers import VendorSerializer, PriceChangeRequest
from vendorDashboard.models import ReturnRequest

class VendorDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorDraft
        fields = "__all__"


class VendorItemRequestSerializer(serializers.ModelSerializer):
    description = serializers.CharField(max_length=1000)  # or larger if needed
    vendor = VendorSerializer(read_only=True)

    class Meta:
        model = VendorItemRequest
        fields = [
            "id", "vendor", "name", "description", "price", "image", "status", "created_at", "draft_item", "draft", "created_by"
        ]
        read_only_fields = ("vendor", "status", "draft")


#price change request serializer
class PriceChangeRequestSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    item_price = serializers.FloatField(source="item.price", read_only=True)
    requested_by_username = serializers.CharField(source="requested_by.username", read_only=True)

    class Meta:
        model = PriceChangeRequest
        fields = [
            "id",
            "item",
            "item_name",
            "item_price",
            "requested_by",
            "requested_by_username",
            "new_price",
            "approved",
            "approved_at",
            "created_at",
            "reason",
        ]
        read_only_fields = ["approved", "created_at", "approved_at", "requested_by", "approved_by"]

    def validate_reason(self, value):
        # Optional: require a reason if new_price differs significantly
        if value and len(value.strip()) == 0:
            raise serializers.ValidationError("Reason cannot be empty.")
        return value
    
    def perform_create(self, serializer):
        # Save the request with the logged-in user as requested_by
        serializer.save(requested_by=self.request.user)




# Request return
# vendorDashboard/serializers.py
from rest_framework import serializers
from vendorDashboard.models import ReturnRequest

class ReturnRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnRequest
        fields = "__all__"
        read_only_fields = [
            "item",          # set in view
            "customer",      # set in view
            "visitor_id",    # set in view
            "approved",      # handled by admin/vendor
            "processed",
            "refund_issued",
            "start_refund",
            "created_at",
        ]

    def validate(self, data):
        """
        Custom validation: ensure description/custom_reason if needed.
        """
        reason = data.get("reason")
        custom_reason = data.get("custom_reason")

        if reason == "custom" and not custom_reason:
            raise serializers.ValidationError({
                "custom_reason": "Please provide a custom reason when selecting 'Other'."
            })

        return data
