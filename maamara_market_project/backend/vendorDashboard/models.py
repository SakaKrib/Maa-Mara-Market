from datetime import timedelta, date
import random
import uuid
from decimal import Decimal
from calendar import monthrange

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.core.validators import RegexValidator
from django.db import models, transaction
from django.utils import timezone

from core.models import Notification
from ReactSerializers.models import Brand, Item
from order.models import OrderItem



class Vendor(models.Model):
    # ========== Personal Details ==========
    # item = models.OneToOneField('ReactSerializers.Item', related_name='vendors') 
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    surname_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, null=True, blank=True)
    first_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=15)

    username = models.CharField(
        max_length=16,
        unique=True,
        
    )

    email = models.EmailField(unique=True)
    id_number = models.CharField(max_length=12)
    vendor_code = models.CharField(max_length=20, unique=True)
    vendor_id = models.IntegerField(unique=True, blank=True, null=True)

    country = models.CharField(max_length=100, default='')
    city = models.CharField(max_length=100, default='')
    address = models.CharField(max_length=100,default='')
    address_2 = models.CharField(max_length=100, default='')

    YES_NO_CHOICES = (
        ('yes', 'Yes'),
        ('no', 'No')
    )

    # ========== Product Details ==========
    product_type = models.CharField(max_length=255)
    is_food = models.CharField(max_length=10)
    Are_You_KEBS_certified = models.CharField(
        max_length=10, choices=YES_NO_CHOICES, default='yes', blank=True, null=True
    )
    product_description = models.CharField(max_length=500)

    # ========== Company Details ==========
    company_name = models.CharField(max_length=255)
    workshop_location = models.TextField()
    vendor_company_logo = models.ImageField(upload_to='vendor_logos/', blank=True, null=True)

    # ========== Payment Details ==========
    PAYMENT_METHOD_CHOICES = [
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('MOBILE_MONEY', 'M-pesa'),
        ('PAYPAL', 'PayPal'),
    ]
    MPESA_TYPE_CHOICES = [
        ('PHONE', 'Phone Number'),
        ('TILL', 'Till Number'),
        ('LIPA_NA_MPESA', 'Paybill'),
    ]

    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='BANK_TRANSFER')

   
    # ======== Bank Transfer Details =========
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    bank_branch = models.CharField(max_length=255, blank=True, null=True)
    bank_account_name = models.CharField(max_length=255, blank=True, null=True)
    bank_account_number = models.CharField(max_length=50, blank=True, null=True)

    # For international transfers
    bank_swift_code = models.CharField(max_length=20, blank=True, null=True)
    bank_iban = models.CharField(max_length=50, blank=True, null=True)
    bank_country = models.CharField(max_length=100, blank=True, null=True)
    bank_currency = models.CharField(max_length=10, blank=True, null=True)
    intermediary_bank_name = models.CharField(max_length=255, blank=True, null=True)
    intermediary_swift_code = models.CharField(max_length=20, blank=True, null=True)

    # M-Pesa Fields
    mpesa_type = models.CharField(max_length=20, choices=MPESA_TYPE_CHOICES, blank=True, null=True)
    mpesa_number = models.CharField(max_length=20, blank=True, null=True)
    mpesa_till = models.CharField(max_length=20, blank=True, null=True)
    mpesa_paybill = models.CharField(max_length=20, blank=True, null=True)
    # Account number to credit at the vendor's Paybill (Daraja AccountReference).
    mpesa_paybill_account = models.CharField(max_length=50, blank=True, null=True)

    # PayPal
    paypal_email = models.EmailField(blank=True, null=True)

    # Payout-destination change tracking. A changed destination is held for a
    # cooling-off period before any money is sent to it (see payout_guard).
    payout_destination_hash = models.CharField(max_length=64, blank=True, default="")
    payout_destination_changed_at = models.DateTimeField(null=True, blank=True)

    # ========== Optional Details ==========
    tax_number = models.CharField(max_length=50, null=True, blank=True)
    website_url = models.URLField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='vendor_profiles/', null=True, blank=True)
    social_media_links = models.JSONField(null=True, blank=True)
    brand = models.OneToOneField(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name="vendor")

    # Item data
    # item_list = models.JSONField(null=True, blank=True)
    # item_pdf = models.FileField(upload_to='vendor_item_pdfs/', null=True, blank=True)

    # ========== Meta ==========
    date_created = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    date_updated = models.DateTimeField(auto_now=True)  # Fixed: use `auto_now=True` for updates

    # Optional: method to get unified display value
    def get_payment_display_value(self):
        if self.payment_method == "BANK_TRANSFER":
            return (
                f"Bank: {self.bank_name or 'N/A'}, "
                f"Branch: {self.bank_branch or 'N/A'}, "
                f"Account: {self.bank_account_number or 'N/A'}, "
                f"SWIFT: {self.bank_swift_code or 'N/A'}"
            )
        elif self.payment_method == "MOBILE_MONEY":
            if self.mpesa_type == "PHONE":
                return f"M-Pesa Phone: {self.mpesa_number}"
            elif self.mpesa_type == "TILL":
                return f"M-Pesa Till: {self.mpesa_till}"
            elif self.mpesa_type == "LIPA_NA_MPESA":
                return f"M-Pesa Paybill: {self.mpesa_paybill} (account {self.mpesa_paybill_account or 'N/A'})"
        elif self.payment_method == "PAYPAL":
            return f"PayPal: {self.paypal_email}"
        return "No payment details available"

    
    def save(self, *args, **kwargs):
        if not self.vendor_id:
            self.vendor_id = self.user.id

        if not self.vendor_code:
            last_code = 0
            for existing_code in Vendor.objects.exclude(pk=self.pk).values_list("vendor_code", flat=True):
                try:
                    last_code = max(last_code, int(existing_code))
                except (TypeError, ValueError):
                    continue
            self.vendor_code = str(last_code + 1)

        # Start (or restart) the cooling-off period whenever the payout
        # destination changes, whichever code path saved the vendor.
        from vendorDashboard.payout.services.payout_guard import refresh_destination_state
        if refresh_destination_state(self) and kwargs.get("update_fields") is not None:
            kwargs["update_fields"] = set(kwargs["update_fields"]) | {
                "payout_destination_hash", "payout_destination_changed_at",
            }

        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.first_name} - {self.user.id}'

    
