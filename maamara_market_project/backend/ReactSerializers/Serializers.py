# shop/serializers.py
from rest_framework import serializers
from vendorDashboard.models import Vendor,VendorPayout, VendorAdjustment
from django.contrib.auth.models import User
from core.models import Profile
from .models import Item
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from .models import *
from django.contrib.auth import get_user_model
from vendorDashboard.models import *
from core.activity_logger import log_activity
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from core.Serializer import ReviewSerializer
import bleach # type: ignore


class ItemAdditionalImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True)

    class Meta:
        model = ItemAdditionalImage
        fields = ["id", "image", "created_at"]
        read_only_fields = ["id", "created_at"]


# --- Brand Serializer ---
class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "description", "logo"]





class VendorSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(required=False, allow_null=True)
    profile_completion = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = "__all__"   # include all vendor fields + profile_completion

    def get_profile_completion(self, obj):
        # fields considered for profile completion
        fields = [
            "surname_name", "middle_name", "first_name", "phone_number",
            "username", "email", "password", "id_number", "product_type",
            "is_food", "Are_You_KEBS_certified", "product_description",
            "company_name", "workshop_location", "vendor_company_logo",
            "payment_method", "country", "city", "address", "address_2",
            "bank_account_number", "mpesa_number", "mpesa_type",
            "mpesa_till", "mpesa_paybill", "paypal_email",
            "tax_number", "website_url", "profile_picture",
            "social_media_links", "brand"
        ]

        # Count how many fields are filled
        filled = sum(bool(getattr(obj, f)) for f in fields if hasattr(obj, f))

        # Extra credit for logo/picture/brand details
        if obj.vendor_company_logo:
            filled += 1
        if obj.profile_picture:
            filled += 1
        if obj.brand and getattr(obj.brand, "name", None):
            filled += 1
        if obj.brand and getattr(obj.brand, "logo", None):
            filled += 1

        total = len(fields) + 4  # adding extra slots for images + brand details
        return int((filled / total) * 100) if total > 0 else 0 


 # adjustemnts if exchange or retun   
class VendorAdjustmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorAdjustment
        fields = '__all__'

class VendorPayoutSerializer(serializers.ModelSerializer):
    adjustments = VendorAdjustmentSerializer(many=True)
    vendor = VendorSerializer(read_only=True)
    adjustment_amount = serializers.SerializerMethodField()


    class Meta:
        model = VendorPayout
        fields = '__all__'

    def get_adjustment_amount(self, obj):
        try:
            return float(obj.adjustment_amount)
        except (ValueError, TypeError):
            return 0.0    

## converting and sending vendor rrelated items
class ItemSerializer(serializers.ModelSerializer):
    additional_images = ItemAdditionalImageSerializer(many=True, read_only=True)
    image = serializers.ImageField(use_url=True, allow_null=True)
    video = serializers.FileField(use_url=True, allow_null=True)

    class Meta:
        model = Item
        fields = '__all__'


    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            image_url = obj.image.url
            if image_url.startswith('/media/media/'):
                image_url = image_url.replace('/media/media/', '/media/')
            return request.build_absolute_uri(image_url)
        return None  





