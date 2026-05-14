from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination
from django.db.models import Min, Max, Count,Prefetch
from ReactSerializers.models import *
from .Serializers import *
from rest_framework import viewsets, permissions
from rest_framework import generics
from .Serializers import BrandSerializer
from ReactSerializers.models import Brand
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.decorators import action
from .Serializers import BlogPostSerializer
from .models import BlogPost
from oder.views import IsAuthenticatedOrVisitor
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import F
import uuid
import bleach


# -------------------------------
# Sanitizer
# -------------------------------
def sanitize(value):
    if isinstance(value, str):
        return bleach.clean(value)
    return value


#  chatfile vuew
class FileUploadView(APIView):
    def post(self, request, format=None):
        serializer = ChatFileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            file_url = request.build_absolute_uri(serializer.data['file'])
            return Response({"fileUrl": file_url, "fileName": request.FILES['file'].name})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(["GET"])
@permission_classes([AllowAny])
def filters_view(request):
    """
    Returns available filters:
      - Sections / Departments / Categories / Subcategories
      - Attributes
      - Genders
      - Sizes
      - Colors
      - Brands
      - Price range
    """

    # Prefetch hierarchy for better performance
    sections = (
        Section.objects.prefetch_related(
            Prefetch(
                "departments",
                queryset=Department.objects.prefetch_related(
                    Prefetch(
                        "categories",
                        queryset=Category.objects.prefetch_related("subcategories")
                    )
                )
            )
        )
    )

    sections_data = SectionSerializer(sections, many=True, context={"request": request}).data

    # ✅ Attributes
    attributes = [attr for attr, _ in Item._meta.get_field("item_attribute").choices]

    # ✅ Genders (excluding "none")
    genders = (
        Item.objects.exclude(gender_based="none")
        .values_list("gender_based", flat=True)
        .distinct()
    )

    # ✅ Sizes (using kids_sizes field instead of non-existent sizes)
    sizes = set()
    for s in Item.objects.values_list("kids_sizes", flat=True):
        if s and isinstance(s, list):
            sizes.update(s)

    # ✅ Colors (if colors is a JSON/Array field on Item — adjust if different)
    colors = set()
    if "colors" in [f.name for f in Item._meta.get_fields()]:
        for c in Item.objects.values_list("colors", flat=True):
            if c and isinstance(c, list):
                colors.update(c)

    # ✅ Brands (from the FK brand)
    brands_qs = (
    Item.objects.filter(brand__isnull=False)
    .values("brand__id", "brand__name")
    .annotate(count=Count("id"))  # Count all items for each brand
    .order_by("brand__name")      # Optional: sort alphabetically
    )

   # Map to frontend-friendly keys
    brands = [
        {
            "id": b["brand__id"],
            "name": b["brand__name"],
            "count": b["count"]
        }
        for b in brands_qs
    ]

    # ✅ Price range
    price_range = Item.objects.aggregate(min=Min("price"), max=Max("price"))

    return Response({
        "sections": sections_data,
        "attributes": attributes,
        "genders": list(genders),
        "sizes": sorted(list(sizes)),
        "colors": sorted(list(colors)),
        "brands": list(brands),
        "priceRange": price_range,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def products_view(request):
    """
    Unified products API:
    Supports filtering, sorting, and pagination.
    Query params:
      - sections, categories, subcategories, departments, brands (comma-separated IDs)
      - color, gender, attribute, sizes
      - min_price, max_price
      - sortBy (Default | Product Name | Price | Brand)
      - perPage (default=10)
    """
    queryset = Item.objects.all()

    # --- Filtering ---
    if sections := request.GET.get("sections"):
        queryset = queryset.filter(section__id__in=sections.split(","))

    if departments := request.GET.get("departments"):
        queryset = queryset.filter(department__id__in=departments.split(","))

    if categories := request.GET.get("categories"):
        queryset = queryset.filter(category__id__in=categories.split(","))

    if subcategories := request.GET.get("subcategories"):
        queryset = queryset.filter(subcategory__id__in=subcategories.split(","))

    # ✅ Brand filter
    if brands := request.GET.get("brands"):
        queryset = queryset.filter(brand__id__in=brands.split(","))

    # ✅ Color filter
    if color := request.GET.get("color"):
        if "colors" in [f.name for f in Item._meta.get_fields()]:
            queryset = queryset.filter(colors__contains=[color])

    # ✅ Gender filter
    if gender := request.GET.get("gender"):
        queryset = queryset.filter(gender_based__iexact=gender)

    # ✅ Attribute filter
    if attribute := request.GET.get("attribute"):
        queryset = queryset.filter(item_attribute__iexact=attribute)

    # ✅ Size filter (kids_sizes)
    if size := request.GET.get("sizes"):
        queryset = queryset.filter(kids_sizes__contains=[size])

    # ✅ Price filter
    if min_price := request.GET.get("min_price"):
        queryset = queryset.filter(price__gte=min_price)
    if max_price := request.GET.get("max_price"):
        queryset = queryset.filter(price__lte=max_price)

    # --- Sorting ---
    sort_by = request.GET.get("sortBy", "Default")
    if sort_by == "Product Name":
        queryset = queryset.order_by("name")
    elif sort_by == "Price":
        queryset = queryset.order_by("price")
    elif sort_by == "Brand":
        queryset = queryset.order_by("brand__name")
    else:
        queryset = queryset.order_by("-id")  # newest first by default

    # --- Pagination ---
    paginator = PageNumberPagination()
    paginator.page_size = int(request.GET.get("perPage", 10))
    result_page = paginator.paginate_queryset(queryset, request)

    # --- Serialize ---
    serializer = ProductSerializer(result_page, many=True, context={"request": request})
    return paginator.get_paginated_response(serializer.data)





# banner
class BannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.all()
    serializer_class = BannerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Vendors can only see their banners
        return Banner.objects.filter(user=self.request.user)
        
    

# list all banners
class BannerListView(generics.ListAPIView):
    """
    Returns all active banners ordered by display_order and created_at.
    """
    serializer_class = BannerSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Banner.objects.filter(
            is_active=True
        ).order_by("display_order", "-created_at")
    

#Fetch 0nly 4 banners    

    


# fetch barnd serializer
@api_view(["GET"])
@permission_classes([AllowAny])
def list_brands(request):
    brands = Brand.objects.all()
    serializer = BrandSerializer(brands, many=True, context={'request': request})
    return Response(serializer.data)  



# blog views

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response


class BlogPostViewSet(viewsets.ModelViewSet):
    serializer_class = BlogPostSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = BlogPost.objects.select_related('user', 'vendor').prefetch_related('comments_blog', 'reactions_blog')
        if self.request.method == "GET" and not self.request.user.is_authenticated:
            return qs.filter(approved=True)
        return qs

    def perform_create(self, serializer):
        vendor = getattr(self.request.user, "vendor", None)
        blog = serializer.save(user=self.request.user, vendor=vendor)

        # --- Notify all admins ---
        admins = User.objects.filter(is_superuser=True)
        for admin in admins:
            Notification.objects.create(
                user=admin,
                title=f"New Blog Created by Vendor {vendor.company_name if vendor else 'Unknown'}",
                message=f"Blog '{blog.title}' was created by {self.request.user.username}.",
                url=f"/admin-dashboard/blogs/{blog.id}/"
            )
            print(f"📢 Admin {admin.username} notified")

        # --- Notify the vendor (optional) ---
        if vendor and vendor.user:
            Notification.objects.create(
                user=vendor.user,
                title="Your Blog Was Created",
                message=f"Your blog '{blog.title}' has been successfully created.",
                url=f"/vendor/blogs/{blog.id}/"
            )
            print(f"📢 Vendor {vendor.user.username} notified")

        # --- Log activity ---
        ActivityLog.objects.create(
            user=self.request.user,
            actor_type='vendor' if vendor else 'user',
            action="blog_created",
            item=None,  # Not an item, can use blog.id in description
            description=f"Blog '{blog.title}' was created by. The admin has approved your blog and will be visible to the Users",
            related_url=f"/blog/{blog.id}/"
        )

        # log admin
        ActivityLog.objects.create(
            user=admin,
            actor_type='admin',
            action="blog_created",
            item=None,  # Not an item, can use blog.id in description
            description=f"Blog '{blog.title}' was created by {self.request.user.username}.",
            related_url=f"/blog/{blog.id}/"
        )
        

    # 💬 POST /api/blogs/{id}/comment/
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticatedOrVisitor])
    def comment(self, request, pk=None):
        post = self.get_object()
        serializer = CommentSerializer(data=request.data)

        if serializer.is_valid():
            if request.user.is_authenticated:
                comment = serializer.save(post=post, user=request.user)

                # --- Notify the vendor if available ---
                vendor = getattr(post, "vendor", None)
                if vendor and vendor.user:
                    Notification.objects.create(
                        user=vendor.user,
                        title="New Comment on Your Blog",
                        message=f"Your blog '{post.title}' has a new comment by {request.user.username}.",
                        url=f"/vendor/blogs/{post.id}/"
                    )
                    print(f"📢 Vendor {vendor.user.username} notified")

                # --- Log activity for user ---
                ActivityLog.objects.create(
                    user=request.user,
                    actor_type='user',
                    action="comment_created",
                    item=None,
                    description=f"You commented on blog '{post.title}'.",
                    related_url=f"/blog/{post.id}/"
                )

                # --- Log activity for admins ---
                admins = User.objects.filter(is_superuser=True)
                for admin in admins:
                    ActivityLog.objects.create(
                        user=admin,
                        actor_type='admin',
                        action="comment_created",
                        item=None,
                        description=f"Blog '{post.title}' received a new comment by {request.user.username}.",
                        related_url=f"/admin-dashboard/blogs/{post.id}/"
                    )
                    print(f"📝 Admin {admin.username} activity logged")
            else:
                # Anonymous comment
                visitor_id = request.COOKIES.get("visitorId")
                serializer.save(post=post, visitor_id=visitor_id, user=None)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ❤️ POST /api/blogs/{id}/react/
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticatedOrVisitor])
    def react(self, request, pk=None):
        post = self.get_object()
        reaction_type = request.data.get('type')

        valid_choices = dict(ReactionBlog.REACTION_CHOICES)
        if reaction_type not in valid_choices:
            return Response({"detail": "Invalid reaction type"}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.is_authenticated:
            reaction, created = ReactionBlog.objects.update_or_create(
                post=post,
                user=request.user,
                defaults={'type': reaction_type}
            )

            # --- Notify the vendor if available ---
            vendor = getattr(post, "vendor", None)
            if vendor and vendor.user:
                Notification.objects.create(
                    user=vendor.user,
                    title="New Reaction on Your Blog",
                    message=f"Your blog '{post.title}' received a new reaction ({reaction_type}) from {request.user.username}.",
                    url=f"/vendor/blogs/{post.id}/"
                )
                print(f"📢 Vendor {vendor.user.username} notified")

            # --- Log activity for user ---
            ActivityLog.objects.create(
                user=request.user,
                actor_type='user',
                action="react_created",
                item=None,
                description=f"You reacted '{reaction_type}' to blog '{post.title}'.",
                related_url=f"/blog/{post.id}/"
            )

            # --- Log activity for admins ---
            admins = User.objects.filter(is_superuser=True)
            for admin in admins:
                ActivityLog.objects.create(
                    user=admin,
                    actor_type='admin',
                    action="react_created",
                    item=None,
                    description=f"Blog '{post.title}' received a new reaction ({reaction_type}) from {request.user.username}.",
                    related_url=f"/admin-dashboard/blogs/{post.id}/"
                )
                print(f"📝 Admin {admin.username} activity logged")
        else:
            # Anonymous reaction
            visitor_id = request.COOKIES.get("visitorId")
            reaction, created = ReactionBlog.objects.update_or_create(
                post=post,
                visitor_id=visitor_id,
                defaults={'type': reaction_type}
            )

        return Response(
            ReactionSerializer(reaction).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    # 💔 DELETE /api/blogs/{id}/remove_reaction/
    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticatedOrVisitor])
    def remove_reaction(self, request, pk=None):
        post = self.get_object()
        if request.user.is_authenticated:
            reaction = ReactionBlog.objects.filter(post=post, user=request.user).first()
        else:
            visitor_id = request.COOKIES.get("visitorId")
            reaction = ReactionBlog.objects.filter(post=post, visitor_id=visitor_id).first()

        if reaction:
            reaction_type = reaction.type
            reaction.delete()

            # --- Notify vendor if available ---
            vendor = getattr(post, "vendor", None)
            if vendor and vendor.user:
                Notification.objects.create(
                    user=vendor.user,
                    title="Reaction Removed from Your Blog",
                    message=f"A reaction ({reaction_type}) was removed from your blog '{post.title}'.",
                    url=f"/vendor/blogs/{post.id}/"
                )
                print(f"📢 Vendor {vendor.user.username} notified of removed reaction")

            # --- Log activity for user ---
            if request.user.is_authenticated:
                ActivityLog.objects.create(
                    user=request.user,
                    actor_type='user',
                    action="react_removed",
                    item=None,
                    description=f"You removed your '{reaction_type}' reaction from blog '{post.title}'.",
                    related_url=f"/blog/{post.id}/"
                )

            # --- Log activity for admins ---
            admins = User.objects.filter(is_superuser=True)
            for admin in admins:
                ActivityLog.objects.create(
                    user=admin,
                    actor_type='admin',
                    action="react_removed",
                    item=None,
                    description=f"Blog '{post.title}' had a reaction ({reaction_type}) removed by {request.user.username if request.user.is_authenticated else 'a visitor'}.",
                    related_url=f"/admin-dashboard/blogs/{post.id}/"
                )
                print(f"📝 Admin {admin.username} activity logged")

            return Response({"detail": "Reaction removed"}, status=status.HTTP_204_NO_CONTENT)

        return Response({"detail": "No reaction found"}, status=status.HTTP_404_NOT_FOUND)
    


