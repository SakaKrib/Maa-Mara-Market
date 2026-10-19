from django.contrib.auth import get_user_model
from django.db.models import Q

from rest_framework import generics, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAuthenticatedOrVisitor
from rest_framework.response import Response
import re

from ReactSerializers.models import (
    AgeVariant, Brand, Category, ColorVariant, Department, Item, Length,
    Offer, Occasion, Section, ShippingDimension, Shoe, SizeStock, SubCategory, Weight,
    ItemAdditionalImage,
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
    url = serializers.SerializerMethodField()

    def get_url(self, obj):
        # Resolve legacy records at read time too, so existing in-app alerts
        # open the source item without requiring a data migration.
        return obj._resolve_navigation_url()

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

    def _vendor_label(self, user=None, vendor=None):
        if vendor is None and user is not None:
            try:
                vendor = user.vendor
            except Exception:
                vendor = None

        name = ""
        if vendor is not None:
            name = " ".join(
                part for part in (
                    getattr(vendor, "first_name", ""),
                    getattr(vendor, "surname_name", ""),
                ) if part
            ).strip()
            name = name or (getattr(vendor, "company_name", "") or "").strip()
            name = name or (getattr(vendor, "username", "") or "").strip()

        if not name and user is not None:
            name = (user.get_full_name() or "").strip() or (getattr(user, "username", "") or "").strip()

        if not name:
            return "A vendor"
        return name if name.lower().startswith("vendor ") else f"Vendor {name}"

    def _notification_vendor_label(self, obj):
        vendor_request = getattr(obj, "vendor_request", None)
        vendor_user = getattr(vendor_request, "user", None) if vendor_request else None
        if vendor_user is not None:
            return self._vendor_label(user=vendor_user)

        # Older item-request notifications only retained the request id in the URL.
        match = re.search(r"vendoritemrequest/(\d+)", obj.url or "", re.I)
        if match:
            try:
                from vendorDashboard.models import VendorItemRequest
                item_request = VendorItemRequest.objects.select_related("vendor__user").get(pk=int(match.group(1)))
                vendor = getattr(item_request, "vendor", None)
                vendor_user = getattr(vendor, "user", None) if vendor else None
                return self._vendor_label(user=vendor_user, vendor=vendor)
            except Exception:
                return ""
        return ""

    def get_display_message(self, obj):
        message = (obj.message or '').strip()
        title = (obj.title or '').strip().lower()

        def unquote(value):
            return re.sub(r"'([^']+)'", r"\1", value)

        normalized_message = unquote(message)
        request = self.context.get("request")
        viewer = getattr(request, "user", None) if request else None
        is_admin_viewer = bool(
            viewer and getattr(viewer, "is_authenticated", False)
            and (viewer.is_staff or viewer.is_superuser)
        )
        is_vendor_viewer = False
        if viewer and getattr(viewer, "is_authenticated", False) and not is_admin_viewer:
            try:
                is_vendor_viewer = viewer.vendor is not None
            except Exception:
                is_vendor_viewer = False

        # Vendor actions appear in first person on the vendor's own notification feed.
        if is_vendor_viewer:
            normalized_message = re.sub(
                r"^A vendor\b", "You", normalized_message, count=1, flags=re.I
            )
            normalized_message = re.sub(
                r"^Vendor .+? (?=(?:submitted|updated|added)\b)",
                "You ",
                normalized_message,
                count=1,
                flags=re.I,
            )

        # Normalize older generic vendor messages in the administrator feed.
        # Newly created notifications already carry the named vendor.
        if is_admin_viewer and re.match(r"^A vendor\b", normalized_message, re.I):
            vendor_label = self._notification_vendor_label(obj)
            if vendor_label:
                normalized_message = re.sub(
                    r"^A vendor\b", vendor_label, normalized_message, count=1, flags=re.I
                )

        # Preserve already-normalized audience-aware messages. This prevents
        # legacy patterns below from duplicating phrases such as "to their wishlist".
        if re.match(r"^(A customer|A vendor|Vendor |The administrator|An administrator|Your|You)\b", normalized_message):
            return normalized_message

        legacy_patterns = [
            (r"^New vendor request submitted by .+\.?$", "A vendor submitted a new vendor request."),
            (r"^Vendor request \d+ updated to status .+$", "A vendor request was updated."),
        ]
        for pattern, replacement in legacy_patterns:
            if re.match(pattern, normalized_message, re.I):
                return replacement

        # Normalize legacy marketplace notifications so old records remain
        # readable without exposing usernames or quoted item names.
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
@permission_classes([IsAuthenticatedOrVisitor])
def mark_notification_seen(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id)

        if request.user and request.user.is_authenticated:
            # Staff may manage the full feed; regular users only their own.
            if not request.user.is_staff and not request.user.is_superuser and notification.user != request.user:
                return Response({'error': 'Not authorized'}, status=403)
        else:
            # Visitors may only mark notifications tied to their validated visitor cookie.
            visitor_id = request.COOKIES.get("visitorId")
            if not visitor_id or notification.visitor_id != visitor_id:
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

class ItemAdditionalImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True)

    class Meta:
        model = ItemAdditionalImage
        fields = ["id", "image", "created_at"]
        read_only_fields = ["id", "created_at"]


class OccasionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Occasion
        fields = ["key", "name", "description"]


class ItemSerializer(serializers.ModelSerializer):
    section = serializers.StringRelatedField()
    department = serializers.StringRelatedField()
    category = serializers.StringRelatedField()
    subcategory = serializers.StringRelatedField()
    image = serializers.ImageField(use_url=True)
    video = serializers.FileField(use_url=True, read_only=True, allow_null=True)
    additional_images = ItemAdditionalImageSerializer(many=True, read_only=True)
    occasions = serializers.SerializerMethodField()
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
    # Preserve the relation names consumed by the customer product page while
    # retaining the existing age_variants/shoe_inputs response aliases.
    kids_sizes = AgeVariantSerializer(many=True, read_only=True)
    shoe_input = ShoeSerializer(many=True, read_only=True)

    class Meta:
        model = Item
        fields = [
            "id",
            "name",
            "description",
            "image",
            "video",
            "additional_images",
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
            "occasions",
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
            "kids_sizes",
            "shoe_input",
            "offer",
            "average_rating",
            "reviews",
            "review_count",
        ]

    def get_occasions(self, obj):
        return [occasion.name for occasion in obj.occasions.all()]

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

    def _vendor_label(self, obj):
        user = getattr(obj, "user", None)
        vendor = None

        if obj.actor_type == "admin":
            # Legacy admin rows retained the item-request id in related_url.
            match = re.search(r"vendoritemrequest/(\d+)", obj.related_url or "", re.I)
            if not match:
                return "A vendor"
            try:
                from vendorDashboard.models import VendorItemRequest
                item_request = VendorItemRequest.objects.select_related("vendor__user").get(
                    pk=int(match.group(1))
                )
                vendor = item_request.vendor
                user = getattr(vendor, "user", None)
            except Exception:
                return "A vendor"
        else:
            try:
                vendor = user.vendor if user is not None else None
            except Exception:
                vendor = None

        name = ""
        if vendor is not None:
            name = " ".join(
                part for part in (
                    getattr(vendor, "first_name", ""),
                    getattr(vendor, "surname_name", ""),
                ) if part
            ).strip()
            name = name or (getattr(vendor, "company_name", "") or "").strip()
            name = name or (getattr(vendor, "username", "") or "").strip()
        if not name and user is not None:
            name = (user.get_full_name() or "").strip() or (getattr(user, "username", "") or "").strip()
        if not name:
            return "A vendor"
        return name if name.lower().startswith("vendor ") else f"Vendor {name}"

    def _actor_phrase(self, obj):
        request = self.context.get("request")
        current_user = getattr(request, "user", None) if request else None
        is_authenticated = bool(current_user and getattr(current_user, "is_authenticated", False))
        is_admin_viewer = bool(
            is_authenticated and (current_user.is_staff or current_user.is_superuser)
        )
        description = (obj.description or "").strip().lower()

        # A vendor's own activity should read in first person in the vendor
        # feed, including legacy records written with third-person wording.
        if description.startswith("you "):
            return "You"
        if (
            is_authenticated
            and not is_admin_viewer
            and obj.user_id == current_user.id
            and obj.actor_type == "vendor"
        ):
            return "You"

        # The administrator feed identifies which vendor performed the action.
        if obj.actor_type == "vendor" and is_admin_viewer:
            return self._vendor_label(obj)
        if description.startswith("the administrator"):
            return "The administrator"
        if description.startswith("a customer"):
            return "A customer"
        if description.startswith("a vendor"):
            if (
                is_admin_viewer
                and obj.actor_type == "admin"
                and obj.action == "vendor_item_request_received"
            ):
                vendor_label = self._vendor_label(obj)
                if vendor_label != "A vendor":
                    return vendor_label
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
            is_authenticated
            and obj.user_id == current_user.id
            and obj.actor_type in {"user", "vendor"}
            and obj.action in {
                "item_added_to_cart",
                "item_removed_from_cart",
                "item_updated_qty",
                "item_added_to_wishlist",
                "item_removed_from_wishlist",
                "item_viewed",
                "item_shared",
                "item_reviewed",
                "return_requested",
                "refund_requested",
                "exchange_requested",
            }
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
        item_name = (getattr(item, "name", None) or "").strip()
        if item_name:
            return item_name

        # Older activity rows may not have an Item FK. First resolve an
        # item id from its navigation URL, then fall back to the saved message.
        related_url = (getattr(obj, "related_url", None) or "").strip()
        item_match = re.search(r"/(?:items?|item-onsite/items)/(\d+)(?:/|$)", related_url, re.I)
        if item_match:
            linked_name = Item.objects.filter(pk=int(item_match.group(1))).values_list("name", flat=True).first()
            if linked_name:
                return linked_name.strip()

        description = (getattr(obj, "description", None) or "").strip()
        patterns = {
            "item_created": r"\badded\s+(.+?)(?:[.!]|$)",
            "item_updated": r"\bupdated\s+(.+?)(?:[.!]|$)",
            "item_updated_qty": r"\bupdated the stock for\s+(.+?)(?:[.!]|$)",
            "item_request_created": r"(?:item request for|vendor request for)\s+(.+?)(?=\s+(?:was|has been)\s+(?:approved|declined|denied)|[.!]?$)",
            "item_request_approved": r"(?:item request for|vendor request for)\s+(.+?)(?=\s+(?:was|has been)\s+(?:approved|declined|denied)|[.!]?$)",
            "item_request_denied": r"(?:item request for|vendor request for)\s+(.+?)(?=\s+(?:was|has been)\s+(?:approved|declined|denied)|[.!]?$)",
            "Price Change Requested": r"price change for\s+(.+?)(?:[.!]|$)",
            "Price Change Approved": r"price change(?: request)? for\s+(.+?)(?:[.!]|$)",
        }
        pattern = patterns.get(obj.action)
        match = re.search(pattern, description, flags=re.I) if pattern else None
        return (match.group(1).strip(" .\\\"'") if match else "") or "the item"

    def get_display_title(self, obj):
        return self.FRIENDLY_TITLES.get(
            obj.action,
            str(obj.action or obj.get_action_display()).replace("_", " ").strip().title(),
        )

    def get_display_message(self, obj):
        description = (obj.description or "").strip()
        if (
            obj.action in {"item_created", "item_updated", "vendor_item_request_received"}
            and description.lower().startswith("vendor ")
            and (obj.actor_type == "admin" or bool(
                self.context.get("request")
                and getattr(self.context["request"], "user", None)
                and (
                    self.context["request"].user.is_staff
                    or self.context["request"].user.is_superuser
                )
            ))
        ):
            # Keep the named vendor wording in the administrator's feed only.
            return re.sub(r"'([^']+)'", r"\1", description)
        if (
            obj.action == "vendor_item_request_received"
            and description.lower().startswith("a vendor ")
        ):
            vendor_label = self._vendor_label(obj)
            if vendor_label != "A vendor":
                return re.sub(r"^A vendor\b", vendor_label, description, count=1, flags=re.I)

        request = self.context.get("request")
        viewer = getattr(request, "user", None) if request else None
        is_authenticated = bool(viewer and getattr(viewer, "is_authenticated", False))
        is_admin_viewer = bool(
            is_authenticated and (viewer.is_staff or viewer.is_superuser)
        )
        is_own_vendor_activity = bool(
            is_authenticated
            and not is_admin_viewer
            and obj.actor_type == "vendor"
            and obj.user_id == viewer.id
        )

        item_name = self._item_name(obj)
        if obj.action == "item_request_created" and is_own_vendor_activity:
            return f"You submitted an item request for {item_name}."
        if obj.action == "item_request_approved":
            if is_admin_viewer and obj.actor_type == "admin":
                return f"You approved the item request for {item_name}."
            if is_own_vendor_activity:
                return f"Your item {item_name} was approved."
            return f"The administrator approved the item request for {item_name}."
        if obj.action == "item_request_denied":
            if is_admin_viewer and obj.actor_type == "admin":
                return f"You declined the item request for {item_name}."
            if is_own_vendor_activity:
                return f"Your item {item_name} was declined by the administrator."
            return f"The administrator declined the item request for {item_name}."

        actor = self._actor_phrase(obj)

        templates = {
            "item_added_to_wishlist": f"{actor} added {item_name} to your wishlist." if actor == "You" else f"{actor} added {item_name} to their wishlist.",
            "item_removed_from_wishlist": f"{actor} removed {item_name} from your wishlist." if actor == "You" else f"{actor} removed {item_name} from their wishlist.",
            "item_added_to_cart": f"{actor} added {item_name} to your cart." if actor == "You" else f"{actor} added {item_name} to their cart.",
            "item_removed_from_cart": f"{actor} removed {item_name} from your cart." if actor == "You" else f"{actor} removed {item_name} from their cart.",
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
            "blog_created": f"{actor} created a blog post.",
            "blog_approved": f"{actor} approved a blog post.",
            "comment_created": f"{actor} received a new blog comment.",
            "react_created": f"{actor} received a new blog reaction.",
            "react_removed": f"{actor} removed a blog reaction.",
            "banner_approved": f"{actor} approved the banner.",
            "banner_rejected": f"{actor} rejected the banner.",
            "vendor_item_request_received": f"{actor} received a vendor item request.",
            "viewed_vendor_requests": f"{actor} viewed vendor requests.",
            "approved_vendor": f"{actor} approved a vendor account.",
            "cart_item_removed_notification": f"{actor} removed {item_name} from their cart.",
            "paypal_payment": f"{actor} completed a PayPal payment.",
        }

        if obj.action in templates:
            return templates[obj.action]

        description = (obj.description or "").strip()
        if description:
            return re.sub(r"'([^']+)'", r"\1", description)
        return self.FRIENDLY_TITLES.get(
            obj.action,
            str(obj.action or obj.get_action_display()).replace("_", " ").strip().title(),
        )