class AdminProfilePic(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['user', 'profile_picture', 'date_of_birth', 'location']


###***************Vendor's items**************###
class VendorPublicSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = '__all__'

    def get_items(self, obj):
        request = self.context.get('request')
        return ItemSerializer(
            Item.objects.filter(created_by=obj.user),
            many=True,
            context={'request': request}
        ).data

    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            return request.build_absolute_uri(obj.profile_picture.url)
        return None

 # items/serializers.py

class VendorItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        read_only_fields = ['likes', 'views', 'slug', 'image_hash', 'created_at', 'updated', 'created_by']
        # You can also use `fields = '__all__'` and override `created_by` in the view


        def update(self, instance, validated_data):
            # Update all fields except read-only ones
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            return instance
        
#vendor requestserializer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name']  # Add other fields as needed

class VendorRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = VendorRequest
        fields = '__all__'
        
        


  # Item serializer 
from rest_framework import serializers
import html
from .models import (
    Item, ColorVariant, SizeStock, AgeVariant,
    Department, Category, SubCategory, Section, ShippingDimension , Brand
)

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



class SizeStockSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = SizeStock
        fields = ['id', 'size', 'quantity_in_stock']


class ColorVariantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    sizes = SizeStockSerializer(many=True, required=False)
    image = serializers.ImageField(required=False, allow_null=True, use_url=True)

    class Meta:
        model = ColorVariant
        fields = ['id', 'color', 'image', 'sizes']

    def create(self, validated_data):
        sizes_data = validated_data.pop('sizes', [])
        item = self.context.get('item')
        variant = ColorVariant.objects.create(item=item, **validated_data)
        for size_data in sizes_data:
            SizeStock.objects.create(variant=variant, **size_data)
        return variant


class AgeVariantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = AgeVariant
        fields = ['id', 'age_group', 'quantity_in_stock']

# length and weigt serializers
class WeightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Weight
        fields = ["id", "value", "unit"]

class LengthSerializer(serializers.ModelSerializer):
    class Meta:
        model = Length
        fields = ["id", "value", "unit"] 

#offer serializer
class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = ["discount_percentage", "start_date", "end_date"]

class ShoeSerializer(serializers.ModelSerializer):
    shoe_type = serializers.CharField(required=False, allow_blank=True)
    shoe_gender = serializers.CharField(required=False, allow_blank=True)
    shoe_size = serializers.ListField(
        child=serializers.CharField(), required=False
    )

    class Meta:
        model = Shoe
        fields = ["shoe_type", "shoe_gender", "shoe_size"]

    def to_internal_value(self, data):
        # Convert single string -> list
        if isinstance(data.get("shoe_size"), str):
            data["shoe_size"] = [data["shoe_size"]]
        return super().to_internal_value(data)
               

# =========================
# ITEM
# =========================
class ItemSerializers(serializers.ModelSerializer):
    # 🔹 Nested serializers (read + write in one field)
    variants = ColorVariantSerializer(many=True, required=False)
    size_only_icon = SizeStockSerializer(many=True, required=False)
    kids_sizes = AgeVariantSerializer(many=True, required=False)
    shoe_input = ShoeSerializer(many=True, required=False)

    item_attribute = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100)

    section = serializers.SlugRelatedField(
        slug_field="name", queryset=Section.objects.all()
    )
    department = serializers.SlugRelatedField(
        slug_field="name", queryset=Department.objects.all()
    )
    category = serializers.SlugRelatedField(
        slug_field="name", queryset=Category.objects.all()
    )
    subcategory = serializers.SlugRelatedField(
        slug_field="name", queryset=SubCategory.objects.all()
    )


    additional_images = ItemAdditionalImageSerializer(many=True, read_only=True)

    # Shipping dimension
   
    shipping_dimension = ShippingDimensionSerializer(read_only=True)
    # Write-only raw dict for input
    shipping_dimension_data = serializers.JSONField(write_only=True, required=False)


    

    weight = WeightSerializer(required=False)
    length = LengthSerializer(required=False)

    # Main image and optional product video.
    image = serializers.ImageField(required=False, allow_null=True, allow_empty_file=True)
    video = serializers.FileField(required=False, allow_null=True, allow_empty_file=True)

    # ✅ NEW: nested offer support
    offer = OfferSerializer(required=False, allow_null=True)
    in_offer = serializers.BooleanField(required=False, default=False)

    # ✅ Coffee-specific
    roast_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    coffee_state = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    # ✅ Organic-specific
    manufactured_date = serializers.DateField(required=False, allow_null=True)
    expiry_date = serializers.DateField(required=False, allow_null=True)

   
    

    class Meta:
        model = Item
        fields = [
            "id", "section",
            "name", "description", "image", "video", "additional_images", "price", "discount_price", "in_stock",
            "available", "returnable", "department", "category", "subcategory",
            "item_attribute",
            # 🔹 Nested relations
            "variants", "size_only_icon", "kids_sizes", "shoe_input", "shipping_dimension_data", "shipping_dimension",
            # 🔹 Brand
            "brand", 
            # 🔹 Single-object fields
            "weight", "length",
            # 🔹 Extra
            "roast_type", "coffee_state",
            "manufactured_date", "expiry_date",
            "is_organic", "is_fresh_food",
            #offer
            "offer", "in_offer", 
        ]
    

    def to_internal_value(self, data):
        # Decode HTML entities before resolving category relationships.
        data = data.copy()
        for field_name in ("department", "category", "subcategory", "item_attribute"):
            if field_name in data and data[field_name]:
                data[field_name] = html.unescape(str(data[field_name])).strip()

        # Category and subcategory names are normally selected from the
        # canonical frontend lists. If a vendor supplies a new value, create
        # the corresponding relationship record so the Item still uses the
        # normal ForeignKey structure.
        department_name = data.get("department")
        category_name = data.get("category")
        subcategory_name = data.get("subcategory")

        if department_name and category_name:
            department = Department.objects.filter(name__iexact=department_name).first()
            if department:
                category = Category.objects.filter(name__iexact=category_name).first()
                if not category:
                    category = Category.objects.create(
                        name=category_name[:50],
                        department=department,
                    )
                elif category.department_id != department.id:
                    raise serializers.ValidationError({
                        "category": "This category belongs to a different department."
                    })
                data["category"] = category.name

                if subcategory_name:
                    subcategory = SubCategory.objects.filter(
                        name__iexact=subcategory_name,
                        category=category,
                    ).first()
                    if not subcategory:
                        subcategory = SubCategory.objects.create(
                            name=subcategory_name[:50],
                            category=category,
                        )
                    data["subcategory"] = subcategory.name

        return super().to_internal_value(data)
    

    def create(self, validated_data):
        variants_data = validated_data.pop("variants", [])
        size_only_data = validated_data.pop("size_only_icon", [])
        age_variants_data = validated_data.pop("kids_sizes", [])
        shoe_data = validated_data.pop("shoe_input", None)
        weight_data = validated_data.pop('weight', None)
        length_data = validated_data.pop('length', None)
        offer_data = validated_data.pop("offer", None)
        in_offer = validated_data.pop("in_offer", False)
        shipping_data = validated_data.pop("shipping_dimension_data", None)
        discount_price = validated_data.pop("discount_price", None)
        
        # ✅ Extract brand if passed

        # Assign section based on is_organic flag
        is_organic = validated_data.get('is_organic', False)

        section_name = 'organic' if is_organic else 'inorganic'
        section_obj, _ = Section.objects.get_or_create(name__iexact=section_name)

        validated_data['section'] = section_obj



        item = Item.objects.create( **validated_data)

        if discount_price is not None:
            item.discount_price = discount_price
            # Optional: mark in_offer if discount < price
            item.in_offer = discount_price < item.price
            item.save()

        if shipping_data:
            ShippingDimension.objects.create(item=item, **shipping_data)
         

        #offer create
        if in_offer and offer_data:
            offer = Offer.objects.create(item=item, **offer_data)
            item.discount_price = offer.final_price
            item.in_offer = True
            item.save()


        # ✅ Handle weight
        if weight_data:
            Weight.objects.create(item=item, **weight_data)

        # ✅ Handle length
        if length_data:
            Length.objects.create(item=item, **length_data)

        # ✅ Handle shoe
        # ✅ Handle shoe
        if shoe_data:
            for s in shoe_data:
                Shoe.objects.create(item=item, **s)



        for variant_data in variants_data:
            serializer = ColorVariantSerializer(data=variant_data, context={'item': item})
            serializer.is_valid(raise_exception=True)
            serializer.save()

        for size_data in size_only_data:
            SizeStock.objects.create(item=item, **size_data)

        for age_data in age_variants_data:
            AgeVariant.objects.create(item=item, **age_data)

        # ✅ Log creation activity
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        log_activity(
            user=user,
            actor_type='vendor' if hasattr(user, 'vendor') else 'admin' if user and user.is_staff else 'user',
            action='item_created',
            description=f"{'Vendor' if hasattr(user, 'vendor') else 'Admin'} '{user.username}' created item '{item.name}'"
        )

        return item

    def update(self, instance, validated_data):
        variants_data = validated_data.pop("variants", [])
        size_only_data = validated_data.pop("size_only_icon", [])
        age_variants_data = validated_data.pop("kids_sizes", [])
        shoe_data = validated_data.pop("shoe_input", None)
        weight_data = validated_data.pop("weight", None)
        length_data = validated_data.pop("length", None)
        offer_data = validated_data.pop("offer", None)
        in_offer = validated_data.pop("in_offer", instance.in_offer)
        shipping_data = validated_data.pop("shipping_dimension_data", None)
        discount_price = validated_data.pop("discount_price", instance.discount_price)


        # Assign section based on is_organic flag
        is_organic = validated_data.get('is_organic', instance.is_organic)

        section_name = 'organic' if is_organic else 'inorganic'
        section_obj = Section.objects.get(name__iexact=section_name)

        validated_data['section'] = section_obj


        # ✅ Update primitive fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.discount_price = discount_price
        instance.in_offer = discount_price is not None and discount_price < instance.price
        instance.save()




        # ✅ Shipping dimension
        if shipping_data:
            if instance.shipping_dimension:
                for attr, value in shipping_data.items():
                    setattr(instance.shipping_dimension, attr, value)
                instance.shipping_dimension.save()
            else:
                shipping = ShippingDimension.objects.create(item=instance, **shipping_data)
                instance.shipping_dimension = shipping
                instance.save()

        # ✅ Handle weight
        if weight_data:
            if hasattr(instance, "weight"):
                for attr, val in weight_data.items():
                    setattr(instance.weight, attr, val)
                instance.weight.save()
            else:
                Weight.objects.create(item=instance, **weight_data)

        # ✅ Handle length
        if length_data:
            if hasattr(instance, "length"):
                for attr, val in length_data.items():
                    setattr(instance.length, attr, val)
                instance.length.save()
            else:
                Length.objects.create(item=instance, **length_data)

        # ✅ Handle shoes (use correct related_name!)
        if shoe_data:
            existing_shoes = {s.id: s for s in instance.shoes.all()}  # assumes Shoe has related_name="shoes"
            for s in shoe_data:
                obj_id = s.get("id")
                if obj_id and obj_id in existing_shoes:
                    shoe_instance = existing_shoes[obj_id]
                    for attr, value in s.items():
                        setattr(shoe_instance, attr, value)
                    shoe_instance.save()
                else:
                    Shoe.objects.create(item=instance, **s)

        # ✅ Handle offers safely
        try:
            offer_instance = instance.offer
        except Offer.DoesNotExist:
            offer_instance = None

        # Handle offers
        if in_offer:
            if offer_data:
                if offer_instance:
                    for attr, value in offer_data.items():
                        setattr(offer_instance, attr, value)
                    offer_instance.save()
                else:
                    offer_instance = Offer.objects.create(item=instance, **offer_data)
            
            # If offer exists, its final_price sets discount
            if offer_instance:
                instance.discount_price = offer_instance.final_price
        else:
            # If no offer, keep payload discount_price
            instance.discount_price = discount_price if discount_price is not None else None


        # ✅ Handle nested lists (variants, size_only, kids_sizes)
        def update_nested(items_data, existing_qs, model, nested_field=None, parent_field=None):
            existing_ids = [obj.id for obj in existing_qs]
            new_ids = [item.get("id") for item in items_data if item.get("id")]

            # delete removed
            for old_id in existing_ids:
                if old_id not in new_ids:
                    model.objects.filter(id=old_id).delete()

            for item_data in items_data:
                nested_data = item_data.pop(nested_field, []) if nested_field else []
                obj_id = item_data.get("id")

                if obj_id:
                    obj = existing_qs.get(id=obj_id)
                    for attr, val in item_data.items():
                        # 🚫 prevent clearing image when payload has "image": null
                        if attr == "image" and val is None:
                            continue
                        setattr(obj, attr, val)
                    obj.save()

                    if nested_field and nested_data:
                        update_nested(
                            nested_data,
                            getattr(obj, nested_field).all(),
                            SizeStock,
                            parent_field="variant"
                        )
                else:
                    kwargs = {parent_field: instance} if parent_field else {"item": instance}
                    new_obj = model.objects.create(**item_data, **kwargs)
                    if nested_field and nested_data:
                        for nested_item in nested_data:
                            SizeStock.objects.create(variant=new_obj, **nested_item)

        update_nested(variants_data, instance.variants.all(), ColorVariant, "sizes", parent_field="item")
        update_nested(size_only_data, instance.size_only_icon.all(), SizeStock, parent_field="item")
        update_nested(age_variants_data, instance.kids_sizes.all(), AgeVariant, parent_field="item")

        instance.refresh_from_db()

        # ✅ Log update activity
        request = self.context.get("request")
        user = getattr(request, "user", None)
        log_activity(
            user=user,
            actor_type="vendor" if hasattr(user, "vendor") else "admin" if user and user.is_staff else "user",
            action="item_updated",
            description=f"{'Vendor' if hasattr(user, 'vendor') else 'Admin'} '{user.username}' updated item '{instance.name}'",
        )

        return instance








