from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.db.models import Count
from django.db.models.functions import TruncMonth
import calendar
from .models import Item

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





# get vendor stats

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_item_growth_stats(request):
    user = request.user

    # ✅ Ensure user is a vendor
    if not hasattr(user, 'vendor'):
        return Response({"detail": "Access denied. User is not a vendor."}, status=403)

    vendor = user.vendor

    # 🧮 Get only items created by this vendor
    items = Item.objects.filter(created_by=user)

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