# Admin approve blogs is approved = false
class AdminBlogApprovalViewSet(viewsets.ModelViewSet):
    """
    Fetch blogs that are pending approval for admin review.
    """
    serializer_class = BlogPostSerializer
    permission_classes = [permissions.IsAdminUser]  # Only admins can access

    def get_queryset(self):
        # Only return blogs that are not yet approved
        return BlogPost.objects.filter(approved=False).select_related('user', 'vendor')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        blog = self.get_object()
        blog.approved = True
        blog.save()

        # Notify the vendor
        if blog.vendor and blog.vendor.user:
            Notification.objects.create(
                user=blog.vendor.user,
                title="Your blog was approved",
                message=f"Your blog '{blog.title}' has been approved by admin.",
                url=f"/vendor/blogs/{blog.id}/"
            )

        # Log admin activity
        ActivityLog.objects.create(
            user=request.user,
            actor_type='admin',
            action="blog_approved",
            item=None,
            description=f"Blog '{blog.title}' approved by {request.user.username}.",
            related_url=f"/blog/{blog.id}/"
        )

        return Response({
            "detail": f"Blog '{blog.title}' has been approved."
        })    


#popular blogs
class PopularBlogPostsViewSet(viewsets.ViewSet):
    """
    Return blogs ordered by total engagement (comments + reactions)
    """
    def list(self, request):
        qs = BlogPost.objects.annotate(
            total_comments=Count('comments_blog'),
            total_reactions=Count('reactions_blog'),
        ).order_by('-total_comments', '-total_reactions')[:1]  # top 10

        serializer = BlogPostSerializer(qs, many=True)
        return Response(serializer.data)
    
