from django.contrib.auth import get_user_model

from rest_framework import generics, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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

    class Meta:
        model = Notification
        fields = [
            'id',
            'user',
            'title',
            'message',
            'vendor_request',
            'url',
            'seen',
            'is_read',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

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
    item = ItemSerializer(read_only=True)  # 👈 nested item data

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
            'related_url',
            'timestamp',
            'item',  # 👈 include item
        ]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_activity_logs(request):
    logs = ActivityLog.objects.all().order_by('-timestamp')[:100]
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