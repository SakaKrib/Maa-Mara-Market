from django.db import models
from django.contrib.auth.models import User
from ReactSerializers.models import Item, ColorVariant, AgeVariant, SizeStock
from django.shortcuts import reverse
from django.conf import settings
from django_countries.fields import CountryField
from core.models import Wallet, Voucher, Referral
from django.utils import timezone
from django.db.models import Sum
from vendorDashboard.models import Vendor
from decimal import Decimal, InvalidOperation
import math
from .Base import get_usd_to_kes_rate

#billing address model

class BillingAddress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        blank=True, 
        null=True
    )
    visitor_id = models.CharField(max_length=255, blank=True, null=True)  # ✅ support guest checkout
    
    first_name = models.CharField(max_length=100, default="")
    last_name = models.CharField(max_length=100, default="")
    phone = models.CharField(max_length=20, default='+254712345678')
    email = models.EmailField(default='user@gmail.com')

    street_address = models.CharField(max_length=100, default='Kitisuru')
    appartment_address = models.CharField(max_length=100, blank=True, null=True, default='New Kitisuru')
    city = models.CharField(max_length=100, default='Nairobi')
    state = models.CharField(max_length=100, blank=True, null=True)
    country = CountryField(multiple=False, default='KE')  # ISO code is better than full name
    zip = models.CharField(max_length=20, default='0100')

    def __str__(self):
        if self.user:
            return f"{self.first_name} {self.last_name} (User {self.user.username})"
        return f"{self.first_name} {self.last_name} (Visitor {self.visitor_id})"
    

# payment model

class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("Mpesa", "Mpesa"),
        ("PayPal", "PayPal"),
        ("card", "Card")
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True
    )
    
    visitor_id = models.CharField(max_length=255, null=True, blank=True)  # ✅ track guest payments
    
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='Mpesa')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)  # PayPal/Mpesa ref
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("completed", "Completed"), ("failed", "Failed")],
        default="pending",
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        owner = self.user.username if self.user else f"Visitor {self.visitor_id}"