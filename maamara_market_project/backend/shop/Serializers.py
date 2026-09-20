from rest_framework import serializers
from django.utils import timezone
from ReactSerializers.models import Section, Department, Category, SubCategory, Brand, Item
from core.Serializer import *
from .models import *
from ReactSerializers.Serializers import VendorSerializer
from core.models import Profile



class VendorRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorRating
        fields = ['id', 'vendor', 'user', 'quality', 'communication', 'shipping', 'comment', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

# chat serializer
class ChatFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatFile
        fields = ['id', 'file', 'uploaded_at']



class SubCategorySerializer(serializers.ModelSerializer):
    count = serializers.SerializerMethodField()

    class Meta:
        model = SubCategory
        fields = ["id", "name", "count"]

    def get_count(self, obj):
        return obj.items.count()


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubCategorySerializer(many=True, read_only=True)
    count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "count", "subcategories"]

    def get_count(self, obj):
        return obj.items.count()


class DepartmentSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True, read_only=True)
    count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "name", "count", "categories"]

    def get_count(self, obj):
        return obj.items.count()


class SectionSerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)
    count = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ["id", "name", "count", "departments"]

    def get_count(self, obj):
        if obj.name.lower() == "general":
            # Count all items in the DB
            return Item.objects.count()
        return Item.objects.filter(section=obj).count()
    
    def get_items(self, obj):
        if obj.name.lower() == "general":
            return ItemSerializer(Item.objects.all(), many=True, context=self.context).data
        return ItemSerializer(Item.objects.filter(section=obj), many=True, context=self.context).data




class ProductSerializer(serializers.ModelSerializer):
    section = SectionSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    subcategory = SubCategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    final_price = serializers.SerializerMethodField()
    final_discounted_price = serializers.SerializerMethodField()
    save_upto = serializers.SerializerMethodField()
    variants = ColorVariantSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    sizes = serializers.SerializerMethodField()
    colors = serializers.SerializerMethodField()

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
            "available",
            "returnable",
            "section",
            "department",
            "category",
            "subcategory",
            "brand",
            "item_attribute",
            "gender_based",
            "children_size_based_age",
            "sizes",
            "kids_sizes",
            "colors",
            "is_organic",
            "weight",
            "manufactured_date",
            "expiry_date",
            "is_fresh_food",
            "slug",
            "likes",
            "views",
            "created_at",
            "updated",
            "final_price",
            "final_discounted_price",
            "save_upto",
            "variants",
            "average_rating",
            "reviews",
            "review_count",
        ]

    # --- Prices ---
    def get_final_price(self, obj):
        return round(obj.get_item_final_price(), 2)

    def get_final_discounted_price(self, obj):
        return round(obj.get_item_final_discounted_price(), 2)

    def get_save_upto(self, obj):
        return round(obj.get_save_upto, 2)

    # --- Reviews ---
    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if not reviews:
            return None
        return round(sum([review.rating for review in reviews]) / len(reviews), 2)

    def get_review_count(self, obj):
        return obj.reviews.count()

    # --- Sizes ---
    def get_sizes(self, obj):
        if hasattr(obj, "kids_sizes") and obj.kids_sizes.exists():
            return [size.name for size in obj.kids_sizes.all()]
        return []

    def get_colors(self, obj):
        if hasattr(obj, "variants") and obj.variants.exists():
            return [v.color for v in obj.variants.all()]
        return []

   



#shop banners

from .models import Banner

class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = [
            "id",
            "vendor",
            "item",
            "title",
            "subtitle",
            "image",

            # CTA system (NEW)
            "cta_type",
            "cta_item",
            "cta_url",

            "background_color",
            "is_active",
            "start_date",
            "end_date",
            "display_order",
        ]
        read_only_fields = ["vendor"]

    def create(self, validated_data):
        # Assign vendor automatically from logged-in user
        validated_data["vendor"] = self.context["request"].user.vendor

        item = validated_data.get("item")

        # ==============================
        # CTA LOGIC (NEW SYSTEM)
        # ==============================
        if item:
            validated_data["cta_type"] = "item"
            validated_data["cta_item"] = item
            validated_data["cta_url"] = None
        else:
            validated_data["cta_type"] = "external"
            validated_data["cta_item"] = None

        return super().create(validated_data)

    def update(self, instance, validated_data):
        item = validated_data.get("item") or instance.item
        if item and not validated_data.get("call_to_action_url"):
            validated_data["call_to_action_url"] = f"/product/{item.pk}/"
        return super().update(instance, validated_data)

        


# barnd serialixer

class BrandSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    vendor_logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ["id", "name", "description", "logo_url", "vendor_logo_url"]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url
        return None

    def get_vendor_logo_url(self, obj):
        vendor = getattr(obj, "vendor", None)  # 👈 this works because of related_name
        if vendor and vendor.vendor_company_logo:
            request = self.context.get("request")
            return (
                request.build_absolute_uri(vendor.vendor_company_logo.url)
                if request
                else vendor.vendor_company_logo.url
            )
        return None



# blog serialzer
# 🧡 Reaction Serializer
class ReactionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ReactionBlog
        fields = ['id', 'user_name', 'type', 'created_at', 'visitor_id']

# profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['id', 'profile_picture', 'date_of_birth', 'location', 'customer']


# user serializer
class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True) 
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'profile']

# 💬 Comment Serializer
class CommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = CommentBlog
        fields = ['id', 'user_name', 'text', 'created_at', 'visitor_id']


# 📝 Blog Post Serializer
class BlogPostSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user = UserSerializer(read_only=True)  
    vendor = VendorSerializer(read_only=True)  # ✅ return full vendor object
    comments = CommentSerializer(source='comments_blog', many=True, read_only=True)
    reactions = ReactionSerializer(source='reactions_blog', many=True, read_only=True)

    class Meta:
        model = BlogPost
        fields = [
            'id',
            'user_name',
            'vendor',
            'title',
            'content',
            'image',
            'video',
            'item',
            'approved',
            'created_at',
            'comments',
            'reactions',
            'user'
        ]


# wishlist
class WishlistSerializer(serializers.ModelSerializer):
    item = ProductSerializer(read_only=True)
    item_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(),
        source='item',
        write_only=True
    )

    class Meta:
        model = Wishlist
        fields = ['id', 'item', 'item_id', 'created_at', 'user', 'visitor_id']

class CareerVacancySerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerVacancy
        fields = "__all__"


class JobApplicationSerializer(serializers.ModelSerializer):
    vacancy_title = serializers.CharField(source="vacancy.title", read_only=True)
    vacancy_location = serializers.CharField(source="vacancy.location", read_only=True)

    class Meta:
        model = JobApplication
        fields = "__all__"
        read_only_fields = ["applied_at", "seen"]

    def validate_vacancy(self, vacancy):
        if not vacancy.is_active:
            raise serializers.ValidationError("This position is no longer accepting applications.")
        if vacancy.application_deadline and vacancy.application_deadline < timezone.localdate():
            raise serializers.ValidationError("The application deadline has passed.")
        return vacancy

    def validate_cv(self, value):
        allowed = {".pdf", ".doc", ".docx"}
        name = (value.name or "").lower()
        extension = "." + name.rsplit(".", 1)[-1] if "." in name else ""
        if extension not in allowed:
            raise serializers.ValidationError("CV must be a PDF, DOC, or DOCX file.")
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("CV must be smaller than 5 MB.")
        return value
