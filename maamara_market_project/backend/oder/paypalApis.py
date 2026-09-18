import json
import logging
import time
import uuid
from decimal import Decimal

import requests
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models, transaction
from django.forms.models import model_to_dict
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ReactSerializers.models import AgeVariant, ColorVariant, Item, Length, Shoe, SizeStock, Weight
from core.models import Notification
from vendorDashboard.models import SoldItem, Vendor

from .capture_order import get_paypal_access_token
from .models import BillingAddress, Customer, Order, Payment, Transaction
from .paymentserializer import CheckoutSerializer, OrderResponseSerializer
from .views import IsAuthenticatedOrVisitor

logger = logging.getLogger(__name__)




@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
@transaction.atomic
def checkout_view(request):
    """
    Checkout API: creates or updates order, billing, payment, and items.
    """
    serializer = CheckoutSerializer(data=request.data)
    if not serializer.is_valid():