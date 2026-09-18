from rest_framework import generics, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.contrib.auth import get_user_model

from ReactSerializers.models import (
    AgeVariant, Brand, Category, ColorVariant, Department, Item, Length,
    Section, ShippingDimension, Shoe, SizeStock, SubCategory, Weight, Offer,
)
from shop.models import Reaction, Review
from .models import ActivityLog, CalendarEvent, Notification, Profile

User = get_user_model()

class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = ["discount_percentage", "start_date", "end_date", "final_price"]