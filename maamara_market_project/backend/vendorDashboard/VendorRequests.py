from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import Vendor, VendorItemRequest, Item
from .serializers import VendorItemRequestSerializer
from core.models import ActivityLog, Notification  # adjust import to your app
from rest_framework.views import APIView
from ReactSerializers.models import Department,Item,SubCategory,Category, Section
from django.utils.html import strip_tags
from django.shortcuts import get_object_or_404
from ReactSerializers.models import PriceChangeRequest
from django.utils import timezone
from .serializers import *
from ReactSerializers.models import Offer
from decimal import Decimal, InvalidOperation
from django.db import transaction
from ReactSerializers.models import ItemPriceHistory
from ReactSerializers.Serializers import ItemSerializers
from django.core.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from order.Base import IsVendor
import hashlib
from django.core.files.storage import default_storage

User = get_user_model()

class VendorItemRequestDetailView(generics.RetrieveAPIView):
    queryset = VendorItemRequest.objects.all()
    serializer_class = VendorItemRequestSerializer
    permission_classes = [permissions.IsAdminUser]



# ----------------------------
# Vendor submits item request
# ----------------------------
class VendorItemRequestCreateView(generics.CreateAPIView):
    serializer_class = VendorItemRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    @transaction.atomic
    def perform_create(self, serializer):

        # =========================
        # GET VENDOR SAFELY
        # =========================
        try:
            vendor = Vendor.objects.get(user=self.request.user)
        except Vendor.DoesNotExist:
            raise ValidationError("Vendor account not found.")

        # =========================
        # PREVENT RAPID DUPLICATES
        # =========================
        request_name = serializer.validated_data.get("name")
        request_price = serializer.validated_data.get("price")

        existing_request = VendorItemRequest.objects.filter(
            created_by=self.request.user,
            name=request_name,
            price=request_price,
            status="pending",
            created_at__gte=timezone.now() - timezone.timedelta(minutes=2)
        ).exists()

        if existing_request:
            raise ValidationError(
                "A similar item request was already submitted recently."
            )

        # =========================
        # CREATE REQUEST
        # =========================
        item_request = serializer.save(
            vendor=vendor,
            created_by=self.request.user
            
        )

        # =========================
        # EMAIL TO ADMIN
        # =========================
        subject = f"New Vendor Item Request: {item_request.name}"

        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = [settings.EMAIL_HOST_USER]

        current_year = timezone.now().year

        context = {
            "vendor": vendor,
            "item": item_request,
            "user": self.request.user,
            "current_year": current_year
        }

        html_content = render_to_string(
            "emails/vendor_item_request.html",
            context
        )

        text_content = (
            f"A new item request was submitted by "
            f"{vendor.first_name}.\n\n"
            f"Item: {item_request.name}\n"
            f"Price: {item_request.price}\n"
            f"Description: {item_request.description}"
        )

        email = EmailMultiAlternatives(
            subject,
            text_content,
            from_email,
            to_email
        )

        email.attach_alternative(html_content, "text/html")
        email.send()

        # =========================
        # ADMIN ACTIVITY LOGS
        # =========================
        admins = User.objects.filter(is_superuser=True)

        for admin in admins:
            ActivityLog.objects.create(
                user=admin,
                actor_type="admin",
                action="vendor_item_request_received",
                description=(
                    "A vendor submitted "
                    f"an item request for {item_request.name}"
                ),
                related_url=(
                    f"/admin/vendorDashboard/"
                    f"vendoritemrequest/{item_request.id}/"
                ),
            )

        # =========================
        # VENDOR ACTIVITY LOG
        # =========================
        ActivityLog.objects.create(
            user=self.request.user,
            actor_type="vendor",
            action="item_request_created",
            description=(
                f"You submitted an item request for "
                f"{item_request.name}"
            ),
            related_url=(
                f"/admin/vendorDashboard/"
                f"vendoritemrequest/{item_request.id}/"
            ),
        )

        # =========================
        # ADMIN NOTIFICATIONS
        # =========================
        for admin in admins:
            Notification.objects.create(
                user=admin,
                title="New Vendor Item Request",
                message=(
                    "A vendor submitted "
                    f"an item request for {item_request.name}"
                ),
                url=(
                    f"/vendorDashboard/"
                    f"vendoritemrequest/{item_request.id}/"
                ),
            )



# ----------------------------
# Admin approves or denies
# ----------------------------