#wishlist view add an remove


class WishlistAPIView(APIView):
    permission_classes = [IsAuthenticatedOrVisitor]

    def get_actor(self, request):
        """Identify if it's a user or visitor"""
        if request.user and request.user.is_authenticated:
            return {
                "user": request.user,
                "visitor_id": None,
                "actor_type": "user",
                "actor_name": request.user.username
            }
        else:
            visitor_id = request.COOKIES.get("visitorId")
            if not visitor_id:
                visitor_id = str(uuid.uuid4())
            return {
                "user": None,
                "visitor_id": visitor_id,
                "actor_type": "visitor",
                "actor_name": f"Guest ({visitor_id[:8]})"
            }

    def get(self, request):
        """
        ✅ Get all wishlist items for logged-in user or visitor.
        """
        actor = self.get_actor(request)

        wishlist_items = Wishlist.objects.filter(
            user=actor["user"],
            visitor_id=actor["visitor_id"]
        ).select_related("item")

        # get related Item objects
        items = [w.item for w in wishlist_items]

        serializer = ItemSerializer(items, many=True)

        response = Response({
            "success": True,
            "count": len(items),
            "items": serializer.data
        })

        # ✅ Set visitor cookie if not set yet
        if not request.COOKIES.get("visitorId") and not actor["user"]:
            response.set_cookie(
                "visitorId",
                actor["visitor_id"],
                httponly=True,
                secure=False,
                samesite="Lax",
                max_age=30*24*3600,
            )

        return response

    @transaction.atomic
    def post(self, request, pk):
        """
        Add item to wishlist (user or visitor) and increment item.like only once per actor.
        """
        pk = sanitize(pk)
        item = get_object_or_404(Item, pk=pk)
        actor = self.get_actor(request)

        # --- Prevent duplicate wishlist for same actor ---
        wishlist, created = Wishlist.objects.get_or_create(
            item=item,
            user=actor["user"],
            visitor_id=actor["visitor_id"],
        )

        if created:
            # ✅ Increment item.like atomically
            Item.objects.filter(pk=item.pk).update(likes=F("likes") + 1)
            item.refresh_from_db(fields=['likes'])

            message = "Item added to wishlist"

            # --- Activity log for actor ---
            ActivityLog.objects.create(
                user=actor["user"],
                actor_type=actor["actor_type"],
                action="item_added_to_wishlist",
                item=item,
                description=f"You added '{item.name}' to wishlist.",
                related_url=f"/item-client/{item.id}/"
            )

            # --- Vendor activity log & notification ---
            if item.vendor and item.vendor.user:
                ActivityLog.objects.create(
                    user=item.vendor.user,
                    actor_type="vendor",
                    action="item_added_to_wishlist",
                    item=item,
                    description=f"{actor['actor_name']} added '{item.name}' to wishlist.",
                    related_url=f"/item/{item.id}/"
                )

                Notification.objects.create(
                    user=item.vendor.user,
                    title="Item added to wishlist",
                    message=f"{actor['actor_name']} added '{item.name}' from wishlist.",
                    url=f"/item/{item.id}/"
                )

            # --- Admin logs & notifications ---
            admins = User.objects.filter(is_staff=True)
            for admin in admins:
                ActivityLog.objects.create(
                    user=admin,
                    actor_type="admin",
                    action="item_added_to_wishlist",
                    item=item,
                    description=f"{actor['actor_name']} added '{item.name}' to their wishlist.",
                    related_url=f"/admin-item/vendorDashboard/items/{item.id}/"
                )

            superadmins = User.objects.filter(is_superuser=True)
            for admin in superadmins:
                Notification.objects.create(
                    user=admin,
                    title="Item added to wishlist",
                    message=f"{actor['actor_name']} added '{item.name}' to their wishlist.",
                    url=f"/admin-item/vendorDashboard/items/{item.id}/"
                )

        else:
            message = "Item already in wishlist"

        response = Response({
            "success": True,
            "message": message,
            "wishlist_id": wishlist.id,
            "visitor_id": actor["visitor_id"]
        })

        # ✅ Set visitorId cookie if needed
        if not request.COOKIES.get("visitorId") and not actor["user"]:
            response.set_cookie(
                "visitorId",
                actor["visitor_id"],
                httponly=True,
                secure=False,
                samesite="Lax",
                max_age=30*24*3600,
            )

        return response


    @transaction.atomic
    def delete(self, request, pk):
        """
        Remove item from wishlist (user or visitor).
        """
        pk = sanitize(pk)
        item = get_object_or_404(Item, pk=pk)
        actor = self.get_actor(request)

        wishlist_qs = Wishlist.objects.filter(
            item=item,
            user=actor["user"],
            visitor_id=actor["visitor_id"]
        )

        if wishlist_qs.exists():
            wishlist_qs.delete()
            # ... existing logging and notifications
             # Log for user/visitor
            ActivityLog.objects.create(
                user=actor["user"],
                actor_type=actor["actor_type"],
                action="item_removed_from_wishlist",
                item=item,
                description=f"You removed '{item.name}' from wishlist.",
                related_url=f"/item-client/{item.id}/"
            )

            # Vendor log
            ActivityLog.objects.create(
                user=actor["user"],
                actor_type="vendor",
                action="item_removed_from_wishlist",
                item=item,
                description=f"{actor['actor_name']} removed '{item.name}' from wishlist.",
                related_url=f"/item/{item.id}/"
            )

            # Admin logs
            for admin in User.objects.filter(is_superuser=True):
                ActivityLog.objects.create(
                    user=admin,
                    actor_type="admin",
                    action="item_removed_from_wishlist",
                    item=item,
                    description=f"{actor['actor_name']} removed '{item.name}' from their wishlist.",
                    related_url=f"/admin-item/vendorDashboard/items/{item.id}/"
                )

            # Notifications
            if item.vendor and item.vendor.user:
                Notification.objects.create(
                    user=item.vendor.user,
                    title="Wishlist Update",
                    message=f"{actor['actor_name']} removed '{item.name}' from wishlist.",
                    url=f"/item/{item.id}/"
                )

            for admin in User.objects.filter(is_superuser=True):
                Notification.objects.create(
                    user=admin,
                    title="Wishlist Update",
                    message=f"{actor['actor_name']} removed '{item.name}' from their wishlist.",
                    url=f"/admin-item/vendorDashboard/items/{item.id}/"
                )

            return Response({"success": True, "message": "Item removed from wishlist"})
        else:
            return Response({"success": False, "message": "Item not found in wishlist"}, status=404)