# fetch items for customer ui

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name']

class CategorySerializer(serializers.ModelSerializer):
    department = DepartmentSerializer()

    class Meta:
        model = Category
        fields = ['id', 'name', 'department']

class SubCategorySerializer(serializers.ModelSerializer):
    category = CategorySerializer()

    class Meta:
        model = SubCategory
        fields = ['id', 'name', 'category']

class ItemSerializer(serializers.ModelSerializer):
    department = serializers.StringRelatedField()
    category = serializers.StringRelatedField()
    subcategory = serializers.StringRelatedField()
    image = serializers.ImageField(use_url=True, allow_null=True)
    video = serializers.FileField(use_url=True, allow_null=True)
    additional_images = ItemAdditionalImageSerializer(many=True, read_only=True)
    final_price = serializers.SerializerMethodField()
    final_discounted_price = serializers.SerializerMethodField()
    save_upto = serializers.SerializerMethodField()
    variants = ColorVariantSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    vendor = VendorSerializer(read_only=True)  # ✅ include vendor
    offer = OfferSerializer(read_only=True) 

    class Meta:
        model = Item
        fields = [
            'id',
            'name',
            'description',
            'image',
            'video',
            'additional_images',
            'price',
            'discount_price',
            'in_stock',
            "offer",
            "in_offer",
            'available',
            'returnable',
            'department',
            'category',
            'subcategory',
            'item_attribute',
            'gender_based',
            'children_size_based_age',
            'is_organic',
            'weight',
            'manufactured_date',
            'expiry_date',
            'is_fresh_food',
            'slug',
            'likes',
            'views',
            'created_at',
            'updated',
            'final_price',
            'final_discounted_price',
            'save_upto',
            'variants',
            'average_rating',
            'reviews',
            'review_count',
            'vendor',   # ✅ now part of response
        ]

    def get_final_price(self, obj):
        return round(obj.get_item_final_price(), 2)

    def get_final_discounted_price(self, obj):
        return round(obj.get_item_final_discounted_price(), 2)

    def get_save_upto(self, obj):
        try:
            return round(obj.get_save_upto or 0, 2)
        except Exception as e:
            print("Error in get_save_upto:", e)
            return 0


    
    #function to get the reviews
    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if not reviews:
            return None
        return round(sum([review.rating for review in reviews]) / len(reviews), 2)
    
    # Function to calculate the review count
    def get_review_count(self, obj):
        
        return obj.reviews.count()





