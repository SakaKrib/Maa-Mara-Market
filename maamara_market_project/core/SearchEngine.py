from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Q
from .models import Item
from .Serializer import ItemSerializer  
from oder.views import IsAuthenticatedOrVisitor

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrVisitor])
def search_items(request):
    query = request.GET.get('q', '').strip()
    if query:
        items = Item.objects.filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        ).order_by('name')[:20]  # limit to 20 results
    else:
        items = Item.objects.none()

    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)
