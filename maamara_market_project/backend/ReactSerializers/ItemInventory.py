from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Item
from .Serializers import ItemSerializer

LOW_STOCK_THRESHOLD = 10


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def low_stock_items(request):
    items = Item.objects.filter(in_stock__lte=LOW_STOCK_THRESHOLD, vendor=request.user.vendor)
    return Response(ItemSerializer(items, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def high_stock_items(request):
    items = Item.objects.filter(in_stock__gt=LOW_STOCK_THRESHOLD, vendor=request.user.vendor)
    return Response(ItemSerializer(items, many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_item_stock(request, item_id):
    try:
        vendor = request.user.vendor
    except AttributeError:
        return Response({"detail": "Vendor account required."}, status=status.HTTP_403_FORBIDDEN)

    try:
        item = Item.objects.get(id=item_id, vendor=vendor)
    except Item.DoesNotExist:
        return Response({"detail": "Item not found."}, status=status.HTTP_404_NOT_FOUND)

    value = request.data.get("in_stock")
    if isinstance(value, bool):
        return Response({"detail": "Invalid stock quantity."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        in_stock = int(value)
    except (TypeError, ValueError):
        return Response({"detail": "Invalid stock quantity."}, status=status.HTTP_400_BAD_REQUEST)

    if in_stock < 0:
        return Response({"detail": "Invalid stock quantity."}, status=status.HTTP_400_BAD_REQUEST)

    if item.in_stock == in_stock:
        return Response({"detail": "Stock unchanged.", "in_stock": item.in_stock})

    item.in_stock = in_stock
    item.save(update_fields=["in_stock"])

    # Item's post_save realtime signal is the single source of truth for
    # catalog/inventory broadcasts. Do not send a second, generic stock event.
    return Response({
        "detail": "Stock updated.",
        "item_id": item.id,
        "in_stock": item.in_stock,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stock_range(request):
    try:
        start = int(request.GET.get("start", 0))
        end_raw = request.GET.get("end")
        end = int(end_raw) if end_raw is not None else None
    except (TypeError, ValueError):
        return Response({"detail": "Invalid stock range."}, status=status.HTTP_400_BAD_REQUEST)

    if start < 0 or (end is not None and (end < 0 or end < start)):
        return Response({"detail": "Invalid stock range."}, status=status.HTTP_400_BAD_REQUEST)

    vendor = getattr(request.user, "vendor", None)
    if vendor is None:
        return Response({"detail": "Vendor account required."}, status=status.HTTP_403_FORBIDDEN)

    filters = {"vendor": vendor, "in_stock__gte": start}
    if end is not None:
        filters["in_stock__lte"] = end

    items = Item.objects.filter(**filters)
    return Response(ItemSerializer(items, many=True).data)
