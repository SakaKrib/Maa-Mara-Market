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
from django.utils import timezone as django_timezone
from django.db.models import Q
from .models import Item, ItemAdditionalImage, ColorVariant, SizeStock, AgeVariant, Occasion
from .Serializers import ItemSerializers
from rest_framework.permissions import IsAuthenticated
import json
import os
import hashlib
from django.core.files.storage import default_storage
from django.utils.text import slugify
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.template.loader import render_to_string
import bleach # type: ignore
from urllib.parse import urlparse, unquote
from order.Base import IsVendor
from vendorDashboard.draft_service import (
    build_item_draft_update_payload,
    finalize_item_draft,
    sync_item_draft_media,
)
from .item_deduplication import find_duplicate_item




# Reusable sanitizer
def sanitize(value):
    if isinstance(value, str):
        return bleach.clean(value)
    return value


class VendorItemCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    @transaction.atomic
    def post(self, request):
        serializer = VendorItemSerializer(data=request.data)
        if serializer.is_valid():
            duplicate = find_duplicate_item(
                serializer.validated_data,
                owner_user=request.user,
            )
            if duplicate:
                return Response(
                    {
                        "duplicate": (
                            f"An equivalent item already exists (item ID {duplicate.pk}). "
                            "Edit that item instead of creating another copy."
                        ),
                        "item_id": duplicate.pk,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)






#fetch vendor profile
# -------------------------------
# Vendor Profile
# -------------------------------
class VendorProfileView(generics.RetrieveAPIView):
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def get_object(self):
        return Vendor.objects.get(user=self.request.user)

# -------------------------------
# Vendor Item
# -------------------------------
class VendorItemViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = ItemSerializers
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Admins may create, update, and delete items for any vendor.
        # Existing vendor behavior remains restricted to the owning vendor.
        if self.request.user.is_staff and self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated(), IsVendor()]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Item.objects.all()

        vendor = getattr(self.request.user, "vendor", None)
        if vendor:
            return Item.objects.filter(
                Q(created_by=self.request.user) | Q(vendor=vendor)
            ).distinct()

        return Item.objects.filter(created_by=self.request.user)

    def get_serializer(self, *args, **kwargs):
        data = kwargs.get("data")
        if data and hasattr(data, "getlist"):
            # Multipart requests use QueryDict/MultiValueDict. Preserve repeated
            # values so gallery uploads and the many-to-many occasions field
            # arrive at the serializer as lists instead of a single value.
            decoded = {}
            list_fields = {"gallery_images", "occasions"}
            json_list_fields = {
                "gallery_keep_ids",
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
            }

            for key in data.keys():
                values = data.getlist(key)

                if key in list_fields:
                    if key == "occasions" and len(values) == 1 and isinstance(values[0], str):
                        try:
                            parsed = json.loads(values[0])
                            values = parsed if isinstance(parsed, list) else values
                        except json.JSONDecodeError:
                            pass

                    decoded[key] = [sanitize(value) for value in values]
                    continue

                value = values[-1] if values else None

                if key in json_list_fields and isinstance(value, str):
                    try:
                        decoded[key] = json.loads(value)
                    except json.JSONDecodeError:
                        decoded[key] = []
                else:
                    decoded[key] = sanitize(value)

            kwargs["data"] = decoded
        elif data and isinstance(data, dict):
            decoded = {}
            for key, value in data.items():
                if key in [
                    "gallery_keep_ids",
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
                    except json.JSONDecodeError:
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
        else:
            new_obj = model.objects.create(item=item, **{k: sanitize(v) for k, v in data.items()})

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

        # Update or create
        for s in data:
            obj_id = s.get("id")
            sanitized_s = {k: sanitize(v) for k, v in s.items()}
            if obj_id and obj_id in existing_shoes:
                shoe_instance = existing_shoes[obj_id]
                for attr, val in sanitized_s.items():
                    setattr(shoe_instance, attr, val)
                shoe_instance.save()
            else:
                Shoe.objects.create(item=item, **sanitized_s)

    def _update_nested(self, items_data, existing_qs, model, parent_field, nested_field=None):
        existing_ids = [obj.id for obj in existing_qs]
        new_ids = [item.get("id") for item in items_data if item.get("id")]

        # Delete removed
        for old_id in existing_ids:
            if old_id not in new_ids:
                model.objects.filter(id=old_id).delete()

        # Update or create
        for idx, item_data in enumerate(items_data):
            # Preserve nested rows when a nested field is omitted; only an
            # explicit empty list requests removal of all children.
            nested_data = item_data.pop(nested_field, None) if nested_field else None
            obj_id = item_data.get("id")
            sanitized_data = {k: sanitize(v) for k, v in item_data.items()}

            # When an existing item has a saved draft, that draft's media rows
            # are authoritative. Do not let the separate PUT upload overwrite
            # or diverge from the files already committed to the draft.
            if model.__name__ == "ColorVariant" and not getattr(self, "_active_edit_item_draft", None):
                image_file = (
                    self.request.FILES.get(f"variants[{idx}][image]") or
                    self.request.FILES.get(f"variant_image_{idx}")
                )
                if image_file:
                    sanitized_data["image"] = image_file

            if obj_id:
                obj = existing_qs.filter(id=obj_id).first()
                if obj is None:
                    # The edit form can retain a stale nested ID. Never use a
                    # stale ID to access a related row outside this item.
                    sanitized_data.pop("id", None)
                    new_obj = model.objects.create(**{parent_field: self._current_item}, **sanitized_data)
                    if nested_field and nested_data is not None:
                        for nested_item in nested_data:
                            SizeStock.objects.create(
                                variant=new_obj,
                                **{k: sanitize(v) for k, v in nested_item.items() if k != "id"}
                            )
                    continue
                for attr, val in sanitized_data.items():
                    setattr(obj, attr, val)
                obj.save()

                if nested_field and nested_data is not None:
                    self._update_nested(
                        nested_data,
                        getattr(obj, nested_field).all(),
                        SizeStock,
                        parent_field="variant",
                    )
            else:
                new_obj = model.objects.create(**{parent_field: self._current_item}, **sanitized_data)
                if nested_field and nested_data is not None:
                    for nested_item in nested_data:
                        SizeStock.objects.create(
                            variant=new_obj,
                            **{k: sanitize(v) for k, v in nested_item.items()}
                        )

    def _handle_item_media(self, item):
        """Persist optional additional gallery images and remove requested images."""
        files = self.request.FILES.getlist("additional_images")
        if not files:
            files = self.request.FILES.getlist("additional_images[]")

        for image_file in files:
            ItemAdditionalImage.objects.create(item=item, image=image_file)

        remove_ids = self.request.data.get("remove_additional_image_ids")
        if remove_ids:
            try:
                if isinstance(remove_ids, str):
                    remove_ids = json.loads(remove_ids)
                if isinstance(remove_ids, (list, tuple)):
                    ItemAdditionalImage.objects.filter(
                        item=item,
                        id__in=[int(value) for value in remove_ids],
                    ).delete()
            except (TypeError, ValueError, json.JSONDecodeError):
                raise ValidationError({
                    "remove_additional_image_ids": "Expected a JSON array of image IDs."
                })

    def _validate_upload_limits(self):
        image_files = []
        main_image = self.request.FILES.get("image")
        if main_image:
            image_files.append(main_image)

        image_files.extend(self.request.FILES.getlist("additional_images"))
        image_files.extend(self.request.FILES.getlist("additional_images[]"))

        for key, upload in self.request.FILES.items():
            if key.startswith("variant_image_") or "[image]" in key:
                image_files.append(upload)

        # Drafts use the same product-wide media policy: ten images total.
        # Uploaded variant/gallery files are counted here as well so a direct
        # API call cannot bypass the frontend limit.
        if len(image_files) > 10:
            raise ValidationError("An item can contain at most 10 images in total.")

        for upload in image_files:
            if upload.size > 10 * 1024 * 1024:
                raise ValidationError("Each image must be 10 MB or smaller.")

        video = self.request.FILES.get("video")
        if video:
            if video.size > 100 * 1024 * 1024:
                raise ValidationError("The product video must be 100 MB or smaller.")
            extension = os.path.splitext(video.name or "")[1].lower()
            if extension not in {".mp4", ".mov", ".webm"}:
                raise ValidationError("Video must be MP4, MOV, or WEBM.")

    # -------------------------------
    # Create / Update
    # -------------------------------
    @transaction.atomic
    def perform_create(self, serializer):
        self._validate_upload_limits()
        validated = serializer.validated_data

        # Resolve the seller first so an admin creating on a vendor's behalf
        # and the vendor creating directly use the same duplicate scope.
        target_vendor = None
        if self.request.user.is_staff:
            vendor_id = self.request.data.get("vendor_id")
            if not vendor_id:
                raise ValidationError({"vendor_id": "A vendor is required when an admin creates an item."})
            try:
                target_vendor = Vendor.objects.select_related("user").get(pk=vendor_id)
            except Vendor.DoesNotExist:
                raise ValidationError({"vendor_id": "Selected vendor was not found."})
            item_owner = target_vendor.user
        else:
            target_vendor = Vendor.objects.filter(user=self.request.user).first()
            item_owner = self.request.user

        duplicate = find_duplicate_item(validated, owner_user=item_owner)
        if duplicate:
            raise ValidationError({
                "duplicate": (
                    f"An equivalent item already exists (item ID {duplicate.pk}). "
                    "Edit that item instead of creating another copy."
                ),
                "item_id": duplicate.pk,
            })

        variants_supplied = "variants" in validated
        size_only_supplied = "size_only_icon" in validated
        kids_sizes_supplied = "kids_sizes" in validated
        variants_data = validated.pop("variants", [])
        size_only_data = validated.pop("size_only_icon", [])
        kids_sizes_data = validated.pop("kids_sizes", [])
        weight_data = validated.pop("weight", None)
        length_data = validated.pop("length", None)
        shoe_data = validated.pop("shoe_input", None)
        shipping_dimension_data = validated.pop("shipping_dimension_data", None)
        offer_data = validated.pop("offer", None)

        if self.request.user.is_staff:
            item = serializer.save(created_by=self.request.user, vendor=target_vendor)
        else:
            item = serializer.save(created_by=self.request.user)

        self._current_item = item

        self._handle_item_media(item)
        self._handle_shoe(item, shoe_data)
        self._handle_dimension(item, Weight, weight_data, "weight")
        self._handle_dimension(item, Length, length_data, "length")
        self._handle_dimension(item, ShippingDimension, shipping_dimension_data, "shipping_dimension")

        if offer_data:
            Offer.objects.create(item=item, **{k: sanitize(v) for k, v in offer_data.items()})

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

            for size_data in sizes_data:
                SizeStock.objects.create(variant=variant, **{k: sanitize(v) for k, v in size_data.items()})

        for size_data in size_only_data:
            SizeStock.objects.create(item=item, **{k: sanitize(v) for k, v in size_data.items()})

        for kids_data in kids_sizes_data:
            AgeVariant.objects.create(item=item, **{k: sanitize(v) for k, v in kids_data.items()})

        # Admin-created items may originate from the server-side Add New Item
        # draft. Finalize its persisted media only after Item creation succeeds.
        draft_id = self.request.data.get("draft_id")
        if draft_id:
            draft = ItemDraft.objects.filter(
                id=draft_id,
                owner=self.request.user,
                status="DRAFT",
            ).first()
            if draft is None:
                raise ValidationError("The selected item draft is no longer active.")
            finalize_item_draft(draft, item)

    @transaction.atomic
    def perform_update(self, serializer):
        current_item = self.get_object()

        # Vendor edit drafts are saved independently from the live Item update.
        # Resolve the active draft by both its owner and the exact Item being
        # edited; never apply a draft belonging to another item or vendor.
        edit_draft = None
        if not self.request.user.is_staff:
            draft_queryset = ItemDraft.objects.filter(
                owner=self.request.user,
                created_item=current_item,
                status="DRAFT",
                expires_at__gt=django_timezone.now(),
            )
            if current_item.vendor_id:
                draft_queryset = draft_queryset.filter(vendor_id=current_item.vendor_id)
            edit_draft = draft_queryset.order_by("-updated_at").first()

        self._active_edit_item_draft = edit_draft
        if edit_draft is not None:
            # Use the latest persisted draft snapshot as the source of truth.
            # The live PUT still triggers this existing endpoint, but its field
            # values must not take precedence over the draft that was just saved.
            draft_payload = build_item_draft_update_payload(edit_draft.data)
            draft_serializer = self.get_serializer(
                current_item,
                data=draft_payload,
                partial=True,
            )
            draft_serializer.is_valid(raise_exception=True)
            serializer.initial_data = draft_payload
            serializer._validated_data = draft_serializer.validated_data

        validated = serializer.validated_data

        # Item.price is protected at the model layer. Vendors may keep the
        # current price, but a price change still requires administrator approval.
        if not self.request.user.is_staff and "price" in validated:
            submitted_price_decimal = Decimal(str(validated["price"]))
            if submitted_price_decimal != current_item.price:
                raise ValidationError({
                    "price": "Direct price changes require administrator approval."
                })

        if self.request.user.is_staff:
            current_item._allow_price_update = True

        # Only mutate nested records when the client actually supplied that field.
        variants_supplied = "variants" in validated
        size_only_supplied = "size_only_icon" in validated
        kids_sizes_supplied = "kids_sizes" in validated

        variants_data = validated.pop("variants", [])
        size_only_data = validated.pop("size_only_icon", [])
        kids_sizes_data = validated.pop("kids_sizes", [])
        weight_data = validated.pop("weight", None)
        length_data = validated.pop("length", None)
        shoe_data = validated.pop("shoe_input", None)
        shipping_dimension_data = validated.pop("shipping_dimension_data", None)
        offer_data = validated.pop("offer", None) 

        item = serializer.save()
        self._current_item = item

        self._handle_item_media(item)
        self._handle_shoe(item, shoe_data)
        self._handle_dimension(item, Weight, weight_data, "weight")
        self._handle_dimension(item, Length, length_data, "length")
        self._handle_dimension(item, ShippingDimension, shipping_dimension_data, "shipping_dimension")

        if offer_data:
            offer_obj = getattr(item, 'offer', None)
            if offer_obj:
                for key, val in offer_data.items():
                    setattr(offer_obj, key, sanitize(val))
                offer_obj.save()
            else:
                Offer.objects.create(item=item, **{k: sanitize(v) for k, v in offer_data.items()})

        # Handle variant and nested updates
        if variants_supplied:
            self._update_nested(
                variants_data,
                item.variants.all(),
                ColorVariant,
                parent_field="item",
                nested_field="sizes"
            )
        if size_only_supplied:
            self._update_nested(
                size_only_data,
                item.size_only_icon.all(),
                SizeStock,
                parent_field="item"
            )
        if kids_sizes_supplied:
            self._update_nested(
                kids_sizes_data,
                item.kids_sizes.all(),
                AgeVariant,
                parent_field="item"
            )

        # Draft data and draft media are the source of truth for vendor edits.
        # Transfer media only after the field/variant rows exist on the live Item.
        if edit_draft is not None:
            sync_item_draft_media(edit_draft, item)








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

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([IsAuthenticated])
@transaction.atomic
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

    # Persist optional item video and additional gallery images.
    # VendorRequest.item_list is JSON, so uploaded files are stored in MEDIA_ROOT
    # and their paths are recorded in the item JSON.
    for index, item in enumerate(decoded.get("item_list", [])):
        video_upload = request.FILES.get(f"item_video_{index}")
        if video_upload:
            filename = get_valid_filename(video_upload.name)
            path = default_storage.save(
                f"vendor_items/videos/{filename}",
                ContentFile(video_upload.read()),
            )
            item["video"] = default_storage.url(path)

        additional_uploads = request.FILES.getlist(f"item_additional_images_{index}")
        if additional_uploads:
            existing_images = item.get("additional_images") or []
            if not isinstance(existing_images, list):
                existing_images = []
            for upload in additional_uploads:
                filename = get_valid_filename(upload.name)
                path = default_storage.save(
                    f"vendor_items/additional/{filename}",
                    ContentFile(upload.read()),
                )
                existing_images.append(default_storage.url(path))
            item["additional_images"] = existing_images

    # Keep item images authoritative in VendorDraft when a draft exists.
    # Existing files are referenced by asset ID; replacements update the
    # draft asset in place instead of creating a second, disconnected copy.
    if item_list_raw:
        draft_id = vendor_data.get("draft_id")
        draft = None
        if draft_id:
            try:
                draft = VendorDraft.objects.get(
                    id=draft_id,
                    user=user,
                    status="DRAFT",
                    expires_at__gt=timezone.now(),
                )
            except (VendorDraft.DoesNotExist, ValueError, TypeError):
                return Response(
                    {"vendor_data": ["The saved vendor draft could not be verified or has expired."]},
                    status=400,
                )

        for index, item in enumerate(decoded.get("item_list", [])):
            upload = request.FILES.get(f"item_image_{index}")

            if upload and draft:
                old_image = draft.images.filter(item_index=index).first()
                if old_image:
                    old_image.image.delete(save=False)
                    old_image.delete()

                asset = VendorDraftImage.objects.create(
                    draft=draft,
                    image=upload,
                    item_index=index,
                )
                item["image"] = default_storage.url(asset.image.name)
                item["image_asset_id"] = asset.id
                continue

            if upload:
                path = default_storage.save(
                    f"vendor_items/{upload.name}",
                    ContentFile(upload.read()),
                )
                item["image"] = default_storage.url(path)
                item["image_asset_id"] = None
                continue

            asset_id = item.get("image_asset_id")
            if asset_id and draft:
                try:
                    asset = VendorDraftImage.objects.get(
                        id=asset_id,
                        draft=draft,
                        item_index=index,
                    )
                except VendorDraftImage.DoesNotExist:
                    return Response(
                        {"item_list": [f"Invalid saved image reference for item {index + 1}."]},
                        status=400,
                    )
                item["image"] = default_storage.url(asset.image.name)
            elif asset_id:
                return Response(
                    {"item_list": [f"Saved image reference for item {index + 1} is not valid."]},
                    status=400,
                )

        if draft:
            draft.data = {
                **(draft.data or {}),
                "item_list": decoded.get("item_list", []),
                "draft_id": str(draft.id),
            }
            draft.expires_at = timezone.now() + timezone.timedelta(days=30)
            draft.save(update_fields=["data", "expires_at", "updated_at"])

    # ✅ Pass to serializer
    serializer = VendorRequestSerializer(data=decoded, context={"request": request})
    if serializer.is_valid():
        vendor_request = serializer.save(user=user)
        vendor_request.generate_otp()

        # The registration has now been submitted. Keep the draft record and
        # its image assets available for admin approval, but stop exposing it
        # through the customer "pick up where you left off" endpoint.
        if draft:
            draft.status = "SUBMITTED"
            draft.save(update_fields=["status", "updated_at"])

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
    if isinstance(new_items, str):
        try:
            new_items = json.loads(new_items)
        except json.JSONDecodeError:
            return Response({'error': 'item_list must be valid JSON.'}, status=400)

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
    for item_index, item in enumerate(current_items):
        if item.get('name') == item_name:
            updated_item = dict(updated_item)

            video_upload = request.FILES.get(f"item_video_{item_index}")
            if video_upload:
                filename = get_valid_filename(video_upload.name)
                path = default_storage.save(
                    f"vendor_items/videos/{filename}",
                    ContentFile(video_upload.read()),
                )
                updated_item["video"] = default_storage.url(path)

            additional_uploads = request.FILES.getlist(
                f"item_additional_images_{item_index}"
            )
            if additional_uploads:
                existing_images = updated_item.get("additional_images")
                if not isinstance(existing_images, list):
                    existing_images = item.get("additional_images") or []
                for upload in additional_uploads:
                    filename = get_valid_filename(upload.name)
                    path = default_storage.save(
                        f"vendor_items/additional/{filename}",
                        ContentFile(upload.read()),
                    )
                    existing_images.append(default_storage.url(path))
                updated_item["additional_images"] = existing_images

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
    vendor_data = dict(vendor_request.vendor_data or {})
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
        description=f"The administrator viewed vendor requests ({status or 'all'})."
    )    
    serializer = VendorRequestSerializer(requests, many=True)
    return Response(serializer.data)