def _keep_latest_vendor_request_view(logs):
    """Keep one legacy vendor-request-view row while the GET remains read-only."""
    latest_id = (
        logs.filter(action="viewed_vendor_requests")
        .order_by("-timestamp")
        .values_list("id", flat=True)
        .first()
    )
    if latest_id is None:
        return logs
    return logs.filter(~Q(action="viewed_vendor_requests") | Q(pk=latest_id))


def activity_logs_for_user(user):
    """Return only activity records appropriate for the authenticated dashboard role."""
    logs = ActivityLog.objects.all().select_related("user", "item").order_by("-timestamp")
    if not user or not user.is_authenticated:
        return logs.none()
    if user.is_staff or user.is_superuser:
        return _keep_latest_vendor_request_view(logs.filter(actor_type="admin"))
    vendor = getattr(user, "vendor", None)
    if vendor is None:
        return logs.none()
    return logs.filter(user=user, actor_type="vendor")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_activity_logs(request):
    base_logs = ActivityLog.objects.all().select_related("user", "item").order_by("-timestamp")
    scope = request.query_params.get("scope")
    is_admin = bool(request.user.is_staff or request.user.is_superuser)
    vendor = getattr(request.user, "vendor", None)

    if scope not in (None, "admin", "vendor"):
        return Response({"detail": "Unsupported activity scope."}, status=400)

    if scope == "admin":
        if not is_admin:
            return Response({"detail": "Administrator activity access required."}, status=403)
        logs = base_logs.filter(actor_type="admin")
    elif scope == "vendor":
        if is_admin or vendor is None:
            return Response({"detail": "Vendor activity access required."}, status=403)
        logs = base_logs.filter(user=request.user, actor_type="vendor")
    else:
        if is_admin:
            logs = base_logs.filter(actor_type="admin")
        elif vendor is not None:
            logs = base_logs.filter(user=request.user, actor_type="vendor")
        else:
            return Response({"detail": "An admin or vendor account is required."}, status=403)

    if is_admin:
        logs = _keep_latest_vendor_request_view(logs)

    # Keep the dashboard compact; the full vendor activity page can request all records.
    if request.query_params.get("all") != "true":
        logs = logs[:100]

    serializer = ActivityLogSerializer(logs, many=True, context={"request": request})
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