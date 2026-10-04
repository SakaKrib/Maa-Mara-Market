from django.conf import settings
from django.db import models


class PesapalTransaction(models.Model):
    STATUS_CHOICES = [
        ("initialized", "Initialized"),
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
        ("invalid", "Invalid"),
        ("refunded", "Refunded"),
    ]

    checkout_session = models.OneToOneField(
        "order.CheckoutSession",
        on_delete=models.CASCADE,
        related_name="pesapal_transaction",
    )
    order = models.OneToOneField(
        "order.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pesapal_transaction",
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    merchant_reference = models.CharField(max_length=100, unique=True, db_index=True)
    order_tracking_id = models.CharField(
        max_length=100, unique=True, null=True, blank=True, db_index=True
    )
    payment_account = models.CharField(max_length=100, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=5, default="KES")
    payment_method = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="initialized")
    pesapal_response = models.JSONField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