@api_view(["POST"])
@permission_classes([permissions.IsAdminUser, IsAuthenticated])
@transaction.atomic
def approve_request(request, pk):

    try:
        item_request = VendorItemRequest.objects.select_for_update().get(pk=pk)
    except VendorItemRequest.DoesNotExist:
        return Response(
            {"error": "Request not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    action = request.data.get("action")

    # =========================
    # FIXED LINE (SAFE USER EXTRACTION)
    # =========================
    vendor_user = item_request.vendor
    vendor_email = vendor_user.user.email   # 🔴 FIXED (was vendor_user.email)

    # =========================
    # APPROVE
    # =========================
    if action == "approve":

        if item_request.status == "approved":
            return Response(
                {"error": "This request has already been approved."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if hasattr(item_request, "approved_item") and item_request.approved_item:
            return Response(
                {"error": "An item has already been created for this request."},
                status=status.HTTP_400_BAD_REQUEST
            )

        draft_data = item_request.draft_item or {}

        department_name = draft_data.get("department")
        category_name = draft_data.get("category")
        subcategory_name = draft_data.get("subcategory")
        section_name = draft_data.get("section")

        try:
            department_instance = (
                Department.objects.get(name=department_name)
                if department_name else None
            )
        except Department.DoesNotExist:
            return Response(
                {"error": f"Department '{department_name}' not found."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            category_instance = (
                Category.objects.get(name=category_name)
                if category_name else None
            )
        except Category.DoesNotExist:
            return Response(
                {"error": f"Category '{category_name}' not found."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            subcategory_instance = (
                SubCategory.objects.get(name=subcategory_name)
                if subcategory_name else None
            )
        except SubCategory.DoesNotExist:
            return Response(
                {"error": f"Subcategory '{subcategory_name}' not found."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            section_instance = (
                Section.objects.get(name__iexact=section_name)
                if section_name else None
            )
        except Section.DoesNotExist:
            return Response(
                {"error": f"Section '{section_name}' not found."},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_image = draft_data.get("image") or (item_request.image.name if item_request.image else None)

        if isinstance(raw_image, str):
            if raw_image.startswith(settings.MEDIA_URL):
                raw_image = raw_image.replace(settings.MEDIA_URL, "", 1)
            elif raw_image.startswith(
                f"http://127.0.0.1:8000{settings.MEDIA_URL}"
            ):
                raw_image = raw_image.replace(
                    f"http://127.0.0.1:8000{settings.MEDIA_URL}",
                    "",
                    1
                )

        def get_image_hash(file_path):
            try:
                if not file_path:
                    return None
                file_path = str(file_path)
                if file_path.startswith(settings.MEDIA_URL):
                    file_path = file_path.replace(settings.MEDIA_URL, "", 1)
                if file_path.startswith("http"):
                    return None
                with default_storage.open(file_path, "rb") as f:
                    return hashlib.sha256(f.read()).hexdigest()
            except Exception:
                return None

        image_hash = get_image_hash(raw_image)

        if image_hash:
            existing = Item.objects.filter(image_hash=image_hash).first()
            if existing:
                return Response(
                    {
                        "error": "This image is already used by another item.",
                        "existing_item_id": existing.id
                    },
                    status=400
                )

        # Treat the saved draft as the canonical edited item definition.
        # Reuse ItemSerializers so approval preserves the complete nested
        # item structure instead of creating only the primitive fields.
        approval_data = dict(draft_data)

        # Drafts are JSON, so existing media paths must be restored after
        # serializer validation rather than passed through ImageField again.
        if isinstance(approval_data.get("image"), str):
            approval_data.pop("image", None)

        variant_image_paths = {}
        normalized_variants = []
        for variant in approval_data.get("variants") or []:
            variant_copy = dict(variant)
            variant_image = variant_copy.get("image")
            if isinstance(variant_image, str):
                variant_image_paths[variant_copy.get("color")] = variant_image
                variant_copy.pop("image", None)
            normalized_variants.append(variant_copy)
        if "variants" in approval_data:
            approval_data["variants"] = normalized_variants

        if "shipping_dimension" in approval_data and "shipping_dimension_data" not in approval_data:
            approval_data["shipping_dimension_data"] = approval_data.pop("shipping_dimension")

        for optional_key in ("weight", "length", "offer", "shipping_dimension_data"):
            if approval_data.get(optional_key) is None:
                approval_data.pop(optional_key, None)

        serializer = ItemSerializers(
            data=approval_data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        item = serializer.save(
            vendor=vendor_user,
            created_by=item_request.created_by,
        )

        if raw_image:
            item.image = raw_image
            item.save(update_fields=["image"])

        if variant_image_paths:
            for variant in item.variants.all():
                image_path = variant_image_paths.get(variant.color)
                if image_path:
                    variant.image = image_path
                    variant.save(update_fields=["image"])

        if image_hash:
            item.image_hash = image_hash
            item.save(update_fields=["image_hash"])

        if hasattr(item_request, "approved_item"):
            item_request.approved_item = item

        item_request.status = "approved"
        item_request.save()

        if offer_data:
            Offer.objects.create(
                item=item,
                discount_percentage=to_decimal(
                    offer_data.get("discount_percentage", 0),
                    Decimal("0.00")
                ),
                start_date=offer_data.get("start_date"),
                end_date=offer_data.get("end_date")
            )

        ActivityLog.objects.create(
            user=request.user,
            actor_type="admin",
            action="item_request_approved",
            description=(
                "The administrator approved "
                f"the vendor item request for {item_request.name}."
            ),
            related_url=f"/admin/vendorDashboard/item/{item.id}/",
        )

        # =========================
        # 🔴 FIXED LINE (CRASH FIX)
        # =========================
        ActivityLog.objects.create(
            user=vendor_user.user,   # 🔴 FIXED HERE
            actor_type="vendor",
            action="item_request_approved",
            description=(
                f"Your item request for {item_request.name} "
                f"was approved by the admin."
            ),
            related_url=f"/vendor/items/{item.id}/",
        )

        Notification.objects.create(
            user=item_request.created_by,
            title="Item Request Approved",
            message=f"Your request for {item_request.name} has been approved.",
            url=f"/vendor/items/{item.id}/",
        )

        subject = f"Your Item Request for {item_request.name} Was Approved"

        context = {
            "item": item,
            "vendor": item_request.vendor,
            "current_year": timezone.now().year
        }

        html_content = render_to_string(
            "emails/item_request_approved.html",
            context
        )

        text_content = (
            f"Good news! Your item request '{item_request.name}' was approved."
        )

        email = EmailMultiAlternatives(
            subject,
            text_content,
            settings.DEFAULT_FROM_EMAIL,
            [vendor_email]
        )

        email.attach_alternative(html_content, "text/html")
        email.send()

        return Response(
            {"message": "Request approved and item created.", "item_id": item.id},
            status=status.HTTP_200_OK
        )

    elif action == "deny":

        if item_request.status == "denied":
            return Response(
                {"error": "Request already denied."},
                status=status.HTTP_400_BAD_REQUEST
            )

        item_request.status = "denied"
        item_request.save()

        ActivityLog.objects.create(
            user=request.user,
            actor_type="admin",
            action="item_request_denied",
            description=f"The administrator declined the vendor request for {item_request.name}.",
            related_url=f"/admin/vendorDashboard/vendoritemrequest/{item_request.id}/",
        )

        # =========================
        # 🔴 FIXED LINE (CRASH FIX)
        # =========================
        ActivityLog.objects.create(
            user=vendor_user.user,   # 🔴 FIXED HERE
            actor_type="vendor",
            action="item_request_denied",
            description=f"Your item request for {item_request.name} was declined by the administrator.",
            related_url=f"/vendors-dashboard/vendor/items/requests/{item_request.id}/",
        )

        Notification.objects.create(
            user=vendor_user,
            title="Item Request Denied",
            message=f"Your request for {item_request.name} was declined by the administrator.",
            url=f"/vendors-dashboard/vendor/requests/{item_request.id}/",
        )

        current_year = timezone.now().year

        subject = f"Your Item Request for {item_request.name} Was Denied"

        context = {
            "item": item_request,
            "vendor": item_request.vendor,
            "current_year": current_year
        }

        html_content = render_to_string(
            "emails/item_request_denied.html",
            context
        )

        text_content = (
            f"Sorry, your item request '{item_request.name}' was denied."
        )

        email = EmailMultiAlternatives(
            subject,
            text_content,
            settings.DEFAULT_FROM_EMAIL,
            [vendor_email]
        )

        email.attach_alternative(html_content, "text/html")
        email.send()

        return Response({"message": "Request denied."}, status=status.HTTP_200_OK)

    return Response(
        {"error": "Invalid action"},
        status=status.HTTP_400_BAD_REQUEST
    )


# fetch data
from rest_framework import generics, permissions
from .models import VendorItemRequest
from .serializers import VendorItemRequestSerializer


class VendorItemRequestListView(generics.ListAPIView):
    """
    Admin view: List all vendor item requests
    Optional filter: ?status=pending / approved / denied
    """
    serializer_class = VendorItemRequestSerializer
    permission_classes = [permissions.IsAdminUser, IsAuthenticated]

    def get_queryset(self):
        queryset = VendorItemRequest.objects.all().order_by("-created_at")
        status_param = self.request.query_params.get("status")

        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset


## get price requests
class PriceChangeRequestListView(generics.ListAPIView):
    """
    Admin view: List all item price change requests.
    Optional filter: ?status=pending / approved
    """
    serializer_class = PriceChangeRequestSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        # Base queryset, newest first
        queryset = PriceChangeRequest.objects.all().order_by("-created_at")
        
        # Optional filtering by status
        status_param = self.request.query_params.get("status", "").lower()
        if status_param == "pending":
            queryset = queryset.filter(approved=False)
        elif status_param == "approved":
            queryset = queryset.filter(approved=True)
        
        return queryset      
    
# for admin notification 
class PriceChangeRequestDetailView(generics.RetrieveAPIView):
    queryset = PriceChangeRequest.objects.all()
    serializer_class = PriceChangeRequestSerializer
    permission_classes = [permissions.IsAdminUser]  # Only admins    
    


# temporary save item in draft befor approval
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

class VendorItemRequestDraftUpdateView(APIView):
    permission_classes = [permissions.IsAdminUser, IsAuthenticated]

    def put(self, request, pk):
        try:
            vendor_request = VendorItemRequest.objects.get(pk=pk)
        except VendorItemRequest.DoesNotExist:
            return Response({"error": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        draft_data = request.data.get("draft_item")
        if not draft_data:
            return Response({"error": "draft_item is required."}, status=status.HTTP_400_BAD_REQUEST)

        vendor_request.draft_item = draft_data
        vendor_request.save(update_fields=["draft_item"])

        serializer = VendorItemRequestSerializer(vendor_request)
        return Response(serializer.data, status=status.HTTP_200_OK)
    


    # price change requests
class CreatePriceChangeRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def post(self, request):
        item_id = request.data.get("item_id")
        new_price = request.data.get("new_price")
        reason = request.data.get("reason", "")

        # =========================
        # 1. VALIDATION
        # =========================
        if not item_id or not new_price:
            return Response(
                {"error": "Item ID and new price are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        item = get_object_or_404(Item, id=item_id)

        # Ensure vendor owns item (important security check)
        if item.vendor and item.vendor.user != request.user and item.created_by != request.user:
            return Response(
                {"error": "You are not allowed to modify this item."},
                status=status.HTTP_403_FORBIDDEN
            )

        # =========================
        # 2. PREVENT DUPLICATE REQUESTS
        # =========================
        if PriceChangeRequest.objects.filter(
            item=item,
            approved=False
        ).exists():
            return Response(
                {"error": "There is already a pending price change request for this item."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # =========================
        # 3. SAFE PRICE CONVERSION
        # =========================
        try:
            new_price = Decimal(str(new_price))
            if new_price <= 0:
                return Response(
                    {"error": "Price must be greater than zero."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (InvalidOperation, TypeError):
            return Response(
                {"error": "Invalid price format."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # =========================
        # 4. CREATE REQUEST
        # =========================
        price_request = PriceChangeRequest.objects.create(
            item=item,
            requested_by=request.user,
            new_price=new_price,
            reason=reason
        )

        current_year = timezone.now().year

        # =========================
        # 5. ACTIVITY LOG (ADMIN BULK OPTIMIZED)
        # =========================
        admin_users = User.objects.filter(is_staff=True)

        for admin in admin_users:
            ActivityLog.objects.create(
                user=admin,
                actor_type="admin",
                action="Price Change Requested",
                item=item,
                description=(
                    "A vendor requested a price change "
                    f"for {item.name}. Reason: {reason or 'No reason provided'}"
                ),
                related_url=f"/admin/vendorDashboard/vendoritems/{item.id}/"
            )

        # Vendor activity log
        ActivityLog.objects.create(
            user=request.user,
            actor_type="vendor",
            action="Price Change Requested",
            description=(
                "You requested a price change "
                f"for {item.name}. Reason: {reason or 'No reason provided'}"
            ),
            related_url=f"/vendor/vendorDashboard/vendoritems/{item.id}/"
        )

        # =========================
        # 6. NOTIFICATIONS (ADMINS)
        # =========================
        admins = User.objects.filter(is_staff=True)

        for admin in admins:
            Notification.objects.create(
                user=admin,
                title="New Price Change Request",
                message=(
                    "A vendor submitted a price change request "
                    f"for {item.name}. Reason: {reason or 'No reason provided'}"
                ),
                url=f"/admin/vendorDashboard/vendoritemPricerequest/{price_request.id}/",
            )

            # Email admin
            html_content = render_to_string(
                "emails/price_change_request.html",
                {
                    "admin": admin,
                    "item": item,
                    "price_request": price_request,
                    "vendor": request.user,
                    "current_year": current_year,
                }
            )
            text_content = strip_tags(html_content)

            email = EmailMultiAlternatives(
                subject=f"Price Change Request for {item.name}",
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[admin.email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send()

        # =========================
        # 7. EMAIL VENDOR CONFIRMATION
        # =========================
        html_content = render_to_string(
            "emails/vendor_price_change_request.html",
            {
                "vendor": request.user,
                "item": item,
                "price_request": price_request,
            }
        )

        text_content = strip_tags(html_content)

        email = EmailMultiAlternatives(
            subject=f"Price Change Request Submitted for {item.name}",
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[request.user.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()

        return Response(
            {"message": "Price change request submitted successfully."},
            status=status.HTTP_201_CREATED
        )

    

    # price change approval
class ApprovePriceChangeRequestView(APIView):
    permission_classes = [permissions.IsAdminUser, IsAuthenticated]

    @transaction.atomic
    def post(self, request, request_id):
        price_request = get_object_or_404(
            PriceChangeRequest.objects.select_for_update(),
            id=request_id
        )

        if price_request.approved:
            return Response(
                {"error": "This request is already approved."},
                status=status.HTTP_400_BAD_REQUEST
            )

        item = price_request.item
        old_price = item.price

        # =========================
        # 1. UPDATE ITEM SAFELY
        # =========================
        item._allow_price_update = True  # unlock model restriction
        item.price = price_request.new_price
        item.save()

        # =========================
        # 2. MARK REQUEST APPROVED
        # =========================
        price_request.approved = True
        price_request.approved_at = timezone.now()
        price_request.approved_by = request.user
        price_request.save()

        current_year = timezone.now().year

        # =========================
        # 3. ACTIVITY LOG (ADMIN SIDE)
        # =========================
        admin_users = User.objects.filter(is_staff=True)

        for admin in admin_users:
            ActivityLog.objects.create(
                user=admin,
                actor_type="admin",
                action="Price Change Approved",
                description=(
                    f"The administrator approved the new price {price_request.new_price} for "
                    f"{item.name}."
                ),
                related_url=f"/admin/vendorDashboard/vendoritems/{item.id}/"
            )

        # =========================
        # 4. ACTIVITY LOG (VENDOR SIDE)
        # =========================
        ActivityLog.objects.create(
            user=price_request.requested_by,
            actor_type="vendor",
            action="Price Change Approved",
            description=(
                f"Your price change request for {item.name} "
                f"has been approved. New price: {price_request.new_price}"
            ),
            related_url=f"/vendor/vendorDashboard/vendoritems/{item.id}/"
        )

        # =========================
        # 5. OPTIONAL: PRICE HISTORY (RECOMMENDED)
        # =========================
        ItemPriceHistory.objects.create(
            item=item,
            old_price=old_price,
            new_price=price_request.new_price,
            changed_by=request.user,
            reason=price_request.reason
        )

        # =========================
        # 6. NOTIFICATION (VENDOR)
        # =========================
        Notification.objects.create(
            user=price_request.requested_by,
            title="Price Change Request Approved",
            message=(
                f"Your request for {item.name} has been approved. "
                f"The new price is {item.price}."
            ),
            url=f"/vendors-dashboard/vendor/items/{item.id}/"
        )

        # =========================
        # 7. EMAIL NOTIFICATION (VENDOR)
        # =========================
        html_content = render_to_string(
            "emails/vendor_price_change_approved.html",
            {
                "vendor": price_request.requested_by,
                "item": item,
                "price_request": price_request,
                "current_year": current_year,
            }
        )

        text_content = strip_tags(html_content)

        email = EmailMultiAlternatives(
            subject=f"Price Change Approved for {item.name}",
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[price_request.requested_by.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()

        return Response(
            {"message": "Price change approved and vendor notified."},
            status=status.HTTP_200_OK
        )
    


# save item to the draft before approval
@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsAdminUser])
def save_vendor_item_draft(request, pk):
    vendor_request = get_object_or_404(VendorItemRequest, pk=pk)

    draft_data = request.data.get("draft_item")

    if not isinstance(draft_data, dict):
        return Response(
            {"error": "draft_item must be an object"},
            status=400
        )

    vendor_request.draft_item = draft_data
    vendor_request.save(update_fields=["draft_item"])

    return Response({
        "message": "Draft saved successfully",
        "draft_item": vendor_request.draft_item
    })