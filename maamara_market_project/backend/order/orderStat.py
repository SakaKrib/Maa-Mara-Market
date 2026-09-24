from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
import calendar

from .models import OrderItem, Order
from ReactSerializers.models import Item  

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_pending_orders(request):
    user = request.user

    if not hasattr(user, 'vendor'):
        return Response({"detail": "Access denied. User is not a vendor."}, status=403)

    vendor = user.vendor

    # ✅ Vendor's items
    vendor_items = Item.objects.filter(vendor=vendor)

    # ✅ All pending orders that include vendor’s items
    pending_orders = Order.objects.filter(
        order_items__item__in=vendor_items,
        status__in=["PENDING_PAYMENT", "pending"]
    ).distinct()

    # 🗓️ Monthly grouping (based on created_at)
    monthly_stats = (
        pending_orders.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(total_pending_orders=Count("id"))
        .order_by("month")
    )

    formatted_monthly_stats = []
    previous_total = None

    for entry in monthly_stats:
        month_name = calendar.month_abbr[entry["month"].month]
        total = entry["total_pending_orders"]

        # Calculate percentage change from previous month
        if previous_total is not None and previous_total > 0:
            percentage_change = ((total - previous_total) / previous_total) * 100
        else:
            percentage_change = 0.0

        formatted_monthly_stats.append({
            "month": month_name,
            "total_pending_orders": total,
            "percentage_change": round(percentage_change, 2),
        })

        previous_total = total

    # 🧾 Pending order list (optional)
    order_list = [
        {
            "order_id": o.id,
            "order_status": o.status,
            "total_vendor_items": o.order_items.filter(item__in=vendor_items).count(),
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in pending_orders
    ]

    return Response({
        "vendor_id": vendor.id,
        "vendor_name": getattr(vendor.user, "username", str(vendor)),
        "total_pending_orders": pending_orders.count(),
        "pending_orders": order_list,
        "monthly_stats": formatted_monthly_stats,
    })




# cendor pending order objects
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_pending_order_items(request):
    user = request.user

    # ✅ Ensure user is a vendor
    if not hasattr(user, "vendor"):
        return Response({"detail": "Access denied. User is not a vendor."}, status=403)

    vendor = user.vendor

    # ✅ Get vendor's items
    vendor_items = Item.objects.filter(vendor=vendor)

    # ✅ Find all pending orders containing vendor's items (via ManyToMany)
    pending_orders = Order.objects.filter(
        order_items__item__in=vendor_items,
        status__in=["PENDING_PAYMENT", "pending"]
    ).distinct()

    # ✅ Collect all order items from those orders (works only if reverse relation exists)
    pending_order_items = OrderItem.objects.filter(
        item__in=vendor_items,
        order__in=pending_orders
    ).select_related("item", "order")

    # ⚠️ If `OrderItem` has NO `order` FK, handle via nested access:
    if not hasattr(OrderItem, "order"):
        order_item_pairs = []
        for order in pending_orders.prefetch_related("items__item"):
            for oi in order.items.all():
                if oi.item in vendor_items:
                    order_item_pairs.append((order, oi))

        total_items = len(order_item_pairs)
        total_quantity = sum(oi.quantity for _, oi in order_item_pairs)

        items_data = []
        for order, oi in order_item_pairs:
            item = oi.item

            base_price = getattr(item, "price", 0) or 0
            discount_price = getattr(item, "discount_price", None)
            discount_percent = getattr(item, "discount", None)

            if discount_price and discount_price > 0 and discount_price < base_price:
                item_price = discount_price
            elif discount_percent and 0 < discount_percent < 100:
                item_price = base_price * (1 - (discount_percent / 100))
            else:
                item_price = base_price

            if getattr(order, "user", None):
                customer_name = order.user.username
            elif getattr(order, "visitor_id", None):
                customer_name = f"Visitor ({order.visitor_id[:8]})"
            else:
                customer_name = "Unknown"

            items_data.append({
                "order_id": order.id,
                "order_status": order.status,
                "item_name": item.name,
                "item_price": float(item_price or 0),
                "quantity": oi.quantity,
                "customer": customer_name,
                "created_at": order.created_at.isoformat() if order.created_at else None,
            })

        return Response({
            "vendor_id": vendor.id,
            "vendor_name": getattr(vendor.user, "username", str(vendor)),
            "total_pending_items": total_items,
            "total_quantity": total_quantity,
            "pending_items": items_data,
        })

    # If OrderItem has an `order` field:
    total_items = pending_order_items.count()
    total_quantity = pending_order_items.aggregate(total_qty=Sum("quantity"))["total_qty"] or 0

    items_data = []
    for oi in pending_order_items:
        order = oi.order
        item = oi.item

        item_price = getattr(oi, "price", getattr(item, "price", 0))
        if hasattr(item, "get_item_final_price"):
            try:
                item_price = item.get_item_final_price()
            except Exception:
                pass

        if getattr(order, "user", None):
            customer_name = order.user.username
        elif getattr(order, "visitor_id", None):
            customer_name = f"Visitor ({order.visitor_id[:8]})"
        else:
            customer_name = "Unknown"

        items_data.append({
            "order_id": order.id,
            "order_status": order.status,
            "item_name": item.name,
            "item_price": float(item_price or 0),
            "quantity": oi.quantity,
            "customer": customer_name,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "variant": {
                "id": oi.color_variant_id,
                "color": oi.color_variant.color if oi.color_variant else None,
            },
            "size": {
                "id": oi.size_stock_id,
                "value": oi.size_stock.size if oi.size_stock else None,
                "quantity_in_stock": oi.size_stock.quantity_in_stock if oi.size_stock else None,
            },
            "age_group": oi.age_variant.age_group if oi.age_variant else None,
            "selected_length": oi.selected_length,
            "selected_weight": oi.selected_weight,
            "shoe_size": oi.shoe_size,
        })

    return Response({
        "vendor_id": vendor.id,
        "vendor_name": getattr(vendor.user, "username", str(vendor)),
        "total_pending_items": total_items,
        "total_quantity": total_quantity,
        "pending_items": items_data,
    })


# complete orders
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_completed_order_items(request):
    user = request.user

    # Ensure user has a related vendor profile
    if not hasattr(user, "vendor"):
        return Response({"detail": "Access denied. User is not a vendor."}, status=403)

    vendor = user.vendor

    # Resolve completed orders from the vendor's actual catalog.
    vendor_items = Item.objects.filter(vendor=vendor)

    # Get completed orders containing vendor's items
    completed_orders = Order.objects.filter(
        order_items__item__in=vendor_items,
        status__in=["COMPLETED", "completed"]
    ).distinct()

    # Get OderItems from these completed orders for this vendor's items
    completed_order_items = OrderItem.objects.filter(
        item__in=vendor_items,
        order__in=completed_orders
    ).select_related("item", "order")

    total_items = completed_order_items.count()
    total_quantity = completed_order_items.aggregate(total_qty=Sum("quantity"))["total_qty"] or 0

    items_data = []
    for oi in completed_order_items:
        order = oi.order
        item = oi.item

        base_price = item.price or 0
        discount_price = item.discount_price
        discount_percent = item.percentage_discount

        if discount_price and 0 < discount_price < base_price:
            item_price = discount_price
        elif discount_percent and 0 < discount_percent < 100:
            item_price = base_price * (1 - discount_percent / 100)
        else:
            item_price = base_price

        if order.user:
            customer_name = order.user.username
        elif order.visitor_id:
            customer_name = f"Visitor ({order.visitor_id[:8]})"
        else:
            customer_name = "Unknown"

        items_data.append({
            "order_id": order.id,
            "order_status": order.status,
            "item_name": item.name,
            "item_price": float(item_price),
            "quantity": oi.quantity,
            "customer": customer_name,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "variant": {
                "id": oi.color_variant_id,
                "color": oi.color_variant.color if oi.color_variant else None,
            },
            "size": {
                "id": oi.size_stock_id,
                "value": oi.size_stock.size if oi.size_stock else None,
                "quantity_in_stock": oi.size_stock.quantity_in_stock if oi.size_stock else None,
            },
            "age_group": oi.age_variant.age_group if oi.age_variant else None,
            "selected_length": oi.selected_length,
            "selected_weight": oi.selected_weight,
            "shoe_size": oi.shoe_size,
        })

    return Response({
        "vendor_id": vendor.id,
        "vendor_name": getattr(vendor.user, 'username', str(vendor)),
        "total_completed_items": total_items,
        "total_quantity": total_quantity,
        "completed_items": items_data,
    })