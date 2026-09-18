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
from django.template.loader import render_to_string
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ReactSerializers.models import AgeVariant, ColorVariant, Item, Length, Shoe, SizeStock, Weight
from core.models import ActivityLog, Notification
from vendorDashboard.models import SoldItem, Vendor

from .capture_order import get_paypal_access_token
from .shipping import get_rates_for_destination
from .Payment import create_paypal_order
from .Base import get_usd_to_kes_rate
from .models import BillingAddress, Customer, Order, Payment, Transaction