# Vendor registration drafts
class VendorDraft(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    visitor_id = models.UUIDField(null=True, blank=True)
    data = models.JSONField(default=dict)
    draft_images = models.JSONField(default=list, blank=True)
    # Identity images added by migration 0026; kept so that migration history and
    # the model agree and no existing draft column is dropped.
    company_logo = models.ImageField(upload_to="vendor_drafts/company_logos/", blank=True, null=True)
    profile_picture = models.ImageField(upload_to="vendor_drafts/profile_pictures/", blank=True, null=True)
    status = models.CharField(max_length=20, default="DRAFT")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()


class VendorDraftImage(models.Model):
    draft = models.ForeignKey(VendorDraft, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="vendor_drafts/")
    item_index = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)


# vendor request save temoralily

class ItemDraft(models.Model):
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("SUBMITTED", "Submitted"),
        ("COMPLETED", "Completed"),
        ("ABANDONED", "Abandoned"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="item_drafts",
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="item_drafts",
    )
    data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    created_item = models.ForeignKey(
        "ReactSerializers.Item",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_drafts",
    )
    created_request = models.ForeignKey(
        "VendorItemRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_draft_links",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["owner", "status", "-updated_at"]),
            models.Index(fields=["vendor", "status", "-updated_at"]),
        ]

    def __str__(self):
        return f"{self.owner_id} - {self.status} - {self.id}"


class ItemDraftMedia(models.Model):
    MEDIA_TYPE_CHOICES = [
        ("image", "Image"),
        ("video", "Video"),
    ]

    KIND_CHOICES = [
        ("main", "Main image"),
        ("gallery", "Gallery image"),
        ("variant", "Variant image"),
        ("video", "Product video"),
    ]

    draft = models.ForeignKey(
        ItemDraft,
        on_delete=models.CASCADE,
        related_name="media",
    )
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)
    slot_key = models.CharField(max_length=120)
    variant_key = models.CharField(max_length=100, blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)
    file = models.FileField(upload_to="item_drafts/")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["draft", "slot_key"],
                name="unique_item_draft_media_slot",
            )
        ]
        ordering = ("sort_order", "id")

    def __str__(self):
        return f"{self.draft_id} - {self.slot_key}"