# vendor ratings
import uuid

class VendorRatingView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, vendor_id):
        try:
            vendor = Vendor.objects.get(id=vendor_id)
        except Vendor.DoesNotExist:
            return Response({"error": "Vendor not found"}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data['vendor'] = vendor.id

        user = request.user if request.user.is_authenticated else None

        # Handle visitor identification for anonymous users
        visitor_key = request.COOKIES.get("visitorId")
        if not visitor_key and not user:
            # generate a random UUID for visitor
            visitor_key = str(uuid.uuid4())
        
        # Check if user/visitor has already rated
        if user:
            rating, created = VendorRating.objects.update_or_create(
                vendor=vendor,
                user=user,
                defaults={
                    'quality': data.get('quality', 0),
                    'communication': data.get('communication', 0),
                    'shipping': data.get('shipping', 0),
                    'comment': data.get('comment', "")
                }
            )
        else:
            existing_rating = VendorRating.objects.filter(vendor=vendor, user_id=visitor_key).first()
            if existing_rating:
                return Response({"error": "Visitor has already rated this shop."}, status=status.HTTP_400_BAD_REQUEST)
            rating = VendorRating.objects.create(
                vendor=vendor,
                quality=data.get('quality', 0),
                communication=data.get('communication', 0),
                shipping=data.get('shipping', 0),
                comment=data.get('comment', ""),
                user_id=visitor_key
            )

        serializer = VendorRatingSerializer(rating)
        response = Response(serializer.data, status=status.HTTP_201_CREATED)
        
        # If visitor, set the cookie so they cannot rate again
        if not user:
            response.set_cookie("visitor_id", visitor_key, max_age=60*60*24*365)  # 1 year
        return response

    def get(self, request, vendor_id):
        """
        Return average ratings for a vendor + total review count + comments
        """
        try:
            vendor = Vendor.objects.get(id=vendor_id)
        except Vendor.DoesNotExist:
            return Response({"error": "Vendor not found"}, status=status.HTTP_404_NOT_FOUND)

        ratings = VendorRating.objects.filter(vendor=vendor)
        count = ratings.count()
        avg_quality = ratings.aggregate(avg=models.Avg('quality'))['avg'] or 0
        avg_communication = ratings.aggregate(avg=models.Avg('communication'))['avg'] or 0
        avg_shipping = ratings.aggregate(avg=models.Avg('shipping'))['avg'] or 0

        # Serialize comments (optional: only non-empty comments)
        comments = [
            {
                "user": r.user.username if r.user else "Visitor",
                "quality": r.quality,
                "communication": r.communication,
                "shipping": r.shipping,
                "comment": r.comment,
                "created_at": r.created_at,
            }
            for r in ratings if r.comment
        ]

        return Response({
            "average_ratings": {
                "quality": round(avg_quality, 1),
                "communication": round(avg_communication, 1),
                "shipping": round(avg_shipping, 1)
            },
            "review_count": count,
            "comments": comments  # include the comments here
        }, status=status.HTTP_200_OK)