from django.core.files import File
from django.core.files.base import ContentFile
from django.conf import settings
import os, requests
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
@transaction.atomic
def approve_vendor(request, vendor_request_id):

    # Lock this request so concurrent approval retries cannot create the
    # same vendor/items in parallel.
    try:
        vendor_request = VendorRequest.objects.select_for_update().get(id=vendor_request_id)
    except VendorRequest.DoesNotExist:
        return Response({'error': 'Vendor request not found.'}, status=404)

    if vendor_request.status != 'verified':
        return Response({'error': 'Vendor is not verified yet.'}, status=400)

    user = vendor_request.user
    vendor_data = vendor_request.vendor_data or {}

    # ✅ BRAND HANDLING
    brand_instance = None
    brand_data = vendor_data.pop("brand", None)
    draft_id = vendor_data.pop("draft_id", None)
    vendor_logo_path = vendor_data.get("vendor_company_logo")
    decoded_path = unquote(vendor_logo_path) if vendor_logo_path else None

    if brand_data:
        name = sanitize(brand_data.get("name", "")).strip()
        description = sanitize(brand_data.get("description", ""))

        if name:
            brand_instance, created = Brand.objects.get_or_create(
                name=name,
                defaults={"description": description}
            )

            # Save the raw brand JSON data
            vendor_request.brand_object = brand_data
            vendor_request.save(update_fields=["brand_object"])

            if description and brand_instance.description != description:
                brand_instance.description = description
                brand_instance.save(update_fields=["description"])

            logo_file = request.FILES.get("vendor_company_logo") or request.FILES.get("brand_logo")
            if logo_file:
                brand_instance.logo.save(logo_file.name, logo_file, save=True)
            elif decoded_path and (not brand_instance.logo or not brand_instance.logo.name):
                try:
                    parsed_url = urlparse(decoded_path)

                    if decoded_path.startswith("/media"):
                        relative_path = decoded_path.replace("/media/", "", 1)
                        file_path = os.path.join(settings.MEDIA_ROOT, relative_path)
                        if os.path.exists(file_path):
                            with open(file_path, "rb") as f:
                                brand_instance.logo.save(os.path.basename(file_path), File(f), save=True)

                    elif parsed_url.scheme in ["http", "https"]:
                        response = requests.get(decoded_path, timeout=10)
                        if response.status_code == 200:
                            filename = os.path.basename(parsed_url.path)
                            brand_instance.logo.save(filename, ContentFile(response.content), save=True)

                except Exception as e:
                    pass

    # Clean vendor data. draft_id is only an internal approval reference.
    for field in ['social_media_links', 'item_list', 'item_pdf', 'draft_id']:
        vendor_data.pop(field, None)

    for field in ['profile_picture', 'vendor_company_logo']:
        if vendor_data.get(field):
            vendor_data[field] = vendor_data[field].lstrip('/').removeprefix('media/')

    vendor_data = {k: sanitize(v) for k, v in vendor_data.items()}

    # 🧪 Check item list
    item_list = vendor_request.item_list or []
    if not item_list:
        return Response({'error': 'No item data provided or invalid format.'}, status=400)

    # Resolve the source draft before creating any permanent vendor records.
    source_draft = None
    if draft_id:
        try:
            source_draft = VendorDraft.objects.get(
                id=draft_id,
                user=user,
                status__in=["DRAFT", "SUBMITTED"],
                expires_at__gt=timezone.now(),
            )
        except VendorDraft.DoesNotExist:
            # Older requests can contain a stale draft_id while their
            # persisted image assets are still valid. Try resolving the draft
            # from those assets below before rejecting the approval.
            source_draft = None

    # Older vendor requests may contain persisted item image_asset_id values
    # but predate the draft_id linkage in vendor_data. Recover the exact draft
    # from those asset IDs instead of rejecting an otherwise valid saved image.
    if source_draft is None:
        saved_asset_ids = []
        for item in item_list:
            asset_id = item.get("image_asset_id")
            if asset_id not in (None, ""):
                try:
                    saved_asset_ids.append(int(asset_id))
                except (TypeError, ValueError):
                    pass

        if saved_asset_ids:
            required_ids = set(saved_asset_ids)
            candidate_assets = (
                VendorDraftImage.objects
                .filter(
                    id__in=required_ids,
                    draft__user=user,
                    draft__status__in=["DRAFT", "SUBMITTED"],
                    draft__expires_at__gt=timezone.now(),
                )
                .select_related("draft")
            )
            candidates = {}
            for asset in candidate_assets:
                candidates.setdefault(asset.draft_id, {})[asset.id] = asset

            for assets in candidates.values():
                if set(assets) != required_ids:
                    continue
                if all(
                    assets[int(item["image_asset_id"])].item_index == index
                    for index, item in enumerate(item_list)
                    if item.get("image_asset_id") not in (None, "")
                    and str(item.get("image_asset_id")).isdigit()
                ):
                    source_draft = assets[next(iter(assets))].draft
                    draft_id = source_draft.id
                    vendor_data["draft_id"] = str(source_draft.id)
                    break

    if draft_id and source_draft is None and not any(
        item.get("image_asset_id") not in (None, "") for item in item_list
    ):
        return Response(
            {"error": "The saved vendor draft is no longer available."},
            status=400,
        )

    # VendorRequest.item_list is the submitted approval snapshot and already
    # contains the persisted image path for saved images. Approval must not
    # depend on the temporary autosave draft still existing.
    resolved_draft_images = {}
    for index, item in enumerate(item_list):
        image_asset_id = item.get("image_asset_id")
        if not image_asset_id:
            continue

        stored_image_path = item.get("image")
        if source_draft:
            try:
                draft_image = VendorDraftImage.objects.get(
                    id=image_asset_id,
                    draft=source_draft,
                    item_index=index,
                )
                stored_image_path = draft_image.image.name
            except VendorDraftImage.DoesNotExist:
                # The request snapshot remains authoritative. If the draft
                # record was cleaned up after submission, keep the image path
                # already stored inside VendorRequest.item_list.
                pass

        if not stored_image_path:
            return Response(
                {"error": f"Saved item image {index + 1} has no stored image path in the vendor request."},
                status=400,
            )

        resolved_draft_images[image_asset_id] = stored_image_path

    # 🏪 Create Vendor
    vendor = Vendor.objects.create(user=user, brand=brand_instance, **vendor_data)

    def normalize_media_path(value):
        if isinstance(value, dict):
            value = (
                value.get("image")
                or value.get("image_url")
                or value.get("url")
                or value.get("file")
            )
        if not value:
            return None
        path = str(value).strip()
        # JSON draft data may contain an already-prefixed media URL. Store the
        # path relative to MEDIA_ROOT so ImageField generates /media/... once.
        while path.startswith("/"):
            path = path[1:]
        while path.startswith("media/"):
            path = path[len("media/"):]
        return path or None

    created_items = []

    for item in item_list:
        try:
            normalized_item = {k.lower(): v for k, v in item.items()}

            # Prefer the authoritative stored draft image. This means an
            # unchanged image is promoted directly from the draft asset;
            # a replacement already has a new asset/path from submission.
            image_asset_id = item.get("image_asset_id")
            raw_path = item.get("image")
            if image_asset_id:
                raw_path = resolved_draft_images[image_asset_id]

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

            brand = None
            raw_brand = item.get('brand')

            # The frontend may submit the selected Brand as an ID, while
            # older vendor-request payloads may contain a brand name/object.
            # Resolve all supported forms to an actual Brand instance before
            # creating the Item.
            if isinstance(raw_brand, dict):
                brand_id = raw_brand.get('id') or raw_brand.get('pk')
                brand_name = sanitize(raw_brand.get('name', '')).strip()
            else:
                brand_id = raw_brand if isinstance(raw_brand, (int, str)) else None
                brand_name = sanitize(raw_brand).strip() if raw_brand else None

            if brand_id not in (None, ''):
                try:
                    brand = Brand.objects.filter(pk=int(brand_id)).first()
                except (TypeError, ValueError):
                    brand = None

            if brand is None and brand_name:
                if not brand_name.isdigit():
                    brand, _ = Brand.objects.get_or_create(name=brand_name)

            if brand is None:
                brand = brand_instance

            relative_path = normalize_media_path(raw_path)
            video_relative_path = normalize_media_path(item.get("video"))

            name = sanitize(item.get('name') or "")
            if not name:
                continue

            # Refuse to create the same seller-owned product twice, including
            # duplicate entries in one registration request or a retry of a
            # previously processed item. Stock/media changes do not define a
            # separate product identity.
            duplicate_candidate = {
                "section": section,
                "name": name,
                "description": sanitize(item.get("description") or ""),
                "price": item.get("price", 0) or 0,
                "discount_price": item.get("discount_price") or None,
                "department": department,
                "category": category,
                "subcategory": subcategory,
                "brand": brand,
                "item_attribute": sanitize(item.get("item_attribute") or "") or None,
                "gender_based": sanitize(item.get("gender_based") or "none") or "none",
                "children_size_based_age": sanitize(
                    item.get("children_size_based_age")
                    or item.get("kids_sizes_label")
                    or "none"
                ),
                "in_offer": item.get("in_offer", False),
                "is_organic": item.get("is_organic", False),
                "manufactured_date": item.get("manufactured_date") or None,
                "expiry_date": item.get("expiry_date") or None,
                "is_fresh_food": item.get("is_fresh_food", False),
                "percentage_discount": item.get("percentage_discount", 0) or 0,
                "roast_type": sanitize(item.get("roast_type") or "") or None,
                "coffee_state": sanitize(item.get("coffee_state") or "") or None,
            }
            duplicate = find_duplicate_item(duplicate_candidate, owner_user=user)
            if duplicate:
                logger.warning(
                    "Skipping duplicate vendor item: vendor_request_id=%s item_name=%r existing_item_id=%s",
                    vendor_request_id,
                    name,
                    duplicate.pk,
                )
                if duplicate.pk not in created_items:
                    created_items.append(duplicate.pk)
                continue

            # Item.slug is a 50-character database field. Keep the full
            # product name in Item.name, but generate a bounded unique slug.
            slug_suffix = f"-{user.id}"
            base_slug = slugify(name) or f"item-{user.id}"
            max_base_length = 50 - len(slug_suffix)
            base_slug = base_slug[:max_base_length].rstrip("-") or "item"
            slug = f"{base_slug}{slug_suffix}"
            counter = 1
            while Item.objects.filter(slug=slug).exists():
                counter_suffix = f"-{counter}"
                available_base_length = 50 - len(slug_suffix) - len(counter_suffix)
                slug = (
                    f"{base_slug[:available_base_length].rstrip('-')}"
                    f"{slug_suffix}{counter_suffix}"
                )
                counter += 1

            image_hash = hashlib.sha256(slug.encode("utf-8")).hexdigest()

            # Map every persistable Item model field from the vendor-request payload.
            created_item = Item.objects.create(
                section=section,
                name=name,
                description=sanitize(item.get("description") or ""),
                image=relative_path,
                video=video_relative_path,
                price=item.get("price", 0) or 0,
                discount_price=item.get("discount_price") or None,
                in_stock=item.get("in_stock", 0) or 0,
                available=item.get("available", True),
                returnable=item.get("returnable", True),
                brand=brand,
                department=department,
                category=category,
                subcategory=subcategory,
                item_attribute=sanitize(item.get("item_attribute") or "") or None,
                gender_based=sanitize(item.get("gender_based") or "none") or "none",
                children_size_based_age=sanitize(
                    item.get("children_size_based_age")
                    or item.get("kids_sizes_label")
                    or "none"
                ),
                in_offer=item.get("in_offer", False),
                is_organic=item.get("is_organic", False),
                manufactured_date=item.get("manufactured_date") or None,
                expiry_date=item.get("expiry_date") or None,
                is_fresh_food=item.get("is_fresh_food", False),
                vendor=vendor,
                created_by=user,
                slug=slug,
                image_hash=image_hash,
                likes=item.get("likes", 0) or 0,
                views=item.get("views", 0) or 0,
                percentage_discount=item.get("percentage_discount", 0) or 0,
                roast_type=sanitize(item.get("roast_type") or "") or None,
                coffee_state=sanitize(item.get("coffee_state") or "") or None,
            )

            occasion_keys = item.get("occasions") or []
            if occasion_keys:
                if not isinstance(occasion_keys, list):
                    occasion_keys = [occasion_keys]
                created_item.occasions.set(
                    Occasion.objects.filter(
                        key__in=[str(key) for key in occasion_keys],
                        is_active=True,
                    )
                )

            for additional_image in item.get("additional_images", []) or []:
                if not additional_image:
                    continue
                additional_relative_path = normalize_media_path(additional_image)
                if not additional_relative_path:
                    continue
                ItemAdditionalImage.objects.create(
                    item=created_item,
                    image=additional_relative_path,
                )

            shipping_data = (
                item.get("shipping_dimension_data")
                or item.get("shipping_dimension")
                or {}
            )
            if shipping_data:
                ShippingDimension.objects.update_or_create(
                    item=created_item,
                    defaults={
                        "length": shipping_data.get("length", 0) or 0,
                        "width": shipping_data.get("width", 0) or 0,
                        "height": shipping_data.get("height", 0) or 0,
                        "weight": shipping_data.get("weight", 0) or 0,
                        "unit": shipping_data.get("unit", "cm") or "cm",
                        "weight_unit": shipping_data.get("weight_unit", "kg") or "kg",
                    },
                )

            variant_data = item.get("variants")
            if variant_data is None:
                variant_data = item.get("color_variants", [])

            for cv in variant_data or []:
                if not isinstance(cv, dict):
                    continue
                color = sanitize(cv.get("color"))
                if not color:
                    continue
                raw_variant_image = cv.get("image") or cv.get("color_image")
                variant_image_path = (
                    str(raw_variant_image).lstrip("/").removeprefix("media/")
                    if isinstance(raw_variant_image, str) and raw_variant_image
                    else None
                )
                variant = ColorVariant.objects.create(
                    item=created_item,
                    color=color,
                    image=variant_image_path,
                )
                for sz in cv.get("sizes", []) or []:
                    if not isinstance(sz, dict):
                        continue
                    size = sz.get("size")
                    quantity = sz.get("quantity_in_stock", sz.get("stock", 0)) or 0
                    if size not in (None, ""):
                        SizeStock.objects.create(
                            variant=variant,
                            size=size,
                            quantity_in_stock=quantity,
                        )

            size_data = item.get("size_only_icon")
            if size_data is None:
                size_data = item.get("size_stock", [])
            for sz in size_data or []:
                if not isinstance(sz, dict):
                    continue
                size = sz.get("size")
                quantity = sz.get("quantity_in_stock", sz.get("stock", 0)) or 0
                if size not in (None, ""):
                    SizeStock.objects.create(
                        item=created_item,
                        size=size,
                        quantity_in_stock=quantity,
                    )

            age_data = item.get("kids_sizes")
            if age_data is None:
                age_data = item.get("age_variants", [])
            for av in age_data or []:
                if not isinstance(av, dict):
                    continue
                age_group = sanitize(av.get("age_group") or av.get("size") or "")
                quantity = av.get("quantity_in_stock", av.get("stock", 0)) or 0
                if age_group:
                    AgeVariant.objects.create(
                        item=created_item,
                        age_group=age_group,
                        quantity_in_stock=quantity,
                    )

            for shoe in item.get("shoe_input", []) or []:
                if not isinstance(shoe, dict):
                    continue
                Shoe.objects.create(
                    item=created_item,
                    shoe_type=sanitize(shoe.get("shoe_type") or ""),
                    shoe_gender=sanitize(shoe.get("shoe_gender") or ""),
                    shoe_size=shoe.get("shoe_size") or [],
                )

            if item.get("weight"):
                weight_data = item["weight"]
                if isinstance(weight_data, dict):
                    Weight.objects.update_or_create(
                        item=created_item,
                        defaults={
                            "value": weight_data.get("value", 0) or 0,
                            "unit": sanitize(weight_data.get("unit", "kg")),
                        },
                    )

            if item.get("length"):
                length_data = item["length"]
                if isinstance(length_data, dict):
                    Length.objects.update_or_create(
                        item=created_item,
                        defaults={
                            "value": length_data.get("value", 0) or 0,
                            "unit": sanitize(length_data.get("unit", "cm")),
                        },
                    )

            offer_data = item.get("offer")
            if item.get("in_offer") and isinstance(offer_data, dict):
                offer_percentage = offer_data.get("discount_percentage")
                start_date = offer_data.get("start_date")
                end_date = offer_data.get("end_date")
                if offer_percentage and start_date and end_date:
                    from datetime import datetime as _datetime
                    from django.utils import timezone as _timezone

                    def _approval_datetime(value):
                        if isinstance(value, _datetime):
                            parsed = value
                        else:
                            parsed = _datetime.fromisoformat(
                                str(value).replace("Z", "+00:00")
                            )
                        if parsed.tzinfo is None:
                            parsed = _timezone.make_aware(
                                parsed,
                                _timezone.get_current_timezone(),
                            )
                        return parsed

                    Offer.objects.create(
                        item=created_item,
                        discount_percentage=offer_percentage,
                        start_date=_approval_datetime(start_date),
                        end_date=_approval_datetime(end_date),
                    )


            created_items.append(created_item.id)

        except Exception as exc:
            logger.exception(
                "Vendor approval item creation failed: vendor_request_id=%s "
                "item_index=%s item_name=%r",
                vendor_request_id,
                item_list.index(item) + 1,
                item.get("name"),
            )
            return Response(
                {
                    "error": (
                        f"Vendor item {item_list.index(item) + 1} "
                        f"({item.get('name') or 'unnamed'}) could not be created: "
                        f"{exc.__class__.__name__}: {exc}"
                    )
                },
                status=400,
            )

    vendor_request.status = 'approved'
    vendor_request.save()

    user_first_name = user.first_name or user.username
    dashboard_url = f"{settings.FRONTEND_URL.rstrip('/')}/vendors-dashboard"
    total_items = len(created_items)
    current_year = timezone.now().year

    subject = 'Vendor Registration Approved'
    html_content = render_to_string(
        "emails/vendor_approval.html",
        {
            "user_first_name": user_first_name,
            "dashboard_url": dashboard_url,
            "total_items": total_items,
            "current_year": current_year,
            "frontend_url": settings.FRONTEND_URL.rstrip("/"),
        }
    )

    text_content = f"""
    Dear {user_first_name},

    Congratulations! Your vendor registration has been approved.

    You can now access your vendor dashboard here: {dashboard_url}

    Total items created: {total_items}

    — Maamara Market System Notification
    """

    email = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [user.email])
    email.attach_alternative(html_content, "text/html")
    email.send()

    log_activity(
        user=request.user,
        actor_type='admin',
        action='approved_vendor',
        description="The administrator approved a vendor account."
    )

    # The draft has now been promoted. Delete only its database record;
    # the stored files remain in media storage because Item.image references
    # the same paths.
    if source_draft:
        source_draft.delete()

    return Response({
        'message': 'Vendor approved, items created, email sent.',
        'created_items': created_items
    })

    


# deny vendor
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def deny_vendor(request, vendor_request_id):
    try:
        vendor_request = VendorRequest.objects.get(id=vendor_request_id)
    except VendorRequest.DoesNotExist:
        return Response({'error': 'Vendor request not found.'}, status=404)

    # Update vendor request status to 'denied'
    vendor_request.status = 'denied'
    vendor_request.save()

    # Prepare email
    user = vendor_request.user
    subject = 'Vendor Registration Denied'
    current_year = timezone.now().year

    text_content = f"Dear {user.first_name},\n\nYour vendor registration has been denied.\n\n— Maamara Market System Notification"

    html_content = render_to_string(
        "emails/vendor_denial.html",
        {
            "user_first_name": user.first_name,
            "current_year": current_year,
            "frontend_url": settings.FRONTEND_URL.rstrip("/"),
        }
    )

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
@permission_classes([IsAuthenticated, IsVendor])
def get_vendor_profile(request):
    try:
        vendor = Vendor.objects.get(user=request.user)
    except Vendor.DoesNotExist:
        return Response({"error": "Vendor profile not found"}, status=404)

    serializer = VendorSerializer(vendor)
    return Response(serializer.data)