class VendorRequest(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    vendor_data = models.JSONField()  # All form fields
    item_pdf = models.FileField(upload_to='vendor_items/', null=True, blank=True)
    item_list = models.JSONField(null=True, blank=True)  # If not using PDF
    brand_object = models.JSONField(null=True, blank=True)  # If not using PDF
    status = models.CharField(max_length=10, choices=[
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')],
        default='pending'
    )
    otp = models.CharField(max_length=6, null=True, blank=True, unique=True)
    date_submitted = models.DateTimeField(auto_now_add=True)
    seen = models.BooleanField(default=False)

    OTP_EXPIRY_MINUTES = 3  # OTP valid duration

    def clean(self):
        if not self.item_pdf and not self.item_list:
            raise ValidationError("Either item PDF or item list must be provided.")

    # ---------------------------
    # OTP Generation & Email
    # ---------------------------
    def generate_otp(self):
        while True:
            otp = f"{random.randint(0, 999999):06d}"
            if not VendorRequest.objects.filter(otp=otp).exists():
                break
        self.otp = otp
        self.date_submitted = timezone.now()
        self.status = 'pending'
        self.save(update_fields=['otp', 'date_submitted', 'status'])
        self.send_otp_email()
        return otp

    def send_otp_email(self):
        subject = "🔐 Your Vendor Verification OTP"
        text_content = (
            f"Hi {self.user.first_name},\n\n"
            "Thank you for registering as a vendor on Maa Mara Market.\n"
            f"Your One-Time Password (OTP) is: {self.otp}\n"
            f"Please enter this code within {self.OTP_EXPIRY_MINUTES} minutes to continue your registration.\n\n"
            "If you did not request this OTP, please ignore this email.\n\n"
            "Best regards,\nMaa Mara Market Team"
        )
        html_content = render_to_string(
            "emails/vendor_otp.html",
            {
                "first_name": self.user.first_name,
                "otp": self.otp,
                "otp_expiry_minutes": self.OTP_EXPIRY_MINUTES,
                "frontend_url": settings.FRONTEND_URL,
                "company_address": getattr(settings, "COMPANY_ADDRESS", ""),
            },
        )

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[self.user.email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send()

    # ---------------------------
    # OTP Verification
    # ---------------------------
    def verify_otp(self, input_otp):
        if self.otp != input_otp:
            return False, "Invalid OTP"

        expiry_time = self.date_submitted + timedelta(minutes=self.OTP_EXPIRY_MINUTES)
        if timezone.now() > expiry_time:
            self.otp = None
            self.save(update_fields=['otp'])
            return False, "OTP expired"

        # Mark request as verified
        self.status = 'verified'
        self.otp = None  # Clear OTP
        self.save(update_fields=['status', 'otp'])

        user = self.user
        vendor_email = user.email

        # Send the vendor confirmation using the shared branded email layout.
        subject_vendor = "Vendor Registration Verified"
        text_content_vendor = (
            f"Hi {user.first_name or user.username},\n\n"
            "Your vendor registration has been successfully verified. "
            "You will be notified once your request is fully processed.\n\n"
            "Thank you for choosing Maa Mara Market!"
        )
        html_content_vendor = render_to_string(
            "emails/vendor_verified.html",
            {
                "first_name": user.first_name or user.username,
                "frontend_url": settings.FRONTEND_URL,
                "company_address": getattr(settings, "COMPANY_ADDRESS", ""),
            },
        )

        vendor_email_obj = EmailMultiAlternatives(
            subject=subject_vendor,
            body=text_content_vendor,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[vendor_email],
        )
        vendor_email_obj.attach_alternative(html_content_vendor, "text/html")
        vendor_email_obj.send()

        # Notify the configured admin inbox with the same branded email shell.
        subject_admin = "✅ New Verified Vendor Request"
        text_content_admin = (
            f"Vendor {user.username} ({vendor_email}) has verified their registration OTP. "
            "Please review and approve their request."
        )
        review_url = f"{settings.BACKEND_PUBLIC_URL.rstrip('/')}/admin/vendor-requests/{self.id}/"
        html_content_admin = render_to_string(
            "emails/vendor_verified_admin.html",
            {
                "username": user.username,
                "vendor_email": vendor_email,
                "review_url": review_url,
                "frontend_url": settings.FRONTEND_URL,
                "company_address": getattr(settings, "COMPANY_ADDRESS", ""),
            },
        )

        admin_email_obj = EmailMultiAlternatives(
            subject=subject_admin,
            body=text_content_admin,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.EMAIL_HOST_USER],
        )
        admin_email_obj.attach_alternative(html_content_admin, "text/html")
        admin_email_obj.send()

        # Create each notification through model.save()/post_save so the
        # shared notification dispatcher can also send native push alerts.
        # bulk_create() bypasses Django post_save signals.
        admin_users = User.objects.filter(is_staff=True)
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                title="New Vendor Request Verified",
                message=f"User '{user.username}' has verified their OTP and submitted a vendor request.",
                vendor_request=self,
                url=f"/admin/vendor-requests/{self.id}/review",
            )

        return True, "OTP verified successfully"

    # ---------------------------
    # OTP Expiry & Resend
    # ---------------------------
    def otp_is_expired(self):
        if not self.otp:
            return True
        expiry_time = self.date_submitted + timedelta(minutes=self.OTP_EXPIRY_MINUTES)
        return timezone.now() > expiry_time

    def resend_otp(self):
        if not self.otp or self.otp_is_expired():
            new_otp = self.generate_otp()
            return True, f"New OTP sent: {new_otp}"
        else:
            expiry_time = self.date_submitted + timedelta(minutes=self.OTP_EXPIRY_MINUTES)
            seconds_left = (expiry_time - timezone.now()).total_seconds()
            return False, f"OTP still valid. Please wait {int(seconds_left)} seconds before resending."

    

#sold item model

class SoldItem(models.Model):

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='sold_items')
    vendor = models.ForeignKey('vendorDashboard.Vendor', on_delete=models.CASCADE, related_name='sold_items')
    color_variant = models.ForeignKey(
        "ReactSerializers.ColorVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sold_items",
    )
    size_stock = models.ForeignKey(
        "ReactSerializers.SizeStock",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sold_items",
    )
    age_variant = models.ForeignKey(
        "ReactSerializers.AgeVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sold_items",
    )
    quantity = models.PositiveIntegerField()
    selected_weight = models.CharField(max_length=50, null=True, blank=True)
    selected_length = models.CharField(max_length=50, null=True, blank=True)
    shoe_size = models.CharField(max_length=50, null=True, blank=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    date_sold = models.DateTimeField(auto_now_add=True)

    def _stock_target(self):
        if self.size_stock_id:
            return self.size_stock
        if self.age_variant_id:
            return self.age_variant
        return self.item

    def clean(self):
        if self.pk is not None or getattr(self, "_stock_already_deducted", False):
            return

        stock_target = self._stock_target()
        available = getattr(stock_target, "quantity_in_stock", None)
        if available is None:
            available = getattr(self.item, "in_stock", 0) or 0

        if self.quantity > available:
            raise ValidationError(
                f"Cannot sell {self.quantity} units; only {available} in stock."
            )

    def save(self, *args, **kwargs):
        self.clean()

        if self.sale_price is None:
            if self.item.discount_price and self.item.discount_price < self.item.price:
                self.sale_price = self.item.discount_price
            else:
                self.sale_price = self.item.price

        self.total_price = self.quantity * self.sale_price

        with transaction.atomic():
            if self.pk is None and not getattr(self, "_stock_already_deducted", False):
                if self.size_stock_id:
                    self.size_stock.quantity_in_stock -= self.quantity
                    self.size_stock.save(update_fields=["quantity_in_stock"])
                elif self.age_variant_id:
                    self.age_variant.quantity_in_stock -= self.quantity
                    self.age_variant.save(update_fields=["quantity_in_stock"])
                elif self.color_variant_id:
                    remaining = (
                        self.color_variant.sizes.aggregate(total=models.Sum("quantity_in_stock"))["total"]
                        or 0
                    )
                    if self.quantity > remaining:
                        raise ValidationError("Not enough variant stock available.")
                    remaining_to_deduct = self.quantity
                    for size in self.color_variant.sizes.select_for_update().order_by("id"):
                        if remaining_to_deduct <= 0:
                            break
                        deduction = min(size.quantity_in_stock, remaining_to_deduct)
                        size.quantity_in_stock -= deduction
                        size.save(update_fields=["quantity_in_stock"])
                        remaining_to_deduct -= deduction
                else:
                    self.item.in_stock = (self.item.in_stock or 0) - self.quantity
                    if self.item.in_stock < 0:
                        raise ValidationError("Not enough stock available after deduction.")
                    self.item.save(update_fields=["in_stock"])

            super(SoldItem, self).save(*args, **kwargs)

    def __str__(self):
        return f"Sold {self.quantity} of {self.item.name} by {self.vendor.company_name}"

    class Meta:
        ordering = ['-date_sold']

#Vendor Adjustment models intergration
class VendorAdjustment(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="adjustments")
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, null=True, blank=True)
    # Add this field 👇
    is_approved = models.BooleanField(default=False)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    PREFERENCE_CHOICES = [
        ('refund', 'Refund'),
        ('exchange', 'Exchange'),
    ]
    customer_preference = models.CharField(
        max_length=10,
        choices=PREFERENCE_CHOICES,
        default='refund'
    )
    applied = models.BooleanField(default=False)

