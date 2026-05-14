from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from ReactSerializers.models import Item
from core.models import Notification
from .Serializer import NotificationSerializer, ItemSerializer, ReviewSerializer, ReactionSerializer
from vendorDashboard.models import Vendor
from shop.models import  Review, Reaction
from rest_framework.parsers import MultiPartParser, FormParser
from core.Serializer import *
from .UserVisitorSerializers import *
import bleach
from oder.views import IsAuthenticatedOrVisitor
from .CategorySerializers import SectionSerializerCat, CategorySerializerCat
from django.db.models import Prefetch
from oder.views import IsAuthenticatedOrVisitor

from rest_framework import generics



# -------------------------------
# Sanitizer
# -------------------------------
def sanitize(value):
    if isinstance(value, str):
        return bleach.clean(value)
    return value

# -------------------------------
# Home view
# -------------------------------
def home(request):
    return HttpResponse("Hello from the core app!")

# -------------------------------
# All notifications (admin)
# -------------------------------
class AllNotificationsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        notifications = Notification.objects.all().order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        data = serializer.data
        # Sanitize string fields in notifications
        for n in data:
            for k, v in n.items():
                n[k] = sanitize(v)
        return Response(data)

# -------------------------------
# Filter items
# -------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def filtered_items(request):
    items = Item.objects.all()

    # Changed from 'type' to 'section' filter
    section = sanitize(request.GET.get('section', ''))
    if section:
        items = items.filter(section__name__iexact=section)

    department = sanitize(request.GET.get('department', ''))
    if department:
        items = items.filter(department__name__iexact=department)

    category = sanitize(request.GET.get('category', ''))
    if category:
        items = items.filter(category__name__iexact=category)

    min_price = request.GET.get('minPrice')
    if min_price:
        items = items.filter(price__gte=min_price)

    max_price = request.GET.get('maxPrice')
    if max_price:
        items = items.filter(price__lte=max_price)

    sort = sanitize(request.GET.get('sort', ''))
    if sort == 'low-high':
        items = items.order_by('price')
    elif sort == 'high-low':
        items = items.order_by('-price')
    elif sort == 'newest':
        items = items.order_by('-created_at')
    elif sort == 'oldest':
        items = items.order_by('created_at')

    size = sanitize(request.GET.get('size', ''))
    if size:
        items = [item for item in items if size in item.sizes]

    color = sanitize(request.GET.get('color', ''))
    if color:
        items = [item for item in items if color in item.colors]

    serializer = ItemSerializer(items, many=True)
    data = serializer.data
    # Sanitize string fields in serialized items
    for item in data:
        for k, v in item.items():
            item[k] = sanitize(v)

    return Response(data)




# -------------------------------
# fetch depart. cat. subcat
# -------------------------------
class HierarchicalDataView(APIView):
    def get(self, request):
        sections = Section.objects.prefetch_related(
            'departments__categories__subcategories'
        ).all()
        brands = Brand.objects.all()

        sections_data = SectionSerializerCat(sections, many=True).data
        brands_data = BrandSerializer(brands, many=True).data

        return Response({
            "sections": sections_data,
            "brands": brands_data,
        })
    

# -------------------------------
# item fetch item and category
# -------------------------------
class CategoryListWithItems(generics.ListAPIView):
    serializer_class = CategorySerializerCat

    def get_queryset(self):
        # Prefetch items inside subcategories
        subcategory_qs = SubCategory.objects.prefetch_related(
            Prefetch(
                'items',  # reverse relation from SubCategory to Item
                queryset=Item.objects.filter(available=True),  # filter if needed
                to_attr='prefetched_items'  # attach prefetched items here
            )
        )

        # Prefetch subcategories with items in categories
        return Category.objects.prefetch_related(
            Prefetch('subcategories', queryset=subcategory_qs, to_attr='prefetched_subcategories')
        )


class ItemDetailView(generics.RetrieveAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer    

# -------------------------------
# item fetch bu sub category
# -------------------------------
@api_view(["GET"])
def products_by_subcategory(request, subcategory_id):
    products = Item.objects.filter(subcategory_id=subcategory_id, available=True)

    serializer = ItemSerializer(products, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# -------------------------------
# Review viewset
# -------------------------------
class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrVisitor]

    def get_queryset(self):
        item_id = self.kwargs.get("item_id")
        return Review.objects.filter(item_id=item_id).order_by("-created_at")

    def perform_create(self, serializer):
        item_id = self.kwargs.get('item_id')

        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user, item_id=item_id)
        else:
            serializer.save(user=None, item_id=item_id)




# -------------------------------
# Reaction viewset
# -------------------------------
class ReactionViewSet(viewsets.ModelViewSet):
    queryset = Reaction.objects.all()
    serializer_class = ReactionSerializer
    permission_classes = [IsAuthenticatedOrVisitor]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        review_id = self.request.data.get("review")
        reaction_type = self.request.data.get("reaction_type")

        # Ensure review exists
        try:
            review = Review.objects.get(id=review_id)
        except Review.DoesNotExist:
            raise serializers.ValidationError({"review": "Review does not exist."})

        # Check if user/visitor already reacted
        existing = Reaction.objects.filter(review=review, user=user)
        if existing.exists():
            # Update existing reaction
            existing.update(reaction_type=reaction_type)
        else:
            # Create new reaction
            serializer.save(review=review, user=user, reaction_type=reaction_type)



# -------------------------------
# User data endpoint
# -------------------------------
def user_data(request):
    username = sanitize(request.user.username) if request.user.is_authenticated else 'Guest'
    is_admin = request.user.is_superuser if request.user.is_authenticated else False
    user_profile_picture = (
        request.user.profile.profile_picture.url 
        if request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.profile_picture 
        else None
    )

    vendor = Vendor.objects.filter(user=request.user).first() if request.user.is_authenticated else None
    vendor_username = sanitize(vendor.username) if vendor else 'No Vendor'
    vendor_profile_picture = vendor.profile_picture.url if vendor and vendor.profile_picture else None

    return Response({
        'username': username,
        'vendor_username': vendor_username,
        'is_admin': is_admin,
        'user_profile_picture': user_profile_picture,
        'vendor_profile_picture': vendor_profile_picture,
        'is_vendor': bool(vendor)
    })


# notifications
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vendor_notifications(request):
    user = request.user
    if hasattr(user, "vendor"):  # ✅ Ensure user is a vendor
        notifications = Notification.objects.filter(user=user).order_by("-created_at")
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)
    return Response({"detail": "Not a vendor"}, status=403)



