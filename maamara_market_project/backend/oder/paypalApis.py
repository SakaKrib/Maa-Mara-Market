import logging
import uuid
from decimal import Decimal

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ReactSerializers.models import AgeVariant, ColorVariant, Item, Length, Shoe, SizeStock, Weight

from .Payment import capture_paypal_order, create_paypal_order
from .models import BillingAddress, Customer, Order, Payment
from .paymentserializer import CheckoutSerializer, OrderResponseSerializer
from .views import IsAuthenticatedOrVisitor

logger = logging.getLogger(__name__)

@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def paypal_create_order(request):
    amount = request.data.get("amount", "10.00")
    paypal_order = create_paypal_order(amount)

    # Bind the provider order ID to the customer's pending order immediately.
    # This lets a webhook resolve the correct local order even if it arrives
    # before the capture endpoint is called.
    if request.user and request.user.is_authenticated:
        pending_order = Order.objects.filter(
            user=request.user,
            status="pending",
        ).order_by("-id").first()
    else: