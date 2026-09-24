from django.conf import settings
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from ReactSerializers.models import Item, ItemView
from core.models import Notification, EmailLog, SupportMessage, AboutPage, SearchEvent
from .Serializer import NotificationSerializer, ItemSerializer, ReviewSerializer, ReactionSerializer
from vendorDashboard.models import Vendor
from shop.models import  Review, Reaction
from rest_framework.parsers import MultiPartParser, FormParser
from core.Serializer import *
from .UserVisitorSerializers import *
import bleach # type: ignore
from order.views import IsAuthenticatedOrVisitor
from .CategorySerializers import SectionSerializerCat, CategorySerializerCat
from django.db.models import F, Prefetch, Count, Min
from order.views import IsAuthenticatedOrVisitor
from django.core.mail import send_mail
from rest_framework import generics
from django.utils import timezone
from django.utils.timezone import now
from datetime import timedelta
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string           
from datetime import datetime
from django.core.paginator import Paginator
import random
import string
import logging
import uuid
from shop.sanitizers import sanitize_rich_text

logger = logging.getLogger(__name__)



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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Administrators can review the full notification stream. Vendors and
        # customers only receive notifications addressed to their own account.
        notifications = Notification.objects.all().order_by("-created_at")
        if not request.user.is_staff and not request.user.is_superuser:
            notifications = notifications.filter(user=request.user)
        serializer = NotificationSerializer(notifications, many=True)
        data = serializer.data
        # Sanitize string fields in notifications
        for n in data:
            for k, v in n.items():
                n[k] = sanitize(v)
        return Response(data)

# -------------------------------
# About page content
# -------------------------------
def _about_payload(request, about):
    return {
        "id": about.id,
        "hero_image": request.build_absolute_uri(about.hero_image.url) if about.hero_image else None,
        "hero_title": about.hero_title,
        "hero_subtitle": about.hero_subtitle,
        "about_title": about.about_title,
        "impact_title": about.impact_title,
        "impact_content": about.impact_content,
        "products_title": about.products_title,
        "products_content": about.products_content,
        "materials_content": about.materials_content,
        "updated_at": about.updated_at,
    }


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def admin_about(request):
    about, _ = AboutPage.objects.get_or_create(pk=1)

    if request.method == "GET":
        return Response(_about_payload(request, about))

    if not request.user.is_authenticated or not request.user.is_staff:
        return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

    for field in (
        "hero_title",
        "hero_subtitle",
        "about_title",
        "impact_title",
        "impact_content",
        "products_title",
        "products_content",
        "materials_content",
    ):
        if field in request.data:
            value = request.data.get(field, "")
            if field.endswith("_content"):
                value = sanitize_rich_text(value)
            setattr(about, field, value)

    if request.FILES.get("hero_image"):
        about.hero_image = request.FILES["hero_image"]

    about.save()
    return Response(_about_payload(request, about))


# -------------------------------
# Customer support
# -------------------------------
SUPPORT_CATEGORIES = [
    ("accounts", "Accounts"),
    ("login", "Logging in"),
    ("registration", "Registration / OTP"),
    ("orders", "Orders"),
    ("payments", "Payments"),
    ("shipping", "Shipping & delivery"),
    ("returns", "Returns & refunds"),
    ("products", "Products"),
    ("vendors", "Vendor / seller questions"),
    ("promotions", "Promotions & discounts"),
    ("technical", "Website / technical issue"),
    ("other", "Other"),
]


