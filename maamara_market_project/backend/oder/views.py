from datetime import timedelta
from decimal import Decimal

import bleach
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Count, Prefetch, Q, Sum
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from ReactSerializers.models import (
    AgeVariant,
    ColorVariant,
    Item,
    Length,
    Shoe,
    SizeStock,
    Weight,
)
from core.Serializer import ItemSerializer
from core.models import ActivityLog, Voucher, Wallet
from vendorDashboard.models import ReturnRequest

from .Serializers import TransactionSerializer
from .models import OderItem, Order, Transaction


User = get_user_model()


e