# ----------------------
# Vendor Serializer (ModelSerializer) ✅
# Handles nested Brand creation and updates
# ----------------------
class VendorForm(serializers.ModelSerializer):
    brand = BrandSerializer(required=False, allow_null=True)
    profile_completion = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            "surname_name", "middle_name", "first_name", "phone_number",
            "username", "email", "password", "id_number", "product_type",
            "is_food", "Are_You_KEBS_certified", "product_description",
            "company_name", "workshop_location", "payment_method",
            "country", "city", "address", "address_2",
            "bank_account_number", "mpesa_number", "mpesa_type",
            "mpesa_till", "mpesa_paybill", "paypal_email",
            "tax_number", "website_url", "social_media_links",
            "vendor_company_logo", "profile_picture", "brand",  
            "profile_completion",
        ]

    def get_profile_completion(self, obj):
        # Core text fields (exclude images/brand)
        fields = [
            "surname_name", "middle_name", "first_name", "phone_number",
            "username", "email", "password", "id_number", "product_type",
            "is_food", "Are_You_KEBS_certified", "product_description",
            "company_name", "workshop_location", "payment_method",
            "country", "city", "address", "address_2",
            "bank_account_number", "mpesa_number", "mpesa_type",
            "mpesa_till", "mpesa_paybill", "paypal_email",
            "tax_number", "website_url", "social_media_links",
        ]

        filled = sum(bool(getattr(obj, f)) for f in fields)

        # Images & brand are handled separately
        if obj.vendor_company_logo:
            filled += 1
        if obj.profile_picture:
            filled += 1
        if obj.brand and obj.brand.name:
            filled += 1
        if obj.brand and obj.brand.logo:
            filled += 1

        total = len(fields) + 4  # 4 special fields
        return int((filled / total) * 100)

    def create(self, validated_data):
        brand_data = validated_data.pop("brand", None)
        vendor = Vendor.objects.create(**validated_data)

        if brand_data:
            brand = Brand.objects.create(**brand_data)
            vendor.brand = brand
            vendor.save()

        return vendor

    def update(self, instance, validated_data):
        brand_data = validated_data.pop("brand", None)

        # Update Vendor fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create Brand
        if brand_data:
            if instance.brand:
                for attr, value in brand_data.items():
                    setattr(instance.brand, attr, value)
                instance.brand.save()
            else:
                brand = Brand.objects.create(**brand_data)
                instance.brand = brand
                instance.save()

        return instance





