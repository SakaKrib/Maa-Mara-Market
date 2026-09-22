from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.db.models import Count, Sum
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from datetime import timedelta\nfrom dateutil.relativedelta import relativedelta
from django.utils import timezone
from order.models import Order, OrderItem
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


def _analytics_period(period):
    today = timezone.localdate()
    if period == "day":
        return today - timedelta(days=29), today, TruncDay
    if period == "week":
        return today - timedelta(weeks=11), today, TruncWeek
    return today.replace(day=1) - timedelta(days=180), today, TruncMonth


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vendor_analytics_stats(request):
    """
    Vendor analytics with a consistent period selector:
      period=day   -> last 30 calendar days
      period=week  -> last 12 weeks
      period=month -> last 6 months
    The same vendor-scoped source data is used for items, views and pending orders.
    """
    vendor = getattr(request.user, "vendor", None)
    if vendor is None:
        return Response({"detail": "Access denied. User is not a vendor."}, status=403)

    period = request.query_params.get("period", "month").lower()
    if period not in {"day", "week", "month"}:
        return Response({"detail": "period must be day, week, or month."}, status=400)

    start, end, truncator = _analytics_period(period)
    start_dt = timezone.make_aware(timezone.datetime.combine(start, timezone.datetime.min.time()))
    end_dt = timezone.make_aware(timezone.datetime.combine(end + timedelta(days=1), timezone.datetime.min.time()))

    items = Item.objects.filter(vendor=vendor)
    views_qs = ItemView.objects.filter(item__in=items, viewed_at__gte=start_dt, viewed_at__lt=end_dt)
    pending_qs = OrderItem.objects.filter(
        item__in=items,
        order__status="pending",
        order__ordered_date__gte=start_dt,
        order__ordered_date__lt=end_dt,
    )

    item_rows = (
        items.filter(created_at__gte=start_dt, created_at__lt=end_dt)
        .annotate(period=truncator("created_at"))
        .values("period")
        .annotate(total=Count("id"))
        .order_by("period")
    )
    view_rows = (
        views_qs.annotate(period=truncator("viewed_at"))
        .values("period")
        .annotate(total=Count("id"))
        .order_by("period")
    )
    pending_rows = (
        pending_qs.annotate(period=truncator("order__ordered_date"))
        .values("period")
        .annotate(total=Count("order_id", distinct=True))
        .order_by("period")
    )

    def serialize(rows):
        return [
            {
                "period": row["period"].isoformat() if hasattr(row["period"], "isoformat") else str(row["period"]),
                "value": row["total"],
            }
            for row in rows
        ]

    return Response({
        "vendor_id": vendor.id,
        "period": period,
        "range": {"start": start.isoformat(), "end": end.isoformat()},
        "totals": {
            "items": items.count(),
            "views": views_qs.count(),
            "pending_orders": pending_qs.values("order_id").distinct().count(),
        },
        "series": {
            "items": serialize(item_rows),
            "views": serialize(view_rows),
            "pending_orders": serialize(pending_rows),
        },
    })
