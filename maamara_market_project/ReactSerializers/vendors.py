# items/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets, generics
from .Serializers import VendorItemSerializer
# views.py
from rest_framework.generics import RetrieveUpdateAPIView
from .models import Item
from .Serializers import *
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import *
from rest_framework.permissions import IsAuthenticated
from core.models import *
from django.core.mail import send_mail
import random
from datetime import timezone as dt_timezone ,datetime
from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view
from rest_framework.decorators import action, api_view,permission_classes
from vendorDashboard.models import *
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import parser_classes
from rest_framework.permissions import IsAdminUser, AllowAny, IsAuthenticated
from decimal import Decimal
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from .Serializers import *
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import Item, ColorVariant, SizeStock, AgeVariant
from .Serializers import ItemSerializers
from rest_framework.permissions import IsAuthenticated
import json
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import bleach



# Reusable sanitizer
def sanitize(value):
    if isinstance(value, str):
        return bleach.clean(value)
    return value


class VendorItemCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = VendorItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# item update
from rest_framework.permissions import BasePermission

class IsVendor(BasePermission):
    """
    Allows access only to users who have a related Vendor profile.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and hasattr(request.user, 'vendor')



#fetch vendor profile
# -------------------------------
# Vendor Profile
# -------------------------------
class VendorProfileView(generics.RetrieveAPIView):
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return Vendor.objects.get(user=self.request.user)

# -------------------------------
# Vendor Item
# -------------------------------
class VendorItemViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = ItemSerializers
    permission_classes = [IsAuthenticated, IsVendor]

    def get_queryset(self):
        print("Fetching items for vendor (user):", self.request.user)
        return Item.objects.filter(created_by=self.request.user)

    def get_serializer(self, *args, **kwargs):
        data = kwargs.get("data")
        if data and isinstance(data, dict):
            decoded = {}
            for key, value in data.items():
                if key in [
                    "variants",
                    "size_only_icon",
                    "kids_sizes",
                    "colors",
                    "sizes",
                    "weight",
                    "length",
                    "shoe_input",
                    "shipping_dimension_data",
                    "offer",
                ] and isinstance(value, str):
                    try:
                        decoded[key] = json.loads(value)
                        print(f"✅ Decoded {key}:", decoded[key])
                    except json.JSONDecodeError:
                        print(f"⚠️ Failed to decode {key}")
                        decoded[key] = []
                else:
                    decoded[key] = sanitize(value)
            kwargs["data"] = decoded
        return super().get_serializer(*args, **kwargs)

    # -------------------------------
    # Helpers
    # -------------------------------
    def _handle_dimension(self, item, model, data, field_name):
        if not data:
            return
        related_obj = getattr(item, field_name, None)
        if related_obj:
            for attr, val in data.items():
                setattr(related_obj, attr, sanitize(val))
            related_obj.save()
            print(f"✅ Updated {field_name}:", related_obj)
        else:
            new_obj = model.objects.create(item=item, **{k: sanitize(v) for k, v in data.items()})
            print(f"✅ Created new {field_name}:", new_obj)

    def _handle_shoe(self, item, data):
        if not data:
            return
        if isinstance(data, dict):
            data = [data]

        existing_shoes = {s.id: s for s in item.shoe_input.all()}
        new_ids = [s.get("id") for s in data if s.get("id")]

        # Delete removed
        for shoe_id in list(existing_shoes.keys()):
            if shoe_id not in new_ids:
                existing_shoes[shoe_id].delete()
                print(f"🗑️ Deleted shoe ID: {shoe_id}")

        # Update or create
        for s in data:
            obj_id = s.get("id")
            sanitized_s = {k: sanitize(v) for k, v in s.items()}
            if obj_id and obj_id in existing_shoes:
                shoe_instance = existing_shoes[obj_id]
                for attr, val in sanitized_s.items():
                    setattr(shoe_instance, attr, val)
                shoe_instance.save()
                print("✅ Updated shoe:", shoe_instance)
            else:
                new_shoe = Shoe.objects.create(item=item, **sanitized_s)
                print("✅ Created new shoe:", new_shoe)

                

    def _update_nested(self, items_data, existing_qs, model, parent_field, nested_field=None):
        print("🔄 Updating nested data for model:", model.__name__)
        existing_ids = [obj.id for obj in existing_qs]
        new_ids = [item.get("id") for item in items_data if item.get("id")]

        # Delete removed
        for old_id in existing_ids:
            if old_id not in new_ids:
                model.objects.filter(id=old_id).delete()
                print(f"🗑️ Deleted old {model.__name__} with ID:", old_id)

        # Update or create
        for idx, item_data in enumerate(items_data):
            nested_data = item_data.pop(nested_field, []) if nested_field else []
            obj_id = item_data.get("id")
            sanitized_data = {k: sanitize(v) for k, v in item_data.items()}

            # 🔥 handle variant image upload (only for ColorVariant)
            if model.__name__ == "ColorVariant":
                image_file = (
                    self.request.FILES.get(f"variants[{idx}][image]") or
                    self.request.FILES.get(f"variant_image_{idx}")
                )
                if image_file:
                    sanitized_data["image"] = image_file

            if obj_id:
                obj = existing_qs.get(id=obj_id)
                for attr, val in sanitized_data.items():
                    setattr(obj, attr, val)
                obj.save()
                print(f"✅ Updated {model.__name__} with ID:", obj_id)

                if nested_field and nested_data:
                    self._update_nested(
                        nested_data,
                        getattr(obj, nested_field).all(),
                        SizeStock,
                        parent_field="variant",
                    )
            else:
                new_obj = model.objects.create(**{parent_field: self._current_item}, **sanitized_data)
                print(f"✅ Created new {model.__name__}:", new_obj)
                if nested_field and nested_data:
                    for nested_item in nested_data:
                        SizeStock.objects.create(
                            variant=new_obj,
                            **{k: sanitize(v) for k, v in nested_item.items()}
                        )
                        print("✅ Created nested SizeStock:", nested_item)

    # -------------------------------
    # Create / Update
    # -------------------------------
    @transaction.atomic
    def perform_create(self, serializer):
        print("Creating new item for user:", self.request.user)
        validated = serializer.validated_data

        variants_data = validated.pop("variants", [])
        size_only_data = validated.pop("size_only_icon", [])
        kids_sizes_data = validated.pop("kids_sizes", [])
        weight_data = validated.pop("weight", None)
        length_data = validated.pop("length", None)
        shoe_data = validated.pop("shoe_input", None)
        shipping_dimension_data = validated.pop("shipping_dimension_data", None)
        offer_data = validated.pop("offer", None) 


        item = serializer.save(created_by=self.request.user)
        self._current_item = item
        print("Created item:", item)

        self._handle_shoe(item, shoe_data)
        self._handle_dimension(item, Weight, weight_data, "weight")
        self._handle_dimension(item, Length, length_data, "length")
        self._handle_dimension(item, ShippingDimension, shipping_dimension_data, "shipping_dimension")

        # Handle offer creation
        if offer_data:
            # Adjust this depending on your Offer model and relation
            # Example assumes an Offer model with FK to item:
            Offer.objects.create(item=item, **{k: sanitize(v) for k, v in offer_data.items()})
            print("✅ Created offer:", offer_data)

        for i, variant_data in enumerate(variants_data):
            sizes_data = variant_data.pop("sizes", [])

            variant_image = (
                self.request.FILES.get(f"variants[{i}][image]") or
                self.request.FILES.get(f"variant_image_{i}")
            )
            if variant_image:
                variant_data["image"] = variant_image


        for i, variant_data in enumerate(variants_data):
            sizes_data = variant_data.pop("sizes", [])

            variant_image = (
                self.request.FILES.get(f"variants[{i}][image]") or
                self.request.FILES.get(f"variant_image_{i}")
            )
            if variant_image:
                variant_data["image"] = variant_image

            variant_data = {k: sanitize(v) for k, v in variant_data.items()}
            variant = ColorVariant.objects.create(item=item, **variant_data)
            print("Created color variant:", variant)

            for size_data in sizes_data:
                SizeStock.objects.create(variant=variant, **{k: sanitize(v) for k, v in size_data.items()})
                print(f"Created size stock for variant {variant.id}:", size_data)

        for size_data in size_only_data:
            SizeStock.objects.create(item=item, **{k: sanitize(v) for k, v in size_data.items()})
            print("Created size-only stock:", size_data)

        for kids_data in kids_sizes_data:
            AgeVariant.objects.create(item=item, **{k: sanitize(v) for k, v in kids_data.items()})
            print("Created kids size variant:", kids_data)

    @transaction.atomic
    def perform_update(self, serializer):
        print("Updating item for user:", self.request.user)
        validated = serializer.validated_data

        variants_data = validated.pop("variants", [])
        size_only_data = validated.pop("size_only_icon", [])
        kids_sizes_data = validated.pop("kids_sizes", [])
        weight_data = validated.pop("weight", None)
        length_data = validated.pop("length", None)
        shoe_data = validated.pop("shoe_input", None)
        shipping_dimension_data = validated.pop("shipping_dimension_data", None)
        offer_data = validated.pop("offer", None) 
        print("Offer data in validated:", offer_data)

        item = serializer.save()
        self._current_item = item
        print("Updated item:", item)

        self._handle_shoe(item, shoe_data)
        self._handle_dimension(item, Weight, weight_data, "weight")
        self._handle_dimension(item, Length, length_data, "length")
        self._handle_dimension(item, ShippingDimension, shipping_dimension_data, "shipping_dimension")

         # Handle offer update or create
        if offer_data:
            offer_obj = getattr(item, 'offer', None)
            if offer_obj:
                for key, val in offer_data.items():
                    setattr(offer_obj, key, sanitize(val))
                offer_obj.save()
                print(f"✅ Updated offer: {offer_obj}")
            else:
                Offer.objects.create(item=item, **{k: sanitize(v) for k, v in offer_data.items()})
                print("✅ Created new offer:", offer_data)


        # ✅ now also handles variant images
        self._update_nested(
            variants_data,
            item.variants.all(),
            ColorVariant,
            parent_field="item",
            nested_field="sizes"
        )
        self._update_nested(
            size_only_data,
            item.size_only_icon.all(),
            SizeStock,
            parent_field="item"
        )
        self._update_nested(
            kids_sizes_data,
            item.kids_sizes.all(),
            AgeVariant,
            parent_field="item"
        )









######********************VENDOR APPLICATION FORM *******************######
# ✅ Utility to convert Decimal to float for JSON serializability
def convert_decimal(obj):
    if isinstance(obj, list):
        return [convert_decimal(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return float(obj)
    return obj


@parser_classes([MultiPartParser, FormParser, JSONParser])
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_vendor_request(request):
    user = request.user
    decoded = {}

    # ✅ Parse vendor_data JSON
    vendor_data_raw = request.data.get('vendor_data')
    if not vendor_data_raw:
        return Response({"vendor_data": ["This field is required."]}, status=400)

    try:
        vendor_data = json.loads(vendor_data_raw)
        vendor_data = convert_decimal(vendor_data)
        vendor_data = {k: sanitize(v) for k, v in vendor_data.items()}
    except json.JSONDecodeError:
        return Response({"vendor_data": ["Invalid JSON format."]}, status=400)

    # ✅ Handle vendor_company_logo
    if request.FILES.get('vendor_company_logo'):
        logo_file = request.FILES['vendor_company_logo']
        path = default_storage.save(f"vendor_logos/{logo_file.name}", ContentFile(logo_file.read()))
        vendor_data['vendor_company_logo'] = default_storage.url(path)

    # ✅ Handle profile_picture
    if request.FILES.get('profile_picture'):
        profile_file = request.FILES['profile_picture']
        path = default_storage.save(f"vendor_profiles/{profile_file.name}", ContentFile(profile_file.read()))
        vendor_data['profile_picture'] = default_storage.url(path)

    decoded['vendor_data'] = vendor_data

    # ✅ Parse item_list JSON
    item_list_raw = request.data.get('item_list')
    if item_list_raw:
        try:
            item_list = json.loads(item_list_raw)
            item_list = convert_decimal(item_list)
            for item in item_list:
                for k, v in item.items():
                    item[k] = sanitize(v)
            decoded['item_list'] = item_list
        except json.JSONDecodeError:
            return Response({"item_list": ["Invalid JSON format."]}, status=400)

    # ✅ Handle PDF
    decoded['item_pdf'] = request.FILES.get('item_pdf')

    # ✅ Handle item images
    item_images = {}
    for key, file in request.FILES.items():
        if key.startswith("item_images["):
            item_images[key] = file
    if item_images:
        decoded['item_images'] = item_images

    # ✅ Pass to serializer
    serializer = VendorRequestSerializer(data=decoded, context={"request": request})
    if serializer.is_valid():
        vendor_request = serializer.save(user=user)
        vendor_request.generate_otp()
        return Response({'message': 'Request submitted. OTP sent to email.'}, status=201)

    return Response(serializer.errors, status=400)


#verify vendor registration otp
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_otp_vendor(request):
    user = request.user
    otp_input = request.data.get('otp')

    try:
        vendor_request = VendorRequest.objects.get(user=user, status='pending')
    except VendorRequest.DoesNotExist:
        return Response({'error': 'No pending vendor request found'}, status=404)

    valid, message = vendor_request.verify_otp(otp_input)
    if valid:
        return Response({'message': message})
    else:
        return Response({'error': message}, status=400)
    

# resend otp for vendor
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resend_vendor_otp(request):
    """
    Resend vendor OTP if expired or not set.
    """
    email = request.data.get('email')
    if not email:
        return Response({"success": False, "message": "Email is required."}, status=400)

    # Find vendor request
    vendor_request = VendorRequest.objects.filter(user__email=email).order_by('-date_submitted').first()
    if not vendor_request:
        return Response({"success": False, "message": "No vendor request found for this email."}, status=404)

    # Resend OTP logic (handled in model)
    success, message = vendor_request.resend_otp()

    if success:
        return Response({"success": True, "message": "OTP resent successfully."}, status=200)
    else:
        return Response({"success": False, "message": message}, status=400)



# update vendor requests
@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_vendor_request_items(request, vendor_request_id):
    try:
        vendor_request = VendorRequest.objects.get(id=vendor_request_id)
    except VendorRequest.DoesNotExist:
        return Response({'error': 'Vendor request not found.'}, status=404)

    # Get the updated item(s) from request data
    new_items = request.data.get('item_list')
    if not new_items or not isinstance(new_items, list) or len(new_items) == 0:
        return Response({'error': 'No item data provided or invalid format.'}, status=400)

    updated_item = new_items[0]
    item_name = updated_item.get('name')

    if not item_name:
        return Response({'error': 'Updated item must have a "name".'}, status=400)

    # Get existing item_list (which is a list, not dict)
    current_items = vendor_request.item_list or []

    # Replace the matching item by name
    updated = False
    new_item_list = []
    for item in current_items:
        if item.get('name') == item_name:
            new_item_list.append(updated_item)
            updated = True
        else:
            new_item_list.append(item)

    if not updated:
        return Response({'error': f'Item with name "{item_name}" not found in item_list.'}, status=404)

    # Save updated item_list directly (since it's a field)
    vendor_request.item_list = new_item_list
    vendor_request.save()

    # Return the updated item_list (without wrapper if you want)
    return Response(new_item_list)


# upadate vendo info
@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_vendor_info(request, vendor_request_id):
    try:
        vendor_request = VendorRequest.objects.get(id=vendor_request_id)
    except VendorRequest.DoesNotExist:
        return Response({'error': 'Vendor request not found.'}, status=404)

    updated_vendor_data = request.data.get('vendor_data')
    if not updated_vendor_data or not isinstance(updated_vendor_data, dict):
        return Response({'error': 'Invalid vendor_data format. Must be a JSON object.'}, status=400)

    # Sanitize updated_vendor_data
    def sanitize(value):
        if isinstance(value, str):
            return bleach.clean(value)
        return value

    updated_vendor_data = {k: sanitize(v) for k, v in updated_vendor_data.items()}

    # Update the existing vendor_data dict
    vendor_data = vendor_request.vendor_data or {}
    vendor_data.update(updated_vendor_data)

    vendor_request.vendor_data = vendor_data
    vendor_request.save()

    return Response({
        'message': 'Vendor information updated successfully.',
        'vendor_data': vendor_data
    })




#approve vendor

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@permission_classes([IsAdminUser])

def list_verified_vendor_requests(request):
    status = request.query_params.get('status')
    if status:
        requests = VendorRequest.objects.filter(status=status)
    else:
        requests = VendorRequest.objects.all()
    log_activity(
        user=request.user,
        actor_type='admin',
        action='viewed_vendor_requests',
        description=f"Admin '{request.user.username}' viewed vendor requests (status='{status}' if status else 'all')"
    )    
    serializer = VendorRequestSerializer(requests, many=True)
    return Response(serializer.data)


import traceback

from django.core.files import File
from django.core.files.base import ContentFile
from django.conf import settings
import os, requests

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def approve_vendor(request, vendor_request_id):
    print("🚀 Vendor approval endpoint hit with ID:", vendor_request_id)

    # 🧭 Fetch the vendor request
    try:
        vendor_request = VendorRequest.objects.get(id=vendor_request_id)
    except VendorRequest.DoesNotExist:
        return Response({'error': 'Vendor request not found.'}, status=404)

    if vendor_request.status != 'verified':
        return Response({'error': 'Vendor is not verified yet.'}, status=400)

    user = vendor_request.user
    vendor_data = vendor_request.vendor_data or {}

  
    # ✅ BRAND HANDLING
    from urllib.parse import urlparse, unquote

    brand_instance = None
    brand_data = vendor_data.pop("brand", None)
    vendor_logo_path = vendor_data.get("vendor_company_logo")
    decoded_path = unquote(vendor_logo_path) if vendor_logo_path else None

    print("📥 Incoming brand data:", brand_data)
    print("📸 Incoming vendor logo path:", vendor_logo_path)
    print("🗂 FILES:", request.FILES)

    if brand_data:
        name = sanitize(brand_data.get("name", "")).strip()
        description = sanitize(brand_data.get("description", ""))

        if not name:
            print("⚠️ Brand name is empty, skipping brand creation")
        else:
            brand_instance, created = Brand.objects.get_or_create(
                name=name,
                defaults={"description": description}
            )

             # Save the raw brand JSON data to vendor_request.brand_data here:
            vendor_request.brand_object = brand_data
            vendor_request.save(update_fields=["brand_object"])
            print("Brand instance used for items:", brand_instance)


            if description and brand_instance.description != description:
                brand_instance.description = description
                brand_instance.save(update_fields=["description"])

            logo_file = request.FILES.get("vendor_company_logo") or request.FILES.get("brand_logo")
            if logo_file:
                print(f"✅ Saving uploaded logo file: {logo_file.name}")
                brand_instance.logo.save(logo_file.name, logo_file, save=True)

            elif decoded_path and (not brand_instance.logo or not brand_instance.logo.name):
                try:
                    parsed_url = urlparse(decoded_path)

                    if decoded_path.startswith("/media"):
                        relative_path = decoded_path.replace("/media/", "", 1)
                        file_path = os.path.join(settings.MEDIA_ROOT, relative_path)

                        if os.path.exists(file_path):
                            print(f"✅ Found local logo file: {file_path}")
                            with open(file_path, "rb") as f:
                                brand_instance.logo.save(os.path.basename(file_path), File(f), save=True)
                        else:
                            print(f"⚠️ Local logo file not found: {file_path}")

                    elif parsed_url.scheme in ["http", "https"]:
                        print(f"🌐 Downloading logo from URL: {decoded_path}")
                        response = requests.get(decoded_path, timeout=10)
                        if response.status_code == 200:
                            filename = os.path.basename(parsed_url.path)
                            brand_instance.logo.save(filename, ContentFile(response.content), save=True)
                            print("✅ Logo downloaded and saved")
                        else:
                            print(f"⚠️ Failed to download logo (status {response.status_code})")

                    else:
                        print(f"⚠️ Unsupported logo path format: {decoded_path}")

                except Exception as e:
                    print(f"❌ Error attaching vendor_company_logo: {e}")

            print(f"🏁 Brand {'created' if created else 'updated'}: {brand_instance.name}")





    # 🧹 Clean vendor data
    for field in [ 'social_media_links', 'item_list', 'item_pdf']:
        vendor_data.pop(field, None)

    for field in ['profile_picture', 'vendor_company_logo']:
        if vendor_data.get(field):
            vendor_data[field] = vendor_data[field].lstrip('/').removeprefix('media/')

    vendor_data = {k: sanitize(v) for k, v in vendor_data.items()}

    # 🧪 Check item list
    item_list = vendor_request.item_list or []
    print("📦 Item list from request:", item_list)

    if not item_list:
        return Response({'error': 'No item data provided or invalid format.'}, status=400)

    # 🏪 Create Vendor
    vendor = Vendor.objects.create(user=user, brand=brand_instance, **vendor_data)

    created_items = []

    for item in item_list:
        try:
            # Normalize keys
            normalized_item = {k.lower(): v for k, v in item.items()}

            # SECTION / DEPARTMENT / CATEGORY
            section_name = sanitize(item.get('section')) if item.get('section') else None
            section = Section.objects.get_or_create(name=section_name)[0] if section_name else None

            department_name = sanitize(item.get('department')) if item.get('department') else None
            department = None
            if department_name:
                department, _ = Department.objects.get_or_create(name=department_name, defaults={'section': section})

            category_name = sanitize(item.get('category')) if item.get('category') else None
            category = None
            if category_name:
                category, _ = Category.objects.get_or_create(name=category_name, defaults={'department': department})

            subcategory_name = sanitize(item.get('subcategory')) if item.get('subcategory') else None
            subcategory = None
            if subcategory_name:
                subcategory, _ = SubCategory.objects.get_or_create(name=subcategory_name, defaults={'category': category})

            # BRAND per item (optional)
            brand = None
            brand_name = sanitize(item.get('brand')) if item.get('brand') else None
            if brand_name:
                brand, _ = Brand.objects.get_or_create(name=brand_name)
            else:
                brand = brand_instance  # 👈 fallback to vendor brand

            # IMAGE
            raw_path = item.get('image')
            relative_path = raw_path.lstrip('/').removeprefix('media/') if raw_path else None

            # NAME
            name = sanitize(item.get('name') or "")
            if not name:
                print(f"⚠️ Skipping item with no name: {item}")
                continue

            slug = slugify(name) + "-" + str(user.id)
            image_hash = hashlib.sha256(slug.encode('utf-8')).hexdigest()

            # ✅ Create item
            created_item = Item.objects.create(
                name=name,
                section=section,
                description=sanitize(normalized_item.get('description') or ""),
                price=item.get('price', 0) or 0,
                discount_price=item.get('discount_price', 0) or 0,
                in_stock=item.get('in_stock', 0) or 0,
                available=item.get('available', True),
                returnable=item.get('returnable', True),
                department=department,
                category=category,
                subcategory=subcategory,
                brand=brand,
                item_attribute=sanitize(item.get('item_attribute') or ""),
                gender_based=sanitize(item.get('shoe_gender', 'none')),
                children_size_based_age=sanitize(item.get('kids_sizes', 'none')),
                is_organic=item.get('is_organic', False),
                manufactured_date=item.get('manufactured_date'),
                expiry_date=item.get('expiry_date'),
                is_fresh_food=item.get('is_fresh_food', False),
                created_by=user,
                vendor=vendor,
                slug=slug,
                image_hash=image_hash,
                image=relative_path,
                percentage_discount=item.get('percentage_discount', 0)

            )

            shipping_data = item.get("shipping_dimension", {})
            if shipping_data:
                ShippingDimension.objects.create(
                    item=created_item,
                    length=shipping_data.get("length", 0),
                    width=shipping_data.get("width", 0),
                    height=shipping_data.get("height", 0),
                    weight=shipping_data.get("weight", 0),
                    unit=shipping_data.get("unit", "cm"),
                    weight_unit=shipping_data.get("weight_unit", "kg")
                )



            # ✅ Color variants
            for cv in item.get('color_variants', []):
                color = sanitize(cv.get('color'))
                if color:
                    ColorVariant.objects.create(item=created_item, color=color)

            # ✅ Size variants
            for sz in item.get('size_stock', []):
                size = sanitize(sz.get('size'))
                quantity = sz.get('quantity_in_stock', 0)
                if size:
                    SizeStock.objects.create(item=created_item, size=size, quantity_in_stock=quantity)

            # ✅ Age variants
            for av in item.get('age_variants', []):
                age_group = sanitize(av.get('age_group'))
                quantity = av.get('quantity_in_stock', 0)
                if age_group:
                    AgeVariant.objects.create(item=created_item, age_group=age_group, quantity_in_stock=quantity)

            # ✅ Optional weight & length
            if item.get('weight'):
                try:
                    Weight.objects.create(
                        item=created_item,
                        value=item['weight']['value'],
                        unit=sanitize(item['weight'].get('unit', 'kg'))
                    )
                except Exception as e:
                    print(f"⚠️ Error saving weight for {created_item.name}: {e}")

            if item.get('length'):
                try:
                    Length.objects.create(
                        item=created_item,
                        value=item['length']['value'],
                        unit=sanitize(item['length'].get('unit', 'cm'))
                    )
                except Exception as e:
                    print(f"⚠️ Error saving length for {created_item.name}: {e}")

            created_items.append(created_item.id)
            print(f"✅ Created item: {created_item.name} (ID {created_item.id})")

        except Exception as e:
            traceback.print_exc()  # 🧪 Print full error details
            print(f"❌ Error processing item '{item.get('name')}': {e}")
            continue

    # 🏁 Update vendor request
    vendor_request.status = 'approved'
    vendor_request.save()

    # 📩 Send email
    subject = 'Vendor Registration Approved'
    text_content = f'Dear {user.first_name},\n\nYour vendor registration has been approved.\nYou can now access your vendor dashboard.\n\nBest regards,\nTeam'
    html_content = f"""
    <html><body>
    <p>Dear {user.first_name},</p>
    <p><strong>Congratulations!</strong> Your vendor registration has been <span style="color:green;">approved</span>.</p>
    <p>You can now access your <a href="https://yourdomain.com/vendor-dashboard">vendor dashboard</a>.</p>
    <br><p>Warm regards,<br><strong>Your Team</strong></p>
    </body></html>
    """
    email = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [user.email])
    email.attach_alternative(html_content, "text/html")
    email.send()

    # 📝 Log activity
    log_activity(
        user=request.user,
        actor_type='admin',
        action='approved_vendor',
        description=f"Admin '{request.user.username}' approved vendor for user '{vendor.user.username}'"
    )

    return Response({
        'message': 'Vendor approved, items created, email sent.',
        'created_items': created_items
    })

    


# deny vendor
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deny_vendor(request, vendor_request_id):
    try:
        vendor_request = VendorRequest.objects.get(id=vendor_request_id)
    except VendorRequest.DoesNotExist:
        return Response({'error': 'Vendor request not found.'}, status=404)

    # Update vendor request status to 'denied'
    vendor_request.status = 'denied'
    vendor_request.save()

    # Prepare HTML email
    user = vendor_request.user
    subject = 'Vendor Registration Denied'

    text_content = 'Your vendor registration has been denied.'  # fallback
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>Dear {user.first_name},</p>
        <p>We regret to inform you that your <strong>vendor registration</strong> has been 
        <span style="color: red;"><strong>denied</strong></span>.</p>

        <p>This may be due to missing, inaccurate, or insufficient information provided during the verification process.</p>

        <p>If you believe this was a mistake or would like to discuss further, feel free to 
        <a href="https://yourdomain.com/contact-support">contact our support team</a>.</p>

        <br>
        <p>Best regards,<br><strong>Admin Team<br>@MaaMaraMarket</strong></p>
    </body>
    </html>
    """

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send()

    return Response({'message': 'Vendor denied and user notified via email.'})


# vendor profile:
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_vendor_profile(request):
    try:
        vendor = Vendor.objects.get(user=request.user)
    except Vendor.DoesNotExist:
        return Response({"error": "Vendor profile not found"}, status=404)

    serializer = VendorSerializer(vendor)
    return Response(serializer.data)