# MODEL TO HANDLE RETURNS
# vendorDashboard/models.py

class ReturnRequest(models.Model):
    PREFERENCE_REASONS = [
        ('damaged', 'The item was delivered broken.'),
        ('not_exact', 'Not the exact item I expected.'),
        ('missing', 'The item is missing.'),
        ('rejected', "I’ve changed my mind — I don’t want it anymore."),
        ('get_something_else', 'I want to get something else instead.'),
        ('broken', 'I broke the item unknowingly. Can it be fixed?'),
        ('dont_want_to_explain', 'I don’t want to explain!'),
        ('custom', 'Other (custom reason)'),
    ]

    PREFERENCE_CHOICES = [
        ('refund', 'Refund'),
        ('exchange', 'Exchange'),
    ]

    vendor_adjustment = models.ForeignKey(
        'vendorDashboard.VendorAdjustment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='returns'
    )
    customer = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='return_requests'
    )
    visitor_id = models.CharField(max_length=255, null=True, blank=True)
    item = models.ForeignKey('oder.OrderItem', on_delete=models.CASCADE)
    reason = models.TextField(max_length=100, choices=PREFERENCE_REASONS, null=True, blank=True)
    description = models.TextField(max_length=400, blank=True, null=True)
    custom_reason = models.TextField(null=True, blank=True, help_text="Used when reason is 'custom'.")
    image = models.ImageField(upload_to='returns/', null=True, blank=True)

    # Existing workflow flags
    approved = models.BooleanField(default=False)
    processed = models.BooleanField(default=False)
    refund_issued = models.BooleanField(default=False)
    start_refund = models.BooleanField(default=False)

    # Admin control fields
    admin_action = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending'
    )
    admin_note = models.TextField(blank=True, null=True)

    customer_preference = models.CharField(
        max_length=10,
        choices=PREFERENCE_CHOICES,
        default='refund'
    )

    # Admin decision tracking
    approved_by_admin = models.BooleanField(default=False)
    status = models.CharField(
        max_length=50,
        default="pending",
        choices=[
            ("pending", "Pending"),
            ("approved_refund", "Approved - Refund"),
            ("approved_exchange", "Approved - Exchange"),
            ("rejected", "Rejected"),
        ],
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["item"],
                name="uniq_return_request_per_order_item",
            ),
        ]
        indexes = [
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["visitor_id", "status"]),
        ]

    def __str__(self):
        user_display = self.customer.username if self.customer else f"Visitor {self.visitor_id}"
        return f"Return for {self.item} by {user_display}"