def _support_payload(ticket):
    return {
        "id": ticket.id,
        "name": ticket.name,
        "email": ticket.email,
        "subject": ticket.subject,
        "category": ticket.category,
        "message": ticket.message,
        "support_reply": ticket.support_reply,
        "status": ticket.status,
        "message_id": ticket.message_id,
        "created_at": ticket.created_at,
        "answered_at": ticket.answered_at,
    }


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def support_messages(request):
    if request.method == "GET":
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        tickets = SupportMessage.objects.all().order_by("-created_at")
        return Response([_support_payload(ticket) for ticket in tickets])

    email = str(request.data.get("email") or "").strip()
    subject = str(request.data.get("subject") or "").strip()
    message = str(request.data.get("message") or "").strip()
    category = str(request.data.get("category") or "").strip()
    name = str(request.data.get("name") or "").strip()

    if not email or not subject or not message:
        return Response(
            {"detail": "Email, subject, and message are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError

    try:
        validate_email(email)
    except ValidationError:
        return Response({"email": ["Enter a valid email address."]}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user if request.user.is_authenticated else None
    visitor_id = request.COOKIES.get("visitorId") if not user else None
    new_visitor_id = None
    if not user and not visitor_id:
        new_visitor_id = uuid.uuid4().hex
        visitor_id = new_visitor_id

    ticket = SupportMessage.objects.create(
        user=user,
        visitor_id=visitor_id,
        name=name[:255],
        email=email,
        subject=subject[:255],
        category=category[:120],
        message=message,
    )

    # Keep support staff informed when the deployment has an email backend configured.
    try:
        from django.conf import settings
        support_recipient = (getattr(settings, "SUPPORT_EMAIL", None) or getattr(settings, "EMAIL_HOST_USER", None) or getattr(settings, "DEFAULT_FROM_EMAIL", None))
        if support_recipient:
            send_mail(
                f"New Maa Mara Market support request: {ticket.subject}",
                f"From: {ticket.email}\nCategory: {ticket.category or 'Other'}\n\n{ticket.message}",
                getattr(settings, "DEFAULT_FROM_EMAIL", support_recipient),
                [support_recipient],
                fail_silently=True,
            )
    except Exception:
        pass

    response = Response(
        {
            "detail": "Your support request has been received.",
            "ticket": _support_payload(ticket),
        },
        status=status.HTTP_201_CREATED,
    )
    if new_visitor_id:
        response.set_cookie(
            "visitorId",
            new_visitor_id,
            max_age=60 * 60 * 24 * 365,
            httponly=True,
            samesite="Lax",
            secure=request.is_secure(),
        )
    return response


@api_view(["GET"])
@permission_classes([IsAdminUser])
def support_status_counts(request):
    return Response({
        "pending": SupportMessage.objects.filter(status="pending").count(),
        "answered": SupportMessage.objects.filter(status="answered").count(),
        "total": SupportMessage.objects.count(),
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def my_support_messages(request):
    """Return the current customer's own support requests and replies."""
    if request.user.is_authenticated:
        tickets = SupportMessage.objects.filter(user=request.user).order_by("-created_at")
    else:
        visitor_id = request.COOKIES.get("visitorId")
        if not visitor_id:
            return Response([])
        tickets = SupportMessage.objects.filter(visitor_id=visitor_id).order_by("-created_at")

    return Response([_support_payload(ticket) for ticket in tickets])


@api_view(["GET"])
@permission_classes([IsAdminUser])
def support_faq_candidates(request):
    from django.db.models.functions import Lower, Trim

    rows = (
        SupportMessage.objects
        .exclude(subject="")
        .annotate(normalized_subject=Lower(Trim("subject")))
        .values("normalized_subject")
        .annotate(question_count=Count("id"), sample_question=Min("subject"), sample_category=Min("category"))
        .filter(question_count__gte=3)
        .order_by("-question_count", "normalized_subject")[:50]
    )
    return Response([
        {
            "question": row["sample_question"],
            "category": row["sample_category"] or "other",
            "question_count": row["question_count"],
        }
        for row in rows
    ])


@api_view(["POST"])
@permission_classes([IsAdminUser])
def support_reply(request, pk):
    ticket = get_object_or_404(SupportMessage, pk=pk)
    reply = str(request.data.get("support_reply") or "").strip()

    if not reply:
        return Response({"detail": "A reply is required."}, status=status.HTTP_400_BAD_REQUEST)

    ticket.support_reply = reply
    ticket.status = "answered"
    ticket.answered_at = timezone.now()
    ticket.save(update_fields=["support_reply", "status", "answered_at"])

    email_sent = False
    email_error = None
    try:
        from django.conf import settings
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
        if not from_email:
            raise RuntimeError("DEFAULT_FROM_EMAIL is not configured.")
        send_mail(
            f"Re: {ticket.subject}",
            reply,
            from_email,
            [ticket.email],
            fail_silently=False,
        )
        email_sent = True
    except Exception as exc:
        email_error = str(exc)
        logger.exception("Support reply email failed for ticket %s", ticket.id)

    payload = _support_payload(ticket)
    payload["email_sent"] = email_sent
    return Response(payload)


# -------------------------------
# Filter items
# -------------------------------
# @api_view(['GET'])
# @permission_classes([AllowAny])
# def filtered_items(request):
#     items = Item.objects.all()

#     section = request.GET.get('section', '').strip()
#     if section:
#         items = items.filter(section__name__iexact=section)

#     department = request.GET.get('department', '').strip()
#     if department:
#         items = items.filter(department__name__iexact=department)

#     category = request.GET.get('category', '').strip()
#     if category:
#         items = items.filter(category__name__iexact=category)

#     min_price = request.GET.get('minPrice')
#     if min_price:
#         items = items.filter(price__gte=min_price)

#     max_price = request.GET.get('maxPrice')
#     if max_price:
#         items = items.filter(price__lte=max_price)

#     size = request.GET.get('size', '').strip()
#     if size:
#         items = items.filter(sizes__icontains=size)

#     color = request.GET.get('color', '').strip()
#     if color:
#         items = items.filter(colors__icontains=color)

#     sort = request.GET.get('sort', '').strip()
#     if sort == 'low-high':
#         items = items.order_by('price')
#     elif sort == 'high-low':
#         items = items.order_by('-price')
#     elif sort == 'newest':
#         items = items.order_by('-created_at')
#     elif sort == 'oldest':
#         items = items.order_by('created_at')

#     paginator = PageNumberPagination()
#     paginator.page_size = 15

#     paginated_items = paginator.paginate_queryset(items, request)
#     serializer = ItemSerializer(paginated_items, many=True)

#     return paginator.get_paginated_response(serializer.data)


# filter hompage for options
@api_view(["GET"])
@permission_classes([AllowAny])
def filter_options(request):

    sections = Section.objects.values("id", "name").distinct()
    departments = Department.objects.values("id", "name").distinct()
    categories = Category.objects.values("id", "name").distinct()

    # =========================
    # FIXED SIZES (RELATION SAFE)
    # =========================
    sizes_set = set()

    items = Item.objects.all().only("kids_sizes")

    for item in items:
        ks = item.kids_sizes

        # CASE 1: ManyToMany / RelatedManager
        if hasattr(ks, "all"):
            for obj in ks.all():
                sizes_set.add(str(obj))

        # CASE 2: list / JSON
        elif isinstance(ks, list):
            sizes_set.update(ks)

        # CASE 3: single value (FK or string)
        elif ks not in [None, ""]:
            sizes_set.add(str(ks))

    sizes = [{"id": s, "name": s} for s in sorted(sizes_set)]

    # =========================
    # COLORS SAFE
    # =========================
    colors_set = set()

    if "color" in [f.name for f in Item._meta.get_fields()]:
        for c in Item.objects.values_list("color", flat=True):
            if c:
                colors_set.add(c)

    colors = [{"id": c, "name": c} for c in sorted(colors_set)]

    # =========================
    # RESPONSE
    # =========================
    return Response({
        "sections": list(sections),
        "departments": list(departments),
        "categories": list(categories),
        "sizes": sizes,
        "colors": colors,
    })



# filter hompage items
@api_view(["GET"])
@permission_classes([AllowAny])
def filtered_items(request):
    items = Item.objects.filter(in_stock__gt=0, available=True)
    # ======================
    # FILTERS
    # ======================

    section = request.GET.get("section")
    department = request.GET.get("department")
    category = request.GET.get("category")

    size = request.GET.get("size")
    color = request.GET.get("color")

    min_price = request.GET.get("minPrice")
    max_price = request.GET.get("maxPrice")

    # ---- relations ----
    if section:
        items = items.filter(section__name__iexact=section)

    if department:
        items = items.filter(department__name__iexact=department)

    if category:
        items = items.filter(category__name__iexact=category)

    # ---- attributes ----
    if size:
        items = items.filter(size__iexact=size)

    if color:
        items = items.filter(color__iexact=color)

    # ---- price ----
    if min_price:
        items = items.filter(price__gte=min_price)

    if max_price:
        items = items.filter(price__lte=max_price)

    # ======================
    # SORTING
    # ======================
    sort = request.GET.get("sort")

    if sort == "low-high":
        items = items.order_by("price")
    elif sort == "high-low":
        items = items.order_by("-price")
    elif sort == "newest":
        items = items.order_by("-created_at")
    elif sort == "oldest":
        items = items.order_by("created_at")

    # ======================
    # PAGINATION
    # ======================
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 15))

    paginator = Paginator(items, page_size)
    page_obj = paginator.get_page(page)

    serializer = ItemSerializer(page_obj.object_list, many=True)

    return Response({
        "results": serializer.data,
        "count": paginator.count,
        "next": page_obj.has_next(),
        "previous": page_obj.has_previous(),
    })




# -------------------------------
# fetch depart. cat. subcat
# -------------------------------
class HierarchicalDataView(APIView):
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]
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

    def retrieve(self, request, *args, **kwargs):
        item = self.get_object()
        user = request.user if request.user and request.user.is_authenticated else None
        visitor_id = None if user else request.COOKIES.get("visitorId")
        new_visitor_id = None

        if not user and not visitor_id:
            new_visitor_id = uuid.uuid4().hex
            visitor_id = new_visitor_id

        # ItemView is the existing customer-view history model. Keep one
        # logical view per item/account (or visitor) and only increment the
        # public Item.views counter when a new history row is recorded.

        if user:
            _, created = ItemView.objects.get_or_create(
                item=item,
                user=user,
                visitor_id=None,
            )
        else:
            _, created = ItemView.objects.get_or_create(
                item=item,
                user=None,
                visitor_id=visitor_id,
            )

        if created:
            Item.objects.filter(pk=item.pk).update(views=F("views") + 1)
            item.refresh_from_db(fields=["views"])

        serializer = self.get_serializer(item)
        response = Response(serializer.data)

        if new_visitor_id:
            response.set_cookie(
                "visitorId",
                new_visitor_id,
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
                max_age=30 * 24 * 3600,
            )

        return response


@api_view(["POST"])
@permission_classes([AllowAny])
def record_search_event(request):
    """
    Record an intentional customer marketplace search.

    Autocomplete/suggestion GET requests do not create events; the frontend
    calls this endpoint only when the customer submits or selects a search.
    """
    query = str(request.data.get("query") or "").strip()
    if not query:
        return Response(
            {"success": False, "error": "Search query is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    query = " ".join(query.split())[:255]
    user = request.user if request.user and request.user.is_authenticated else None
    visitor_id = None if user else request.COOKIES.get("visitorId")
    new_visitor_id = None

    if not user and not visitor_id:
        new_visitor_id = uuid.uuid4().hex
        visitor_id = new_visitor_id

    event = SearchEvent.objects.create(
        user=user,
        visitor_id=visitor_id,
        query=query,
    )

    response = Response(
        {
            "success": True,
            "event_id": event.id,
            "query": event.query,
        },
        status=status.HTTP_201_CREATED,
    )

    if new_visitor_id:
        response.set_cookie(
            "visitorId",
            new_visitor_id,
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            max_age=30 * 24 * 3600,
        )

    return response

# -------------------------------
# item fetch bu sub category
# -------------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
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
            serializer.save(user=self.request.user, visitor_id=None, item_id=item_id)
        else:
            visitor_id = self.request.COOKIES.get("visitorId")
            serializer.save(user=None, visitor_id=visitor_id, item_id=item_id)




# -------------------------------
# Reaction viewset
# -------------------------------
class ReactionViewSet(viewsets.ModelViewSet):
    queryset = Reaction.objects.all()
    serializer_class = ReactionSerializer
    permission_classes = [IsAuthenticatedOrVisitor]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        visitor_id = None if user else self.request.COOKIES.get("visitorId")
        review_id = self.request.data.get("review")
        reaction_type = self.request.data.get("reaction_type")

        # Ensure review exists
        try:
            review = Review.objects.get(id=review_id)
        except Review.DoesNotExist:
            raise serializers.ValidationError({"review": "Review does not exist."})

        # Check if user/visitor already reacted
        if user:
            existing = Reaction.objects.filter(review=review, user=user)
        else:
            existing = Reaction.objects.filter(review=review, visitor_id=visitor_id, user__isnull=True)

        if existing.exists():
            existing.update(reaction_type=reaction_type)
        else:
            serializer.save(
                review=review,
                user=user,
                visitor_id=visitor_id,
                reaction_type=reaction_type,
            )



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

def generate_voucher_code(prefix="VOUCH", length=8, max_attempts=10):
    """
    Generate a unique voucher code.

    Format example: VOUCH-8F3K2L9Q
    """

    chars = string.ascii_uppercase + string.digits

    for _ in range(max_attempts):
        random_part = ''.join(random.choices(chars, k=length))
        code = f"{prefix}-{random_part}"

        # Ensure uniqueness in DB
        if not Voucher.objects.filter(code=code).exists():
            return code

    raise Exception("Failed to generate unique voucher code after multiple attempts.")

class UserAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Ensure the profile exists
        profile, _ = Profile.objects.get_or_create(user=user)

        # Ensure related records exist
        wallet, _ = Wallet.objects.get_or_create(user=user)
        referral, _ = Referral.objects.get_or_create(referrer=user)
        if (
            user.order_set.filter(status__iexact="completed").count() >= 5
            and not Voucher.objects.filter(user=user, active=True).exists()
        ):
            Voucher.objects.create(
                user=user,
                code=generate_voucher_code(),
                active=True
            )

        voucher = Voucher.objects.filter(user=user, active=True).first()

        # Return the customer's current order lifecycle so the customer
        # orders page can distinguish unpaid, in-process, and completed orders.
        customer_order_statuses = (
            "PENDING_PAYMENT",
            *Order.PAID_STATUSES,
        )
        customer_orders = (
            Order.objects.filter(
                user=user,
                status__in=customer_order_statuses,
            )
            .order_by("-created_at")
        )

        order_serializer = OrderSerializer(
            customer_orders, many=True, context={"request": request}
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
        orders = Order.objects.filter(
            user=user
        ).filter(
            models.Q(status__iexact="pending") | models.Q(status__iexact="completed")
        ).order_by("-created_at")
    else:
        profile = None
        wallet = None
        vouchers = []
        referral = None
        orders = Order.objects.filter(
            visitor_id=visitor_id
        ).filter(
            models.Q(status__iexact="pending") | models.Q(status__iexact="completed")
        ).order_by("-created_at")


    # 4️⃣ Build order data (including items)
    order_data = []
    for order in orders:
        order_items = OrderItem.objects.filter(order=order)
        order_data.append({
            **OrderSerializer(order).data,
            "items": OrderItemSerializer(order_items, many=True).data,
        })

    # 5️⃣ Combine all into response
    data = {
        "is_authenticated": bool(user),
        "authType": "user" if user else "visitor",
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

# -------------------------------
# Admin password change
# -------------------------------
class AdminChangePasswordView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        current_password = str(request.data.get("current_password") or "")
        new_password = str(request.data.get("new_password") or "")

        if not current_password or not new_password:
            return Response({"detail": "Current password and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({"detail": "The new password must contain at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)
        if not authenticate(request=request, username=request.user.get_username(), password=current_password):
            return Response({"detail": "The current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        if current_password == new_password:
            return Response({"detail": "The new password must be different from the current password."}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)
        return Response({"success": True, "message": "Password changed successfully."})


#email tracking view
from django.contrib.auth import get_user_model, update_session_auth_hash, authenticate

User = get_user_model()

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def send_email(request):
    to = request.data.get("to")
    subject = request.data.get("subject")
    message = request.data.get("message")

    attachments = request.FILES.getlist("attachments")

    try:
        from_email = settings.DEFAULT_FROM_EMAIL

        # 🔥 LOOK UP USER BY EMAIL
        user = User.objects.filter(email=to).first()

        # 🧠 derive name safely
        if user:
            to_name = user.get_full_name() or user.username
        else:
            to_name = "Valued User"

        html_content = render_to_string("emails/compose_email.html", {
            "subject": subject,
            "message": message,

            # ✨ AUTO PERSONALISED DATA
            "to_email": to,
            "to_name": to_name,

            "company_name": getattr(settings, "COMPANY_NAME", "My Company"),
            "year": datetime.now().year,
        })

        email = EmailMultiAlternatives(
            subject=subject,
            body=message,
            from_email=from_email,
            to=[to],
        )

        email.attach_alternative(html_content, "text/html")

        for file in attachments:
            email.attach(file.name, file.read(), file.content_type)

        email.send()

        EmailLog.objects.create(
            recipient=to,
            subject=subject,
            message=message,
            status="sent",
            type="compose"
        )

        return Response({"success": True})

    except Exception as e:
        EmailLog.objects.create(
            recipient=to,
            subject=subject,
            message=message,
            status="failed",
            type="compose"
        )

        return Response({"success": False, "error": str(e)}, status=500)

#email stats
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def email_stats(request):
    today = now().date()
    start_this_month = today.replace(day=1)
    start_last_month = (start_this_month - timedelta(days=1)).replace(day=1)

    total_sent = EmailLog.objects.filter(status="sent").count()

    this_month = EmailLog.objects.filter(
        status="sent",
        created_at__date__gte=start_this_month
    ).count()

    last_month = EmailLog.objects.filter(
        status="sent",
        created_at__date__gte=start_last_month,
        created_at__date__lt=start_this_month
    ).count()

    today_sent = EmailLog.objects.filter(
        status="sent",
        created_at__date=today
    ).count()

    failed = EmailLog.objects.filter(status="failed").count()

    growth = 0
    if last_month > 0:
        growth = ((this_month - last_month) / last_month) * 100

    return Response({
        "total": total_sent + failed,
        "sent": total_sent,
        "failed": failed,
        "this_month": this_month,
        "last_month": last_month,
        "today": today_sent,
        "growth": round(growth, 2)
    })



# fetch user to sed them email
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def users_list(request):
    users = User.objects.all().values(
        "id",
        "username",
        "email",
        "first_name",
        "last_name"
    )

    return Response(list(users))


# email list view
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def email_list(request):
    status = request.GET.get("status")  # sent, failed, received, all

    emails = EmailLog.objects.all().order_by("-created_at")

    if status and status != "all":
        emails = emails.filter(status=status)

    data = list(emails.values(
        "id",
        "recipient",
        "subject",
        "message", 
        "status",
        "type",
        "created_at"
    ))

    return Response(data)