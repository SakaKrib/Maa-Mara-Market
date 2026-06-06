from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Item
from .Serializers import ItemSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

LOW_STOCK_THRESHOLD = 10  # customize

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def low_stock_items(request):
    items = Item.objects.filter(in_stock__lte=LOW_STOCK_THRESHOLD, vendor=request.user.vendor)
    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def high_stock_items(request):
    items = Item.objects.filter(in_stock__gt=LOW_STOCK_THRESHOLD, vendor=request.user.vendor)
    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_item_stock(request, item_id):
    try:
        item = Item.objects.get(id=item_id, vendor=request.user.vendor)
    except Item.DoesNotExist:
        return Response({"detail": "Item not found."}, status=status.HTTP_404_NOT_FOUND)

    in_stock = request.data.get('in_stock')

    if in_stock is None or not isinstance(in_stock, int) or in_stock < 0:
        return Response({"detail": "Invalid stock quantity."}, status=status.HTTP_400_BAD_REQUEST)

    # Update stock
    item.in_stock = in_stock
    item.save()

    # 🔥 WebSocket Broadcast
    channel_layer = get_channel_layer()
    vendor_id = request.user.vendor.id

    async_to_sync(channel_layer.group_send)(
        f"stock_{vendor_id}",       # WebSocket group name
        {
            "type": "stock_update", # maps to consumer method
            "message": "updated"
        }
    )

    return Response({
        "detail": "Stock updated.",
        "in_stock": item.in_stock
    })


# stock range filter
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_range(request):
    start = int(request.GET.get("start", 0))
    end = request.GET.get("end")
    vendor = request.user.vendor

    if end is None:
        items = Item.objects.filter(in_stock__gte=start, vendor=vendor)
    else:
        end = int(end)
        items = Item.objects.filter(in_stock__gte=start, in_stock__lte=end, vendor=vendor)

    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)