# Vendor payout intergration
# VendorPayout model

def default_payout_period_start():
    today = date.today()
    return date(today.year, today.month, 1)

def default_payout_period_end():
    today = date.today()
    last_day = monthrange(today.year, today.month)[1]
    return date(today.year, today.month, last_day)

class VendorPayout(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='payouts')
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Net payout
   
    gross_sales = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    adjustment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    adjustments = models.ManyToManyField(VendorAdjustment, blank=True)  # ✅ Link multiple adjustments
    income = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # with markup
    profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reference = models.CharField(max_length=100, blank=True, unique=True)
    paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    #mpesa data
    mpesa_conversation_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    mpesa_originator_conversation_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    mpesa_transaction_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    mpesa_result_code = models.IntegerField(blank=True, null=True)
    mpesa_result_desc = models.CharField(max_length=255, blank=True, null=True)

    # KCB bank-transfer provider correlation/status
    kcb_transaction_reference = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    kcb_message_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    kcb_provider_status = models.CharField(max_length=50, null=True, blank=True)
    kcb_provider_reference = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    kcb_result_description = models.CharField(max_length=255, null=True, blank=True)

    # paypal details
    paypal_payout_item_id = models.CharField(max_length=255, null=True, blank=True)
    paypal_transaction_id = models.CharField(max_length=255, null=True, blank=True)
    paypal_transaction_status = models.CharField(max_length=100, null=True, blank=True)
    paypal_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    paypal_currency = models.CharField(max_length=10, null=True, blank=True)
    paypal_batch_id = models.CharField(max_length=255, null=True, blank=True)

    # Who sent this payout, and from where. Written by payout_guard before the
    # provider is contacted, so the record exists even if the call never returns.
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="initiated_vendor_payouts",
    )
    initiated_at = models.DateTimeField(null=True, blank=True)
    initiated_ip = models.GenericIPAddressField(null=True, blank=True)

    # In-flight marker: set (and committed) before the provider call and cleared
    # when the provider gives a definite answer. It stays set if the process dies
    # mid-call, which blocks a blind second send until the payout is reconciled.
    send_in_progress = models.BooleanField(default=False)
    send_started_at = models.DateTimeField(null=True, blank=True)

    # Two-person approval above PAYOUT_TWO_PERSON_THRESHOLD: one admin requests,
    # a different admin approves and sends. The request is void if the amount or
    # destination changes, or when it ages out.
    approval_requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="requested_vendor_payout_approvals",
    )
    approval_requested_at = models.DateTimeField(null=True, blank=True)
    approval_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    approval_destination_hash = models.CharField(max_length=64, blank=True, default="")
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="approved_vendor_payouts",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

     # ✅ Default payout period
    payout_period_start = models.DateField(default=default_payout_period_start)
    payout_period_end = models.DateField(default=default_payout_period_end)

    @property
    def net_payout(self):
        return self.amount
    

    def get_previous_payout(self):
        return VendorPayout.objects.filter(
            vendor=self.vendor,
            payout_period_end__lt=self.payout_period_start
        ).order_by('-payout_period_end').first()

    @property
    def difference(self):
        prev = self.get_previous_payout()
        if not prev:
            return None
        return {
            "amount_diff": self.amount - prev.amount,
            "gross_sales_diff": self.gross_sales - prev.gross_sales,
            "adjustment_amount_diff": self.adjustment_amount - prev.adjustment_amount,
            "income_diff": self.income - prev.income,
            "profit_diff": self.profit - prev.profit,
        }

    class Meta:
        # Prevent duplicate payouts for the same vendor and payout period.
        unique_together = ('vendor', 'payout_period_start', 'payout_period_end')

        # Provider correlation identifiers must belong to at most one payout.
        # NULL/blank values remain allowed until M-Pesa supplies them.
        constraints = [
            models.UniqueConstraint(
                fields=["mpesa_conversation_id"],
                condition=(
                    models.Q(mpesa_conversation_id__isnull=False)
                    & ~models.Q(mpesa_conversation_id="")
                ),
                name="uniq_vp_mpesa_conversation",
            ),
            models.UniqueConstraint(
                fields=["mpesa_originator_conversation_id"],
                condition=(
                    models.Q(mpesa_originator_conversation_id__isnull=False)
                    & ~models.Q(mpesa_originator_conversation_id="")
                ),
                name="uniq_vp_mpesa_originator",
            ),
            models.UniqueConstraint(
                fields=["mpesa_transaction_id"],
                condition=(
                    models.Q(mpesa_transaction_id__isnull=False)
                    & ~models.Q(mpesa_transaction_id="")
                ),
                name="uniq_vp_mpesa_transaction",
            ),
        ]

    def __str__(self):
        return f"{self.vendor.company_name} - KES {self.amount} ({'Paid' if self.paid else 'Pending'})" 
    
    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"{self.vendor.id}-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

        

