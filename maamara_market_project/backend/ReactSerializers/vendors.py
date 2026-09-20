# items/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets, generics
from .Serializers import VendorItemSerializer
# views.py
from rest_framework.generics import RetrieveUpdateAPIView
from .models import Item
from .Serializers import *
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import *
from rest_framework.permissions import IsAuthenticated
from core.models import *
from django.core.mail import send_mail
import random
from datetime import timezone as dt_timezone ,datetime
from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view
from rest_framework.decorators import action, api_view,permission_classes
from vendorDashboard.models import *
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import parser_classes
from rest_framework.permissions import IsAdminUser, AllowAny, IsAuthenticated
from decimal import Decimal
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from .Serializers import *
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import Item, ColorVariant, SizeStock, AgeVariant
from .Serializers import ItemSerializers
from rest_framework.permissions import IsAuthenticated
import json
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.template.loader import render_to_string
import bleach # type: ignore 
from urllib.parse import urlparse, unquote
from order.Base import IsVendor




# Reusable sanitizer
def sanitize(value):
    if isinstance(value, str):
        return bleach.clean(value)
    return value


class VendorItemCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def post(self, request):
        serializer = VendorItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)






#fetch vendor profile
# -------------------------------
# Vendor Profile
# -------------------------------
class VendorProfileView(generics.RetrieveAPIView):
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def get_object(self):
        return Vendor.objects.get(user=self.request.user)

# -------------------------------
# Vendor Item
# -------------------------------
class VendorItemViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = ItemSerializers
    permission_classes = [IsAuthenticated, IsVendor]

    def get_queryset(self):
