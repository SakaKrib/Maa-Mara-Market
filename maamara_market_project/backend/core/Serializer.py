from django.contrib.auth import get_user_model
from django.db.models import Q

from rest_framework import generics, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import re

from ReactSerializers.models import (
    AgeVariant, Brand, Category, ColorVariant, Department, Item, Length,
    Offer, Section, ShippingDimension, Shoe, SizeStock, SubCategory, Weight,
)
from shop.models import Reaction, Review
from .models import ActivityLog, CalendarEvent, Notification, Profile

User = get_user_model()

class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = ["discount_percentage", "start_date", "end_date", "final_price"]




# notificatin serializers
class NotificationSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    vendor_request = serializers.PrimaryKeyRelatedField(read_only=True)
    display_title = serializers.SerializerMethodField()
    display_message = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'user',
            'title',
            'message',
            'display_title',
            'display_message',
            'vendor_request',
            'url',
            'seen',
            'is_read',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_display_title(self, obj):
        title = (obj.title or '').strip()
        if title:
            return title
        return 'Maa Mara Market update'

    def get_display_message(self, obj):
        message = (obj.message or '').strip()
        title = (obj.title or '').strip().lower()

        def unquote(value):
            return re.sub(r"'([^']+)'", r"\1", value)

        # Normalize the most common marketplace notifications so names are
        # natural, readable text rather than quoted fragments or usernames.
        if title == "item added to wishlist":
            match = re.search(r"added ['\"]?(.+?)['\"]? (?:from )?wishlist", message, re.I)
            item_name = match.group(1).strip(" .\"'") if match else None
            if item_name:
                return f"A customer added {item_name} to their wishlist."
        if title == "wishlist update":
            match = re.search(r"removed ['\"]?(.+?)['\"]? from wishlist", message, re.I)
            item_name = match.group(1).strip(" .\"'") if match else None
            if item_name:
                return f"A customer removed {item_name} from their wishlist."
        if title == "item request approved":
            match = re.search(r"request for ['\"]?(.+?)['\"]? (?:has|was) approved", message, re.I)
            if match:
                return f"Your request for {match.group(1).strip(' .\\\"\\\'')} has been approved."
        if title == "item request denied":
            match = re.search(r"request for ['\"]?(.+?)['\"]? (?:has|was) declined", message, re.I)
            if match:
                return f"Your request for {match.group(1).strip(' .\\\"\\\'')} was declined by the administrator."
        if title == "new price change request":
            match = re.search(r"for ['\"]?(.+?)['\"]?\\.?(?: Reason: (.*))?$", message, re.I)
            if match:
                item_name = match.group(1).strip(" .\\\"'")
                reason = (match.group(2) or "").strip()
                return f"A vendor submitted a price change request for {item_name}." + (f" Reason: {reason}" if reason else "")
        if title == "price change request approved":
            message = unquote(message)
            return re.sub(r"^Your request for ", "Your request for ", message)

        if message:
            return unquote(message)
        return 'There is a new update in your marketplace workspace.'

# mark as seen when opened
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_seen(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id)

        # ✅ Prevent regular users from changing other users' notifications
        if not request.user.is_staff and notification.user != request.user:
            return Response({'error': 'Not authorized'}, status=403)

        notification.seen = True
        notification.is_read = True
        notification.save(update_fields=['seen', 'is_read'])

        return Response({'status': 'read'})
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=404)


# item query serializer
from rest_framework import serializers
from  ReactSerializers.models import Item, ColorVariant, SizeStock, Department, Category, SubCategory, Section, Brand, ShippingDimension



class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "logo", "description"]


class ShippingDimensionSerializer(serializers.ModelSerializer):
    volumetric_weight = serializers.SerializerMethodField()
    chargeable_weight = serializers.SerializerMethodField()

    class Meta:
        model = ShippingDimension
        fields = [
            "id",
            "length",
            "width",
            "height",
            "weight",
            "unit",
            "weight_unit",
            "volumetric_weight",
            "chargeable_weight",
        ]

    def get_volumetric_weight(self, obj):
        return obj.volumetric_weight()

    def get_chargeable_weight(self, obj):
        return obj.chargeable_weight()

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name']

class SectionSerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ["id", "name", "departments"]        


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'department']


class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ['id', 'name', 'category']


class SizeStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = SizeStock
        fields = ["id", "size", "quantity_in_stock"]


class ColorVariantSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True)
    sizes = SizeStockSerializer(many=True, read_only=True)

    class Meta:
        model = ColorVariant
        fields = ["id", "color", "image", "sizes"]
class AgeVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgeVariant
        fields = ["id", "age_group", "quantity_in_stock"]


class WeightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Weight
        fields = ["id", "value", "unit"]


class LengthSerializer(serializers.ModelSerializer):
    class Meta:
        model = Length
        fields = ["id", "value", "unit"]


class ShoeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shoe
        fields = ["id", "shoe_type", "shoe_gender", "shoe_size"]



# Reaction Serializer
class ReactionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Reaction
        fields = ['id', 'user', 'visitor_id', 'reaction_type', 'created_at']

# Review Serializer
class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    reactions = ReactionSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'user', 'visitor_id', 'rating', 'review_text', 'created_at', 'reactions']        

class ItemSerializer(serializers.ModelSerializer):
    section = serializers.StringRelatedField()
    department = serializers.StringRelatedField()
    category = serializers.StringRelatedField()
    subcategory = serializers.StringRelatedField()
    image = serializers.ImageField(use_url=True)
    final_price = serializers.SerializerMethodField()
    final_discounted_price = serializers.SerializerMethodField()
    save_upto = serializers.SerializerMethodField()
    variants = ColorVariantSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    brand = BrandSerializer(read_only=True)
    shipping_dimension = ShippingDimensionSerializer(read_only=True)
    shipping_dimension_data = ShippingDimensionSerializer(write_only=True, required=False)
    vendor = serializers.StringRelatedField(read_only=True)
    offer = OfferSerializer(read_only=True) 

    size_only_icon = serializers.SerializerMethodField()
    age_variants = AgeVariantSerializer(source="kids_sizes", many=True, read_only=True)
    weight = WeightSerializer(read_only=True)
    length = LengthSerializer(read_only=True)
    shoe_inputs = ShoeSerializer(source="shoe_input", many=True, read_only=True)

    class Meta:
        model = Item
        fields = [
            "id",
            "name",
            "description",
            "image",
            "price",
            "discount_price",
            "in_stock",
            "offer",
            "in_offer",
            "available",
            "returnable",
            "section",
            "department",
            "category",
            "subcategory",
            "brand",
            "vendor",
            "item_attribute",
            "gender_based",
            "children_size_based_age",
            "shipping_dimension",
            "shipping_dimension_data",
            "in_offer",
            "is_organic",
            "manufactured_date",
            "expiry_date",
            "is_fresh_food",
            "slug",
            "image_hash",
            "likes",
            "views",
            "created_by",
            "created_at",
            "updated",
            "roast_type",
            "coffee_state",
            "final_price",
            "final_discounted_price",
            "save_upto",
            "variants",
            "size_only_icon",
            "age_variants",
            "weight",
            "length",
            "shoe_inputs",
            "offer",
            "average_rating",
            "reviews",
            "review_count",
        ]

    def get_size_only_icon(self, obj):
        return SizeStockSerializer(obj.size_only_icon.all(), many=True).data

    def get_final_price(self, obj):
        return round(obj.get_item_final_price(), 2)

    def get_final_discounted_price(self, obj):
        return round(obj.get_item_final_discounted_price(), 2)

    def get_save_upto(self, obj):
        # Call the model method safely
        try:
            return round(obj.get_save_upto or 0, 2)
        except Exception:
            return 0

    
    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if not reviews:
            return None
        return round(sum([review.rating for review in reviews]) / len(reviews), 2)
    
    def get_review_count(self, obj):
       
        return obj.reviews.count()


class ActivityLogSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)
    display_title = serializers.SerializerMethodField()
    display_message = serializers.SerializerMethodField()

    FRIENDLY_TITLES = {
        "item_request_created": "Item request submitted",
        "item_request_approved": "Item request approved",
        "item_request_denied": "Item request declined",
        "Price Change Requested": "Price change requested",
        "Price Change Approved": "Price change approved",
        "item_created": "Item added",
        "item_updated": "Item updated",
        "item_updated_qty": "Stock updated",
        "item_sold": "Item sold",
        "item_reviewed": "Customer review received",
        "item_added_to_cart": "Item added to cart",
        "item_removed_from_cart": "Item removed from cart",
        "item_added_to_wishlist": "Added to wishlist",
        "item_removed_from_wishlist": "Removed from wishlist",
        "order_created": "New order received",
        "order_completed": "Order completed",
        "refund_requested": "Refund requested",
        "refund_approved": "Refund approved",
        "exchange_requested": "Exchange requested",
        "exchange_approved": "Exchange approved",
        "vendor_approved": "Vendor account approved",
        "vendor_denied": "Vendor request declined",
        "user_registered": "New customer registered",
        "vendor_registered": "New vendor registered",
        "login": "Signed in",
        "logout": "Signed out",
        "blog_created": "Blog created",
        "comment_created": "Blog comment received",
        "react_created": "Blog reaction received",
        "react_removed": "Blog reaction removed",
        "banner_approved": "Banner approved",
        "banner_rejected": "Banner rejected",
        "blog_approved": "Blog approved",
        "return_requested": "Return requested",
        "return_rejected": "Return declined",
        "refund_approved": "Refund approved",
        "refund_approved_vendor": "Refund approved",
        "refund_approved_admin": "Refund approved",
        "exchange_approved_vendor": "Exchange approved",
        "exchange_approved_admin": "Exchange approved",
        "return_rejected_vendor": "Return declined",
        "return_rejected_admin": "Return declined",
        "paypal_payment": "Payment completed",
        "vendor_item_request_received": "Vendor item request received",
        "viewed_vendor_requests": "Vendor requests viewed",
        "approved_vendor": "Vendor approved",
    }

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'user',
            'visitor_id',
            'actor_type',
            'actor_role',
            'action',
            'description',
            'display_title',
            'display_message',
            'related_url',
            'timestamp',
            'item',
        ]

    def _actor_phrase(self, obj):
        request = self.context.get("request")
        current_user = getattr(request, "user", None) if request else None
        description = (obj.description or "").strip().lower()
        if description.startswith("the administrator"):
            return "The administrator"
        if description.startswith("a customer"):
            return "A customer"
        if description.startswith("a vendor"):
            return "A vendor"
        if description.startswith("your ") and obj.action in {
            "item_request_approved",
            "item_request_denied",
            "Price Change Approved",
            "refund_approved",
            "refund_approved_vendor",
            "exchange_approved",
            "exchange_approved_vendor",
            "return_rejected",
            "return_rejected_vendor",
        }:
            return "The administrator"
        if (
            current_user
            and current_user.is_authenticated
            and obj.user_id == current_user.id
            and description.startswith("you ")
        ):
            return "You"
        return {
            "user": "A customer",
            "vendor": "A vendor",
            "admin": "An administrator",
            "visitor": "A customer",
            "guest": "A customer",
        }.get(obj.actor_type, "A user")

    def _item_name(self, obj):
        item = getattr(obj, "item", None)
        return (getattr(item, "name", None) or "").strip() or "the item"

    def get_display_title(self, obj):
        return self.FRIENDLY_TITLES.get(
            obj.action,
            str(obj.action or obj.get_action_display()).replace("_", " ").strip().title(),
        )

    def get_display_message(self, obj):
        actor = self._actor_phrase(obj)
        item_name = self._item_name(obj)

        templates = {
            "item_added_to_wishlist": f"{actor} added {item_name} to their wishlist.",
            "item_removed_from_wishlist": f"{actor} removed {item_name} from their wishlist.",
            "item_added_to_cart": f"{actor} added {item_name} to their cart.",
            "item_removed_from_cart": f"{actor} removed {item_name} from their cart.",
            "item_viewed": f"{actor} viewed {item_name}.",
            "item_shared": f"{actor} shared {item_name}.",
            "item_reviewed": f"{actor} left a review for {item_name}.",
            "item_sold": f"{item_name} was purchased.",
            "item_created": f"{actor} added {item_name}.",
            "item_updated": f"{actor} updated {item_name}.",
            "item_updated_qty": f"{actor} updated the stock for {item_name}.",
            "item_request_created": f"{actor} submitted an item request for {item_name}.",
            "item_request_approved": f"{actor} approved the item request for {item_name}.",
            "item_request_denied": f"{actor} declined the item request for {item_name}.",
            "Price Change Requested": f"{actor} requested a price change for {item_name}.",
            "Price Change Approved": f"{actor} approved the price change request for {item_name}.",
            "order_created": f"{actor} received a new order.",
            "order_completed": f"{actor} completed an order.",
            "refund_requested": f"{actor} requested a refund.",
            "refund_approved": f"{actor} approved a refund for {item_name}.",
            "refund_approved_vendor": f"{actor} approved a refund for {item_name}.",
            "refund_approved_admin": f"{actor} approved a refund for {item_name}.",
            "exchange_requested": f"{actor} requested an exchange.",
            "exchange_approved": f"{actor} approved an exchange for {item_name}.",
            "exchange_approved_vendor": f"{actor} approved an exchange for {item_name}.",
            "exchange_approved_admin": f"{actor} approved an exchange for {item_name}.",
            "return_requested": f"{actor} requested a return for {item_name}.",
            "return_rejected": f"{actor} declined the return request for {item_name}.",
            "return_rejected_vendor": f"{actor} declined the return request for {item_name}.",
            "return_rejected_admin": f"{actor} declined the return request for {item_name}.",
            "paypal_payment": f"{actor} completed a PayPal payment.",
            "vendor_approved": f"{actor} approved the vendor account.",
            "vendor_denied": f"{actor} declined the vendor request.",
            "user_registered": f"{actor} registered a customer account.",
            "vendor_registered": f"{actor} registered a vendor account.",
            "login": f"{actor} signed in.",
            "logout": f"{actor} signed out.",
        }

        if obj.action in templates:
            return templates[obj.action]

        description = (obj.description or "").strip()
        return description or self.FRIENDLY_TITLES.get(obj.action, obj.get_action_display())




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_activity_logs(request):
    logs = ActivityLog.objects.all().select_related('user', 'item').order_by('-timestamp')

    if request.query_params.get('scope') == 'vendor':
        vendor = getattr(request.user, "vendor", None)
        if vendor is None:
            logs = logs.none()
        else:
            logs = logs.filter(
                Q(user=request.user) | Q(item__vendor=vendor)
            ).distinct()

    # The dashboard only needs a compact recent window. The dedicated vendor
    # activity page can request all matching records with ?all=true.
    if request.query_params.get('all') != 'true':
        logs = logs[:100]

    serializer = ActivityLogSerializer(logs, many=True)
    return Response(serializer.data)


#______________________

# ORGANIC
#_____________________
class OrganicItemsView(generics.ListAPIView):
    serializer_class = ItemSerializer

    def get_queryset(self):
        return Item.objects.filter(is_organic=True, available=True)


#______________________

# PROFILE SERIALIZERS
#_____________________

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["profile_picture", "date_of_birth", "location"]

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "profile"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()

        if profile_data:
            profile, created = Profile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance


# calendar serializer
class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = ["id", "title", "start", "end", "all_day"]