#  vendor request for item creation

class VendorItemRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("denied", "Denied"),
    ]

    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="item_requests")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="vendor_item_requests")
    name = models.CharField(max_length=255)
    description = models.TextField(max_length=1000)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to="item_requests/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    # 📝 Complete submitted product snapshot (kept for backward compatibility)
    draft_item = models.JSONField(null=True, blank=True)
    # Link the approval request to the server-side ItemDraft that owns uploaded media.
    # This mirrors migration 0024_vendoritemrequest_draft.py and lets approval
    # retrieve gallery, video, main-image, and variant media without embedding files in JSON.
    draft = models.ForeignKey(
        "ItemDraft",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vendor_item_requests",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} request by {self.vendor.first_name} ({self.status})"
 

#  vendor payment detail model
class VendorPaymentDetail(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="payment_details")
    payment_method = models.CharField(max_length=20, choices=Vendor.PAYMENT_METHOD_CHOICES)
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    bank_branch = models.CharField(max_length=255, blank=True, null=True)
    bank_account_name = models.CharField(max_length=255, blank=True, null=True)
    bank_account_number = models.CharField(max_length=50, blank=True, null=True)
    bank_swift_code = models.CharField(max_length=20, blank=True, null=True)
    bank_iban = models.CharField(max_length=50, blank=True, null=True)
    bank_country = models.CharField(max_length=100, blank=True, null=True)
    bank_currency = models.CharField(max_length=10, blank=True, null=True)
    paypal_email = models.EmailField(blank=True, null=True)
    mpesa_number = models.CharField(max_length=20, blank=True, null=True)

    
    
    


class PayoutAuditLog(models.Model):
    """Append-only record of every payout request, send, retry and reconciliation."""

    payout = models.ForeignKey(VendorPayout, on_delete=models.CASCADE, related_name="audit_logs")
    action = models.CharField(max_length=40, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="payout_audit_entries",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    detail = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.action} {self.payout_id} @ {self.created_at:%Y-%m-%d %H:%M}"


class PayoutBatch(models.Model):
    """One weekly payout cycle (Monday 00:00 to Sunday 23:59:59, Africa/Nairobi).

    Items become payable once the customer accepted them or the 72-hour window
    elapsed (``OrderItemFulfillment.payout_eligible_at``). The batch is created as
    a draft, audited by one admin, approved by a different admin, and only then
    can its payouts be sent through the normal (gated) payout screens.
    """

    STATUS_DRAFT = "DRAFT"
    STATUS_AUDITED = "AUDITED"
    STATUS_APPROVED = "APPROVED"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft - awaiting audit"),
        (STATUS_AUDITED, "Audited - awaiting approval"),
        (STATUS_APPROVED, "Approved - payouts may be sent"),
    ]

    week_start = models.DateField(unique=True)
    week_end = models.DateField()
    cutoff_at = models.DateTimeField(help_text="Items eligible strictly before this moment are included.")
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_DRAFT, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    audited_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    audited_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    approved_at = models.DateTimeField(null=True, blank=True)
    skipped = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-week_start"]

    def __str__(self):
        return f"Payout week {self.week_start} ({self.status})"


class PayoutAllocation(models.Model):
    """Links one sold order item to exactly one weekly payout.

    ``order_item`` is unique, so an item can never be allocated twice, whether
    from a retry, a second batch, or a concurrent request.
    """

    batch = models.ForeignKey(PayoutBatch, on_delete=models.PROTECT, related_name="allocations")
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="payout_allocations")
    order_item = models.OneToOneField("oder.OrderItem", on_delete=models.PROTECT, related_name="payout_allocation")
    payment = models.ForeignKey("oder.Payment", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    payment_reference = models.CharField(max_length=100, blank=True, default="")
    vendor_amount = models.DecimalField(max_digits=12, decimal_places=2)
    eligible_at = models.DateTimeField()
    payout = models.ForeignKey(VendorPayout, null=True, blank=True, on_delete=models.SET_NULL, related_name="allocations")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["batch_id", "vendor_id", "order_item_id"]
        indexes = [models.Index(fields=["batch", "vendor"], name="alloc_batch_vendor_idx")]

    def __str__(self):
        return f"{self.vendor_id}: {self.vendor_amount} (item {self.order_item_id})"

