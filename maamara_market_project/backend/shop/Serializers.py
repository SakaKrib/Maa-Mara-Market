import html

import bleach
from rest_framework import serializers
from django.utils import timezone
from ReactSerializers.models import Section, Department, Category, SubCategory, Brand, Item
from core.Serializer import *
from .sanitizers import sanitize_rich_text
from .models import *
from ReactSerializers.Serializers import VendorSerializer
from core.models import Profile
from vendorDashboard.models import Vendor



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
        # Item.subcategory uses Django's default reverse accessor (item_set),
        # so query the FK directly rather than relying on obj.items.
        return Item.objects.filter(subcategory=obj).count()


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubCategorySerializer(many=True, read_only=True)
    count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "count", "subcategories"]

    def get_count(self, obj):
        # Item.category has no related_name="items"; count through the FK.
        return Item.objects.filter(category=obj).count()


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
        return Item.objects.filter(section=obj).count()

    def get_items(self, obj):
        return ItemSerializer(
            Item.objects.filter(section=obj),
            many=True,
            context=self.context,
        ).data




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

# Curated banner palette (must match BANNER_COLORS in the vendor banner form).
ALLOWED_BANNER_COLORS = {
    "#f5f4f1", "#eef3f8", "#edf4ea", "#f6efe7",
    "#f8eaea", "#f3eef7", "#eaf4f4", "#efefec",
}


class BannerSerializer(serializers.ModelSerializer):
    def validate_background_color(self, value):
        value = (value or "").strip().lower()
        if value and value not in ALLOWED_BANNER_COLORS:
            raise serializers.ValidationError("Choose a colour from the banner palette.")
        return value or None

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
    website_url = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ["id", "name", "description", "logo_url", "vendor_logo_url", "website_url"]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url
        return None

    def get_vendor_logo_url(self, obj):
        # Brand.vendor is a reverse OneToOne relation. Accessing it raises
        # Vendor.DoesNotExist when no vendor is linked, so guard that case
        # rather than allowing one unlinked brand to break the whole directory.
        try:
            vendor = obj.vendor
        except Exception:
            vendor = None

        if not vendor or not vendor.vendor_company_logo:
            return None

        request = self.context.get("request")
        try:
            logo_url = vendor.vendor_company_logo.url
        except (ValueError, AttributeError):
            return None
        return request.build_absolute_uri(logo_url) if request else logo_url

    def get_website_url(self, obj):
        # The website is stored on Vendor, not Brand. Prefer the explicit
        # reverse OneToOne relation, then query the FK directly as a fallback.
        try:
            vendor = obj.vendor
        except Vendor.DoesNotExist:
            vendor = None

        website_url = (getattr(vendor, "website_url", None) or "").strip()
        if website_url:
            return website_url

        # Older vendor records may have a website and matching company name
        # but no brand FK. Only use an exact company/brand-name match.
        website_url = (
            Vendor.objects.filter(brand_id=obj.pk)
            .exclude(website_url__isnull=True)
            .exclude(website_url="")
            .values_list("website_url", flat=True)
            .first()
        )
        if website_url:
            return website_url.strip()

        return (
            Vendor.objects.filter(company_name__iexact=obj.name)
            .exclude(website_url__isnull=True)
            .exclude(website_url="")
            .order_by("-date_updated")
            .values_list("website_url", flat=True)
            .first()
        ) or None



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
    MAX_BLOG_IMAGE_BYTES = 10 * 1024 * 1024
    MAX_BLOG_VIDEO_BYTES = 100 * 1024 * 1024
    ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/ogg"}

    def validate_content(self, value):
        return sanitize_rich_text(value)

    def validate_image(self, value):
        # Image and video are optional; only validate when a file is supplied.
        if value and hasattr(value, "content_type"):
            if not (value.content_type or "").startswith("image/"):
                raise serializers.ValidationError("The blog image must be an image file.")
            if value.size > self.MAX_BLOG_IMAGE_BYTES:
                raise serializers.ValidationError("The blog image must be 10 MB or smaller.")
        return value

    def validate_video(self, value):
        if value and hasattr(value, "content_type"):
            if (value.content_type or "").lower() not in self.ALLOWED_VIDEO_TYPES:
                raise serializers.ValidationError("The blog video must be MP4, WebM, MOV or OGG.")
            if value.size > self.MAX_BLOG_VIDEO_BYTES:
                raise serializers.ValidationError("The blog video must be 100 MB or smaller.")
        return value

    excerpt = serializers.SerializerMethodField()

    def get_excerpt(self, obj):
        # Plain-text preview for cards: all markup stripped, never raw HTML.
        text = bleach.clean(obj.content or "", tags=[], strip=True)
        text = " ".join(html.unescape(text).split())
        return text[:160] + ("..." if len(text) > 160 else "")

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
            'user',
            'view_count',
            'excerpt',
        ]
        read_only_fields = ['view_count', 'approved']


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
    def validate_description(self, value):
        return sanitize_rich_text(value)

    def validate_requirements(self, value):
        return sanitize_rich_text(value)

    def validate_responsibilities(self, value):
        return sanitize_rich_text(value)

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
