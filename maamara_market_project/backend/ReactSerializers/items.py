from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
import calendar
from .models import Item, ItemView

@api_view(['GET'])
@permission_classes([IsAdminUser])
def platform_item_stats(request):
    # 🧮 Total number of items on the entire platform
    total_items = Item.objects.count()

    # 🗓️ Group items by creation month
    monthly_stats = (
        Item.objects.annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(total_items=Count('id'))
        .order_by('month')
    )

    formatted_monthly_stats = []
    prev_month_total = None

    for entry in monthly_stats:
        month_name = calendar.month_abbr[entry['month'].month]
        current_total = entry['total_items']

        # 🔢 Calculate percentage change vs previous month
        if prev_month_total is not None and prev_month_total > 0:
            change = ((current_total - prev_month_total) / prev_month_total) * 100
            percentage_change = round(change, 1)
        else:
            percentage_change = 0.0

        formatted_monthly_stats.append({
            "month": month_name,
            "total_items": current_total,
            "percentage_change": percentage_change
        })

        prev_month_total = current_total

    # 📤 Response
    return Response({
        "platform_total_items": total_items,
        "monthly_stats": formatted_monthly_stats
    })





@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_item_stats(request):
    """Return monthly view statistics for the authenticated vendor."""
    if request.user.is_staff:
        vendor_id = request.query_params.get("vendorId")
        items = Item.objects.all()
        if vendor_id:
            items = items.filter(vendor_id=vendor_id)
    else:
        vendor = getattr(request.user, "vendor", None)
        if vendor is None:
            return Response(
                {"detail": "Access denied. User is not a vendor."},
                status=403,
            )
        items = Item.objects.filter(vendor=vendor)

    total_views = items.aggregate(total=Sum("views"))["total"] or 0

    monthly_stats = (
        ItemView.objects
        .filter(item__in=items)
        .annotate(month=TruncMonth("viewed_at"))
        .values("month")
        .annotate(total_views=Count("id"))
        .order_by("month")
    )

    return Response({
        "vendor_id": getattr(request.user.vendor, "id", None) if not request.user.is_staff else request.query_params.get("vendorId"),
        "vendor_name": getattr(request.user.vendor, "username", None) if not request.user.is_staff else None,
        "total_views": total_views,
        "monthly_stats": [
            {
                "month": entry["month"].strftime("%b"),
                "total_views": entry["total_views"],
            }
            for entry in monthly_stats
        ],
    })


# get vendor stats

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_item_growth_stats(request):
    user = request.user

    # ✅ Ensure user is a vendor
    if not hasattr(user, 'vendor'):
        return Response({"detail": "Access denied. User is not a vendor."}, status=403)

    vendor = user.vendor

    # 🧮 Count all items belonging to this vendor, including items
    # created by an admin on the vendor's behalf.
    items = Item.objects.filter(vendor=vendor)

    total_items = items.count()

    # 🗓️ Group items by creation month
    monthly_stats = (
        items.annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(total_items=Count('id'))
        .order_by('month')
    )

    formatted_monthly_stats = []
    prev_month_total = None

    for entry in monthly_stats:
        month_name = calendar.month_abbr[entry['month'].month]
        current_total = entry['total_items']

        # 📈 Calculate percentage change vs previous month
        if prev_month_total is not None and prev_month_total > 0:
            change = ((current_total - prev_month_total) / prev_month_total) * 100
            percentage_change = round(change, 1)
        else:
            percentage_change = 0.0

        formatted_monthly_stats.append({
            "month": month_name,
            "total_items": current_total,
            "percentage_change": percentage_change
        })

        prev_month_total = current_total

    return Response({
        "vendor_id": vendor.id,
        "vendor_name": vendor.username,
        "total_items": total_items,
        "monthly_stats": formatted_monthly_stats
    })