# view item activities
class ActivityLogViewSet(viewsets.ModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ActivityLog.objects.all().order_by('-timestamp')
        item_id = self.request.query_params.get("item")
        if item_id:
            queryset = queryset.filter(item_id=item_id)
        return queryset

    # ✅ DELETE a single log
    @action(detail=True, methods=["delete"], url_path="delete")
    def delete_single_log(self, request, pk=None):
        try:
            log = self.get_object()  # gets the ActivityLog instance by pk
            log.delete()
            return Response({"message": "Log deleted"}, status=status.HTTP_204_NO_CONTENT)
        except ActivityLog.DoesNotExist:
            return Response({"error": "Log not found"}, status=status.HTTP_404_NOT_FOUND)

    # ✅ DELETE logs for a specific item
    @action(detail=False, methods=["delete"], url_path="clear-item-logs")
    def clear_item_logs(self, request):
        item_id = request.query_params.get("item")
        if not item_id:
            return Response({"error": "Item ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        count, _ = ActivityLog.objects.filter(item_id=item_id).delete()
        return Response({"message": f"{count} logs deleted for item ID {item_id}"}, status=status.HTTP_200_OK)

    # ✅ DELETE all activity logs
    @action(detail=False, methods=["delete"], url_path="clear-all-logs")
    def clear_all_logs(self, request):
        count, _ = ActivityLog.objects.all().delete()
        return Response({"message": f"{count} total logs deleted successfully"}, status=status.HTTP_200_OK)
    


# -------------------------------
# get & update userprofile
# -------------------------------

class UserAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Ensure the profile exists
        profile, _ = Profile.objects.get_or_create(user=user)

        # Ensure related records exist
        wallet, _ = Wallet.objects.get_or_create(user=user)
        referral, _ = Referral.objects.get_or_create(referrer=user)
        voucher, _ = Voucher.objects.get_or_create(user=user)

         # ✅ Only get completed orders
        completed_orders = (
            Order.objects.filter(user=user, status="completed")
            .order_by("-created_at")
        )

        order_serializer = OrderSerializer(
            completed_orders, many=True, context={"request": request}
        )

        # Serialize everything
        user_serializer = UserSerializer(user)
        profile_serializer = ProfileSerializer(profile, context={'request': request})
        wallet_serializer = WalletSerializer(wallet)
        referral_serializer = ReferralSerializer(referral)
        voucher_serializer = VoucherSerializer(voucher)

        # Combine into single response
        return Response({
            "success": True,
            "user": user_serializer.data,
            "profile": profile_serializer.data,
            "wallet": wallet_serializer.data,
            "referrals": referral_serializer.data,
            "voucher": voucher_serializer.data,
            "orders": order_serializer.data,
        })

class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticatedOrVisitor]
    parser_classes = [MultiPartParser, FormParser]  # ✅ handle files

    def post(self, request):
        print("FILES:", request.FILES)  # 👈 Debug
        print("DATA:", request.data)

        user = request.user
        profile, _ = Profile.objects.get_or_create(user=user)

        # Update user basic info
        user.first_name = request.data.get("first_name", user.first_name)
        user.last_name = request.data.get("last_name", user.last_name)
        user.email = request.data.get("email", user.email)
        user.save()

         # ✅ Update profile fields
        profile.date_of_birth = request.data.get("date_of_birth", profile.date_of_birth)
        profile.location = request.data.get("location", profile.location)
        profile.phone_number = request.data.get("phone_number", profile.phone_number)
        profile.address = request.data.get("address", profile.address)
        profile.city = request.data.get("city", profile.city)
        profile.country = request.data.get("country", profile.country)

        # ✅ Handle uploaded file
        if "profile_picture" in request.FILES:
            profile.profile_picture = request.FILES["profile_picture"]

        profile.save()

        return Response({
            "success": True,
            "user": UserSerializer(user).data,
            "profile": ProfileSerializer(profile).data,
            "message": "Profile updated successfully."
        })


# fetch odrder for visitorand user

@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])  
def user_account_view(request):
    """
    Fetch user or visitor account details.
    Includes full order info (order + items) for both authenticated and visitor users.
    """

    user = None
    visitor = None

    # 1️⃣ Check if user is authenticated
    if request.user and request.user.is_authenticated:
        user = request.user
    else:
        # 2️⃣ Identify visitor
        visitor_id = request.COOKIES.get("visitorId")
        if not visitor_id:
            return Response(
                {"error": "Visitor ID missing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

       

    # 3️⃣ Fetch related info
    if user:
        profile = Profile.objects.filter(user=user).first()
        wallet = Wallet.objects.filter(user=user).first()
        vouchers = Voucher.objects.filter(user=user, active=True)
        referral = Referral.objects.filter(referrer=user).first()
        orders = Order.objects.filter(user=user, status="completed").order_by("-created_at")
    else:
        profile = None
        wallet = None
        vouchers = []
        referral = None
        orders = Order.objects.filter(visitor_id=visitor_id, status="completed").order_by("-created_at")


    # 4️⃣ Build order data (including items)
    order_data = []
    for order in orders:
        order_items = OderItem.objects.filter(order=order)
        order_data.append({
            **OrderSerializer(order).data,
            "items": OrderItemSerializer(order_items, many=True).data,
        })

    # 5️⃣ Combine all into response
    data = {
        "is_authenticated": bool(user),
        "user": {
            "id": user.id if user else None,
            "first_name": getattr(user or visitor, "first_name", None),
            "last_name": getattr(user or visitor, "last_name", None),
            "email": getattr(user or visitor, "email", None),
        },
        "profile": ProfileSerializer(profile).data if profile else None,
        "wallet": WalletSerializer(wallet).data if wallet else None,
        "vouchers": VoucherSerializer(vouchers, many=True).data if vouchers else [],
        "referral": ReferralSerializer(referral).data if referral else None,
        "orders": order_data,
    }

    return Response(data, status=status.HTTP_200_OK)



# user fetch notifications
@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def get_notifications(request):
    user = request.user if request.user.is_authenticated else None
    visitor_id = request.COOKIES.get("visitorId")

    if user:
        notifications = Notification.objects.filter(user=user).order_by("-created_at")
    elif visitor_id:
        notifications = Notification.objects.filter(visitor_id=visitor_id).order_by("-created_at")
    else:
        notifications = Notification.objects.none()

    serializer = NotificationSerializer(notifications, many=True)
    return Response({"results": serializer.data})


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def get_activity(request):
    user = request.user if request.user.is_authenticated else None
    visitor_id = request.COOKIES.get("visitorId")

    if user:
        activities = ActivityLog.objects.filter(user=user).order_by("-timestamp")
    elif visitor_id:
        activities = ActivityLog.objects.filter(visitor_id=visitor_id).order_by("-timestamp")
    else:
        activities = ActivityLog.objects.none()

    serializer = ActivityLogSerializer(activities, many=True)
    return Response({"results": serializer.data})



# calendar view
class UserCalendarEventsView(generics.ListCreateAPIView):
    serializer_class = CalendarEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return events for the logged-in user
        return CalendarEvent.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Assign the logged-in user when creating an event
        serializer.save(user=self.request.user)