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

User = get_user_model()

class VendorItemRequestDetailView(generics.RetrieveAPIView):
    queryset = VendorItemRequest.objects.all()
    serializer_class = VendorItemRequestSerializer
    permission_classes = [permissions.IsAuthenticated]



# ----------------------------
# Vendor submits item request
# ----------------------------
class VendorItemRequestCreateView(generics.CreateAPIView):
    serializer_class = VendorItemRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        vendor = Vendor.objects.get(user=self.request.user)
        item_request = serializer.save(
            vendor=vendor,
            created_by=self.request.user
        )
        

        # 🔹 Step 1: Send Email to Admin
        subject = f"New Vendor Item Request: {item_request.name}"
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = [settings.EMAIL_HOST_USER]

        context = {"vendor": vendor, "item": item_request, "user": self.request.user}

        html_content = render_to_string("emails/vendor_item_request.html", context)
        text_content = (
            f"A new item request was submitted by {vendor.first_name}.\n\n"
            f"Item: {item_request.name}\n"
            f"Price: {item_request.price}\n"
            f"Description: {item_request.description}"
        )

        email = EmailMultiAlternatives(subject, text_content, from_email, to_email)
        email.attach_alternative(html_content, "text/html")
        email.send()

        # 🔹 Step 2: Log activity
        # 2️⃣ Admin-side log for each admin
        for admin in User.objects.filter(is_superuser=True):
            ActivityLog.objects.create(
                user=admin,  # <-- admin now owns this log
                actor_type="admin",
                action="vendor_item_request_received",
                description=f"Vendor {vendor.username} submitted a new item request: {item_request.name}",
                related_url=f"/admin/vendorDashboard/vendoritemrequest/{item_request.id}/",
            )

        ActivityLog.objects.create(
            user=self.request.user,
            actor_type="vendor",
            action="item_request_created",
            description=f"You have submitted a new item request: {item_request.name}",
            related_url=f"/admin/vendorDashboard/vendoritemrequest/{item_request.id}/",
        )

        # 🔹 Step 3: Notify admins
        for admin in User.objects.filter(is_superuser=True):
            Notification.objects.create(
                user=admin,
                title="New Vendor Item Request",
                message=f"{vendor.first_name} submitted an item request: {item_request.name}",
                url=f"/vendorDashboard/vendoritemrequest/{item_request.id}/",
            )

            


