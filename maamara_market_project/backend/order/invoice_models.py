import uuid

from django.conf import settings
from django.db import models


class Invoice(models.Model):
    TYPE_CUSTOMER = "customer_payment"
    TYPE_VENDOR = "vendor_payout"
    TYPE_CHOICES = (
        (TYPE_CUSTOMER, "Customer Payment"),
        (TYPE_VENDOR, "Vendor Payout"),
    )

    STATUS_ISSUED = "issued"
    STATUS_VOID = "void"
    STATUS_CHOICES = (
        (STATUS_ISSUED, "Issued"),
        (STATUS_VOID, "Void"),
    )

    invoice_number = models.CharField(max_length=40, unique=True, editable=False)
    invoice_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ISSUED)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    visitor_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)

    order = models.ForeignKey(
        "oder.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    payment = models.ForeignKey(
        "oder.Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    transaction = models.ForeignKey(
        "oder.Transaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    payout_reference = models.CharField(max_length=100, blank=True, null=True, db_index=True)

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    provider = models.CharField(max_length=32, blank=True, null=True)
    provider_reference = models.CharField(max_length=255, blank=True, null=True, db_index=True)

    issued_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-issued_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["payment"],
                condition=models.Q(payment__isnull=False),
                name="uniq_invoice_payment",
            ),
            models.UniqueConstraint(
                fields=["invoice_type", "payout_reference"],
                condition=(
                    models.Q(invoice_type="vendor_payout")
                    & models.Q(payout_reference__isnull=False)
                ),
                name="uniq_vendor_payout_invoice",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "invoice_type", "issued_at"]),
            models.Index(fields=["visitor_id", "invoice_type", "issued_at"]),
            models.Index(fields=["provider", "provider_reference"]),
        ]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = f"MM-{self.issued_at:%Y%m%d}-{uuid.uuid4().hex[:10].upper()}" if self.issued_at else f"MM-{uuid.uuid4().hex[:18].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.invoice_number
