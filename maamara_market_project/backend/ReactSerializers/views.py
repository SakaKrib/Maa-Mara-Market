
# shop/views.py
from rest_framework import viewsets, permissions
from vendorDashboard.models import Vendor, VendorPayout
from .Serializers import VendorPublicSerializer, VendorPayoutSerializer, AdminProfilePic
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action, api_view,permission_classes, authentication_classes
from django.http import JsonResponse
from vendorDashboard.views import get_monthly_vendor_report
from vendorDashboard.views import get_month_range, get_vendor_earnings
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.forms.models import model_to_dict
from django.http import JsonResponse
from datetime import date
from calendar import monthrange
from rest_framework import generics

from core.models import Profile
from .models import Item
from django.db.models import Sum, Count
import calendar
from django.db.models.functions import TruncMonth
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import _json
from django.contrib.auth import get_user_model
from allauth.socialaccount.models import SocialToken, SocialAccount
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken
from .users import *
from .views import *
from .Serializers import *
from vendorDashboard.models import *
from core.models import *
from django.core.mail import send_mail
import random
from datetime import timezone as dt_timezone ,datetime, timedelta
from django.views.decorators.http import require_POST