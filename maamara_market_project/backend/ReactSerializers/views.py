from django.db.models import Avg, Count, Sum, F, DecimalField, ExpressionWrapper
from rest_framework import permissions, viewsets
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError

from core.models import Profile
from .Serializers import AdminProfilePic, VendorPublicSerializer, ItemSerializers
from .models import Item, ItemView
from vendorDashboard.models import Vendor
from shop.models import Review, VendorRating, Wishlist
from order.models import OrderItem


class ProfileView(APIView):
    """Return the authenticated user's profile and vendor picture."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = AdminProfilePic(profile)

        vendor_picture = None
        vendor = getattr(request.user, "vendor", None)
        if vendor and getattr(vendor, "profile_picture", None):
            vendor_picture = vendor.profile_picture.url

        return Response({
            **serializer.data,
            "vendor_profile_picture": vendor_picture,
        })


class VendorAdminViewSet(viewsets.ModelViewSet):
    """
    Admin-facing vendor directory.

    The existing vendor data shape is preserved through VendorPublicSerializer;
    the endpoint is explicitly restricted to staff users because it exposes
    vendor contact and business information.
    """

    queryset = Vendor.objects.all().order_by("-date_created")
    serializer_class = VendorPublicSerializer
    permission_classes = [permissions.IsAdminUser]

    @staticmethod
    def _rating_summary(vendor):
        ratings = VendorRating.objects.filter(vendor=vendor)
        aggregate = ratings.aggregate(
            quality=Avg("quality"),
            communication=Avg("communication"),
            shipping=Avg("shipping"),
        )
        values = [
            float(value)
            for value in (
                aggregate["quality"],
                aggregate["communication"],
                aggregate["shipping"],
            )
            if value is not None
        ]
        average = round(sum(values) / len(values), 1) if values else 0
        return {
            "average": average,
            "count": ratings.count(),
            "quality": round(float(aggregate["quality"] or 0), 1),
            "communication": round(float(aggregate["communication"] or 0), 1),
            "shipping": round(float(aggregate["shipping"] or 0), 1),
        }

    @action(detail=True, methods=["get"], url_path="performance")
    def performance(self, request, pk=None):
        vendor = self.get_object()
        completed_items = OrderItem.objects.filter(
            item__vendor=vendor,
            order__status__iexact="completed",
        )

        sales = completed_items.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F("price_at_purchase") * F("quantity"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                )
            ),
            units=Sum("quantity"),
        )

        review_qs = Review.objects.filter(item__vendor=vendor)
        review_summary = review_qs.aggregate(
            count=Count("id"),
            average=Avg("rating"),
        )

        rating_summary = self._rating_summary(vendor)

        return Response({
            "vendor": {
                "id": vendor.id,
                "name": vendor.company_name or f"{vendor.first_name} {vendor.surname_name}".strip(),
                "is_active": vendor.is_active,
            },
            "sales": {
                "amount": float(sales["total"] or 0),
                "units": int(sales["units"] or 0),
                "orders": completed_items.values("order_id").distinct().count(),
            },
            "shop_ratings": rating_summary,
            "item_reviews": {
                "count": int(review_summary["count"] or 0),
                "average_stars": round(float(review_summary["average"] or 0), 1),
            },
            "items": {
                "count": Item.objects.filter(vendor=vendor).count(),
                "active": Item.objects.filter(vendor=vendor, available=True).count(),
            },
        })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_item_performance(request, item_id):
    """
    Detailed admin/vendor item metrics.

    The endpoint is restricted to staff or the item's owning vendor and returns
    current stock, cart quantity, wishlist count, lifetime unique views,
    current price, reviews and ratings.
    """
    try:
        item = Item.objects.select_related("vendor", "brand", "category", "department").get(pk=item_id)
    except Item.DoesNotExist:
        return Response({"error": "Item not found."}, status=404)

    vendor = item.vendor
    request_vendor = getattr(request.user, "vendor", None)
    if not request.user.is_staff and request_vendor != vendor:
        return Response({"detail": "You do not have access to this item."}, status=403)

    completed_sales = OrderItem.objects.filter(
        item=item,
        order__status__iexact="completed",
    ).aggregate(
        units=Sum("quantity"),
        amount=Sum(
            ExpressionWrapper(
                F("price_at_purchase") * F("quantity"),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            )
        ),
    )

    review_qs = Review.objects.filter(item=item)
    review_summary = review_qs.aggregate(count=Count("id"), average=Avg("rating"))

    wishlist_count = Wishlist.objects.filter(item=item).count()
    view_count = ItemView.objects.filter(item=item).count()

    # A pending cart is represented by the user's current pending Order.
    # This counts quantities currently reserved in carts, without counting
    # completed orders.
    cart_row = OrderItem.objects.filter(
        item=item,
        order__status__iexact="pending",
    ).aggregate(quantity=Sum("quantity"), customers=Count("order__id", distinct=True))

    return Response({
        "item": ItemSerializers(item, context={"request": request}).data,
        "vendor": {
            "id": vendor.id if vendor else None,
            "company_name": vendor.company_name if vendor else "",
            "first_name": vendor.first_name if vendor else "",
            "surname_name": vendor.surname_name if vendor else "",
            "product_type": vendor.product_type if vendor else "",
            "is_active": vendor.is_active if vendor else False,
        },
        "stats": {
            "stock": int(item.in_stock or 0),
            "price": float(item.price or 0),
            "discount_price": float(item.discount_price) if item.discount_price is not None else None,
            "views": int(view_count),
            "wishlist": int(wishlist_count),
            "in_carts": int(cart_row["quantity"] or 0),
            "cart_customers": int(cart_row["customers"] or 0),
            "sold_units": int(completed_sales["units"] or 0),
            "sales_amount": float(completed_sales["amount"] or 0),
            "reviews": int(review_summary["count"] or 0),
            "average_stars": round(float(review_summary["average"] or 0), 1),
        },
    })