# ----------------------------
# Admin approves or denies
# ----------------------------
@api_view(["POST"])
@permission_classes([permissions.IsAdminUser])
def approve_request(request, pk):
    try:
        item_request = VendorItemRequest.objects.get(pk=pk)
    except VendorItemRequest.DoesNotExist:
        return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get("action")  # "approve" or "deny"
    vendor_user = item_request.vendor
    vendor_email = vendor_user.email

    if action == "approve":
        item_request.status = "approved"
        item_request.save()

        draft_data = item_request.draft_item or {}

        # ✅ Convert string fields to instances
        # ✅ Convert string fields to instances
        department_name = draft_data.get("department")
        category_name = draft_data.get("category")
        subcategory_name = draft_data.get("subcategory")
        section_name = draft_data.get("section")

        try:
            department_instance = Department.objects.get(name=department_name) if department_name else None
        except Department.DoesNotExist:
            return Response({"error": f"Department '{department_name}' not found."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            category_instance = Category.objects.get(name=category_name) if category_name else None
        except Category.DoesNotExist:
            return Response({"error": f"Category '{category_name}' not found."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subcategory_instance = SubCategory.objects.get(name=subcategory_name) if subcategory_name else None
        except SubCategory.DoesNotExist:
            return Response({"error": f"Subcategory '{subcategory_name}' not found."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            section_instance = Section.objects.get(name__iexact=section_name) if section_name else None
        except Section.DoesNotExist:
            return Response({"error": f"Section '{section_name}' not found."}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Create the Item with section included
        raw_image = draft_data.get("image") or item_request.image.name

        # Clean up image path (remove http:// and /media/)
        if isinstance(raw_image, str):
            if raw_image.startswith(settings.MEDIA_URL):
                raw_image = raw_image.replace(settings.MEDIA_URL, "", 1)
            elif raw_image.startswith(f"http://127.0.0.1:8000{settings.MEDIA_URL}"):
                raw_image = raw_image.replace(f"http://127.0.0.1:8000{settings.MEDIA_URL}", "", 1)

        # ✅ Handle returnable field from form, default to True
        returnable_value = draft_data.get("returnable", item_request.returnable if hasattr(item_request, "returnable") else True)

        offer_data = draft_data.get("offer") 

        # convert decimal
        def to_decimal(value, default=Decimal("0.0")):
            try:
                return Decimal(str(value))
            except (InvalidOperation, TypeError, ValueError):
                return default      

        item = Item.objects.create(
            vendor=vendor_user,
            created_by=item_request.created_by,
            name=draft_data.get("name", item_request.name),
            description=draft_data.get("description", item_request.description),
            price=to_decimal(draft_data.get("price", item_request.price)),
            discount_price=to_decimal(draft_data.get("discount_price", 0)),
            in_stock=int(draft_data.get("in_stock", 0)),
            item_attribute=draft_data.get("Item_attribute",""),
            image=raw_image,
            department=department_instance,
            category=category_instance,
            subcategory=subcategory_instance,
            section=section_instance,
            available=True,
            returnable=bool(returnable_value),
        )       

        if offer_data:
            Offer.objects.create(
                item=item,
                discount_percentage=to_decimal(offer_data.get("discount_percentage", 0)),
                start_date=offer_data.get("start_date"),
                end_date=offer_data.get("end_date")
            )




        # ✅ Log ADMIN activity (for admin dashboard)
        ActivityLog.objects.create(
            user=request.user,
            actor_type="admin",
            action="item_request_approved",
            description=f"Admin '{request.user.username}' approved vendor item request '{item_request.name}'.",
            related_url=f"/admin/vendorDashboard/item/{item.id}/",
        )

        # ✅ Log VENDOR activity (for vendor dashboard)
        ActivityLog.objects.create(
            user=vendor_user,
            actor_type="vendor",
            action="item_request_approved",
            description=f"Your item request '{item_request.name}' was approved by the admin.",
            related_url=f"/vendor/items/{item.id}/",
        )



        # 🔹 Notify vendor
        Notification.objects.create(
            user=item_request.created_by,
            title="Item Request Approved",
            message=f"Your request for '{item_request.name}' has been approved and published.",
            url=f"/vendor/items/{item.id}/",
        )

        # 🔹 Send email
        subject = f"Your Item Request '{item_request.name}' Was Approved"
        context = {"item": item, "vendor": item_request.vendor, 'current_year': timezone.now().year}
        html_content = render_to_string("emails/item_request_approved.html", context)
        text_content = f"Good news! Your item request '{item_request.name}' was approved."
        email = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [vendor_email])
        email.attach_alternative(html_content, "text/html")
        email.send()

        return Response({"message": "Request approved and item created.", "item_id": item.id}, status=status.HTTP_200_OK)

    elif action == "deny":
        item_request.status = "denied"
        item_request.save()

        # 🔹 Log denial
       # 🔹 Log both admin and vendor for denial too
        ActivityLog.objects.create(
            user=request.user,
            actor_type="admin",
            action="item_request_denied",
            description=f"Admin '{request.user.username}' denied vendor request '{item_request.name}'.",
            related_url=f"/admin/vendorDashboard/vendoritemrequest/{item_request.id}/",
        )

        #activity log for vendor
        ActivityLog.objects.create(
            user=vendor_user,
            actor_type="vendor",
            action="item_request_denied",
            description=f"Your item request '{item_request.name}' was denied by admin.",
            related_url=f"/vendor/items/requests/{item_request.id}/",
        )

        # 🔹 Notify vendor
        Notification.objects.create(
            user=vendor_user,
            title="Item Request Denied",
            message=f"Your request for '{item_request.name}' was denied by the admin.",
            url=f"/vendors-dashboard/vendor/requests/{item_request.id}/",
        )

        # 🔹 Send email
        subject = f"Your Item Request '{item_request.name}' Was Denied"
        context = {"item": item_request, "vendor": item_request.vendor}
        html_content = render_to_string("emails/item_request_denied.html", context)
        text_content = f"Sorry, your item request '{item_request.name}' was denied."
        email = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [vendor_email])
        email.attach_alternative(html_content, "text/html")
        email.send()

        return Response({"message": "Request denied."}, status=status.HTTP_200_OK)

    return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)



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
    permission_classes = [permissions.IsAdminUser]

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
    permission_classes = [permissions.IsAdminUser]

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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        item_id = request.data.get("item_id")
        new_price = request.data.get("new_price")
        reason = request.data.get("reason")  # <-- add this

        if not item_id or not new_price:
            return Response({"error": "Item ID and new price are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_price = float(new_price)
            if new_price <= 0:
                return Response({"error": "Price must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"error": "Invalid price format."}, status=status.HTTP_400_BAD_REQUEST)

        item = get_object_or_404(Item, id=item_id)

        # Create a new price change request (with reason)
        price_request = PriceChangeRequest.objects.create(
            item=item,
            requested_by=request.user,
            new_price=new_price,
            reason=reason   # <-- include reason here
        )

        # Activity Log
        for admin in User.objects.filter(is_superuser=True):
            ActivityLog.objects.create(
                user=admin,
                actor_type="admin",
                action="Price Change Requested",
                item= price_request.item,
                description=f"Vendor {price_request.requested_by.vendor.first_name} requested new price {new_price} for item '{item.name}'. Reason: {reason or 'N/A'}",
                related_url=f"/admin/vendorDashboard/vendoritems/{item.id}/"
            )

        ActivityLog.objects.create(
                user=price_request.requested_by,
                actor_type="vendor",
                action="Price Change Requested",
                description=f"You have requested new price change, {new_price} for item '{item.name}'. Reason: {reason or 'N/A'}",
                related_url=f"/vendor/vendorDashboard/vendoritems/{item.id}/"
            )    


        # In-app notification to admins
        admins = User.objects.filter(is_staff=True)
        for admin in admins:
            Notification.objects.create(
                user=admin,
                title="New Price Change Request",
                message=f"{request.user.get_full_name() or request.user.username} submitted a price change request for '{item.name}' (Reason: {reason or 'N/A'}).",
                url=f"/admin/vendorDashboard/vendoritemPricerequest/{price_request.id}/",
            )

            # Email notification to admin
            subject = f"Price Change Request for {item.name}"
            html_content = render_to_string(
                "emails/price_change_request.html",
                {"admin": admin, "item": item, "price_request": price_request, "vendor": request.user}
            )
            text_content = strip_tags(html_content)
            email = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [admin.email])
            email.attach_alternative(html_content, "text/html")
            email.send()

        # Email notification to vendor
        subject = f"Price Change Request Submitted for {item.name}"
        html_content = render_to_string(
            "emails/vendor_price_change_request.html",
            {"vendor": request.user, "item": item, "price_request": price_request}
        )
        text_content = strip_tags(html_content)
        email = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [request.user.email])
        email.attach_alternative(html_content, "text/html")
        email.send()

        return Response({"message": "Price change request submitted successfully."}, status=status.HTTP_201_CREATED)

    

    # price change approval
class ApprovePriceChangeRequestView(APIView):
    permission_classes = [permissions.IsAdminUser]  # Only admins

    def post(self, request, request_id):
        price_request = get_object_or_404(PriceChangeRequest, id=request_id)

        if price_request.approved:
            return Response({"error": "This request is already approved."}, status=400)

        # Update item price
        item = price_request.item
        item.price = price_request.new_price
        item.save()

        # Mark request as approved
        price_request.approved = True
        price_request.approved_at = timezone.now()
        price_request.approved_by = request.user
        price_request.save()

        # Activity Log
        for admin in User.objects.filter(is_staff=True):
            ActivityLog.objects.create(
                user=admin,
                actor_type="admin",
                action="Price Change Approved",
                description=(
                    f"Approved new price {price_request.new_price} for item "
                    f"'{item.name}' requested by {price_request.requested_by.username}."
                ),
                related_url=f"/admin/vendorDashboard/vendoritems/{item.id}/"  # link to the approved item
            )

        ActivityLog.objects.create(
                user=admin,
                actor_type="vendor",
                action="Price Change Approved",
                description=(
                    f"Price Change for item "
                    f"'{item.name}' has been approved."
                ),
                related_url=f"/vendor/vendorDashboard/vendoritems/{item.id}/"  # link to the approved item
            )    




        # In-app Notification for Vendor
        Notification.objects.create(
            user=price_request.requested_by,
            title="Price Change Request Approved",
            message=f"Your request for '{item.name}' has been approved. The new price is {item.price}.",
            url=f"/vendors-dashboard/vendor/items/{item.id}/"
        )

        # Optional: Email notification to Vendor
        html_content = render_to_string(
            "emails/vendor_price_change_approved.html",
            {"vendor": price_request.requested_by, "item": item, "price_request": price_request, 'current_year': timezone.now().year}
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

        return Response({"message": "Price change approved and vendor notified."}, status=200)  
 