User = get_user_model()

# ----------------------
# Item Serializer
# ----------------------
class VendorItemSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=255)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    image = serializers.ImageField(required=False)


# ----------------------
# Vendor Form Data Serializer
# ----------------------
class VendorFormSerializer(serializers.Serializer):
    surname_name = serializers.CharField(max_length=100)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=15)
    username = serializers.CharField(max_length=16)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    id_number = serializers.CharField(max_length=12)
    product_type = serializers.ChoiceField(choices=["organic", "inorganic", "both"])
    is_food = serializers.ChoiceField(choices=["yes", "no"], required=False)
    Are_You_KEBS_certified = serializers.ChoiceField(choices=["yes", "no"], required=False)
    product_description = serializers.CharField(max_length=255)
    company_name = serializers.CharField(max_length=255)
    workshop_location = serializers.CharField(max_length=255)
    vendor_company_logo = serializers.ImageField(required=False, allow_null=True)
    payment_method = serializers.ChoiceField(choices=["BANK_TRANSFER", "MOBILE_MONEY", "PAYPAL"])
    

     # Address Fields ✅
    country = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=100)
    address = serializers.CharField(max_length=255)
    address_2 = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # Conditional payment fields
    bank_account_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    mpesa_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    mpesa_type = serializers.ChoiceField(choices=["PHONE", "TILL", "LIPA_NA_MPESA"], required=False, allow_blank=True)
    mpesa_till = serializers.CharField(max_length=15, required=False, allow_blank=True)
    mpesa_paybill = serializers.CharField(max_length=15, required=False, allow_blank=True)
    paypal_email = serializers.EmailField(required=False, allow_blank=True)

    tax_number = serializers.CharField(max_length=15, required=False, allow_blank=True)
    website_url = serializers.URLField(required=False, allow_blank=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    social_media_links = serializers.JSONField(required=False)

    # brand
    brand = BrandSerializer(required=False)
    

    def validate(self, data):
        product_type = data.get("product_type")

        if product_type in ["organic", "both"]:
            if not data.get("is_food"):
                raise serializers.ValidationError({
                    "is_food": "This field is required for organic or both product types."
                })
            if not data.get("Are_You_KEBS_certified"):
                raise serializers.ValidationError({
                    "Are_You_KEBS_certified": "This field is required for organic or both product types."
                })

        # if not data.get("item_pdf") and not data.get("item_list"):
        #     raise serializers.ValidationError({
        #         "item_list": "You must provide either an item list or a PDF."
        #     })

        payment_method = data.get('payment_method')

        if payment_method == "BANK_TRANSFER":
            required_fields = ["bank_account_number", "bank_account_name", "bank_name", "bank_branch"]
            for field in required_fields:
                if not data.get(field):
                    raise serializers.ValidationError({
                        field: f"{field.replace('_', ' ').capitalize()} is required for Bank Transfer."
                    })
                
        elif payment_method == "MOBILE_MONEY":
            mpesa_type = data.get('mpesa_type')
            if not mpesa_type:
                raise serializers.ValidationError({
                    "mpesa_type": "M-Pesa type is required for Mobile Money."
                })

            if mpesa_type == "PHONE" and not data.get('mpesa_number'):
                raise serializers.ValidationError({
                    "mpesa_number": "M-Pesa phone number is required."
                })

            if mpesa_type == "TILL" and not data.get('mpesa_till'):
                raise serializers.ValidationError({
                    "mpesa_till": "M-Pesa till number is required."
                })

            if mpesa_type == "LIPA_NA_MPESA" and not data.get('mpesa_paybill'):
                raise serializers.ValidationError({
                    "mpesa_paybill": "M-Pesa paybill number is required."
                })

        elif payment_method == "PAYPAL":
            if not data.get("paypal_email"):
                raise serializers.ValidationError({
                    "paypal_email": "PayPal email is required for PayPal payment."
                })
            

        return data


# ----------------------
# Vendor Request Main Serializer
# ----------------------
from decimal import Decimal
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils.text import get_valid_filename

def convert_decimal(obj):
    if isinstance(obj, list):
        return [convert_decimal(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return float(obj)
    return obj



ALLOWED_TAGS = ['p', 'b', 'i', 'u', 'em', 'strong', 'a']
ALLOWED_ATTRIBUTES = {'a': ['href', 'title']}


class VendorRequestSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    vendor_data = serializers.JSONField()
    item_list = serializers.JSONField(required=False)
    item_pdf = serializers.FileField(required=False, allow_null=True)
    brand = serializers.DictField(required=False, write_only=True)

    class Meta:
        model = VendorRequest
        fields = [
            "id",
            "user",
            "vendor_data",
            "brand",
            "brand_object",
            "item_list",
            "item_pdf",
            "status",
            "seen"
        ]

    def sanitize_text(self, value):
        if isinstance(value, str):
            return bleach.clean(value.strip(), tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES)
        return value

    def sanitize_dict(self, data):
        if isinstance(data, dict):
            return {k: self.sanitize_dict(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self.sanitize_dict(v) for v in data]
        elif isinstance(data, str):
            return self.sanitize_text(data)
        return data

    def validate(self, data):
        item_list = data.get("item_list")
        item_pdf = data.get("item_pdf")
        if not item_list and not item_pdf:
            raise serializers.ValidationError({
                "non_field_errors": ["Either item list or item PDF must be provided."]
            })

        data["vendor_data"] = self.sanitize_dict(data.get("vendor_data", {}))

        brand = data.get("brand")
        if brand and not brand.get("name"):
            raise serializers.ValidationError({
                "brand": ["Brand name is required if brand data is provided."]
            })

        return data

    def create(self, validated_data):
        request = self.context.get("request")
        if not request:
            raise serializers.ValidationError("Request object missing in serializer context.")
        user = request.user

        vendor_data = validated_data.pop("vendor_data", {})
        item_list = validated_data.pop("item_list", [])
        item_pdf = validated_data.pop("item_pdf", None)
        brand_data = validated_data.pop("brand", None)

        # ✅ Process item images
        processed_items = []
        for i, item in enumerate(item_list):
            item = self.sanitize_dict(item.copy())
            image_file = request.FILES.get(f"item_images[{i}]")
            if image_file:
                filename = get_valid_filename(image_file.name)
                path = default_storage.save(f"items/{filename}", ContentFile(image_file.read()))
                item["image"] = default_storage.url(path)
            processed_items.append(item)

        # 🟡 Handle brand data (NO database save)
        if brand_data:
            brand_data = self.sanitize_dict(brand_data)

            logo_file = (
                request.FILES.get("brand_logo") or
                request.FILES.get("vendor_company_logo")
            )
            if logo_file:
                filename = get_valid_filename(logo_file.name)
                path = default_storage.save(f"brands/{filename}", ContentFile(logo_file.read()))
                brand_data["logo"] = default_storage.url(path)

            # ✅ just attach the brand data to vendor_data without creating Brand object
            vendor_data["brand"] = brand_data

        vendor_data = convert_decimal(self.sanitize_dict(vendor_data))
        processed_items = convert_decimal(processed_items)

        vendor_request = VendorRequest.objects.create(
            user=user,
            vendor_data=vendor_data,
            item_list=processed_items,
            item_pdf=item_pdf,
            status="pending"
        )
        vendor_request.generate_otp()
        return vendor_request


    def to_representation(self, instance):
        data = super().to_representation(instance)
        vendor_data = instance.vendor_data or {}

        # Directly return stored brand data
        brand_data = vendor_data.get("brand", None)
        data["brand_object"] = brand_data

        data["item_list"] = instance.item_list or []
        return data





  
#unseened


class UnseenVendorCountView(APIView):
    def get(self, request):
        # Current count of verified but unseen vendor requests
        unseen_count = VendorRequest.objects.filter(status='verified', seen=False).count()

        # Total number of verified vendor requests
        total_verified = VendorRequest.objects.filter(status='verified').count()

        # Number of verified vendor requests that have been approved
        approved_count = VendorRequest.objects.filter(status='approved').count()

        # Progress: approved out of verified
        progress = approved_count / total_verified if total_verified else 0

        # Compare to previous week
        one_week_ago = timezone.now() - timedelta(days=7)
        unseen_last_week = VendorRequest.objects.filter(
            status='verified',
            seen=False,
            date_submitted__lt=one_week_ago
        ).count()

        # Calculate increase %
        if unseen_last_week == 0:
            increase_percent = 100 if unseen_count > 0 else 0
        else:
            increase_percent = ((unseen_count - unseen_last_week) / unseen_last_week) * 100

        return Response({
            "unseen_count": unseen_count,
            "progress": round(progress, 2),          # e.g., 0.65 = 65%
            "increase": f"{increase_percent:+.0f}%"  # e.g., "+25%" or "-10%"
        }, status=status.HTTP_200_OK)



# mark as seen 
class MarkVendorSeenView(APIView):
    def post(self, request, user_id):
        vendor = get_object_or_404(VendorRequest, user__id=user_id)
        vendor.seen = True
        vendor.save()
        return Response({"message": "Vendor marked as seen."}, status=status.HTTP_200_OK)

    
