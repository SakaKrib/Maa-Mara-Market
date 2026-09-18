from django.db import models
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save
import uuid
from django.utils import timezone
from ReactSerializers.models import Item 
from datetime import date, timedelta



class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    visitor_id = models.CharField(max_length=64, blank=True, null=True, unique=True) 
    customer = models.OneToOneField("oder.Customer", on_delete=models.CASCADE, null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)

    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"
    


## models for wallet voucher and redeem 




class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    balance = models.IntegerField(default=0)
    visitor_id = models.CharField(max_length=64, blank=True, null=True, unique=True) 
    earned_coins = models.IntegerField(default=0)
    redeem_limit = models.IntegerField(default=20000)  # Max coins a user can redeem at once
    min_redeemable = models.IntegerField(default=20000)  # Minimum required for redemption

    POINTS_TO_KES_RATIO = 100 

    def update_balance(self):
        """Synchronize balance with earned coins."""
        self.balance += self.earned_coins  # Ensure balance matches earned coins
        self.save()

    def total_coins_into_kes(self):
        '''convert coins into shillings'''
        total_kes = 0
        total_kes += (self.balance / 100 ) 
        return total_kes
    #culculate the min-max redeemable coins
    def can_redeem(self, amount):
        """Ensures redemption follows min/max rules AND checks wallet balance."""
        if amount < self.min_redeemable or amount > self.redeem_limit:
            return False, "Amount must be between the minimum and maximum redeemable limits."

        if amount > self.balance:
            return False, "Insufficient balance! You don't have enough coins to redeem this amount."

        return True, "Redemption allowed."


    def redeem_coins(self, amount):
        """Redeems coins, ensuring amount meets the minimum requirement."""
        if self.can_redeem(amount):
            self.earned_coins -= amount
            self.balance += amount
            self.save()
            return True
        return False

    def __str__(self):
        return f"Wallet for {self.user.username} - Balance: {self.balance} Coins"



class Referral(models.Model):
    referrer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="referrals")
    visitor_id = models.CharField(max_length=64, blank=True, null=True, unique=True) 
    invited_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="invited_by")
    referral_code = models.CharField(max_length=20, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    total_referrals = models.IntegerField(default=0)  # Default to 0

    def save(self, *args, **kwargs):
        """Generate referral code only for new instances."""
        if not self.pk and not self.referral_code:
            self.referral_code = str(uuid.uuid4())[:8]
        super().save(*args, **kwargs)

    def update_total_referrals(self):
        """Update total referral count efficiently."""
        new_count = Referral.objects.filter(referrer=self.referrer).count()
        if self.total_referrals != new_count:  # Update only if changed
            self.total_referrals = new_count
            self.save()

    @receiver(post_save, sender="core.Referral")
    def update_referrer_count(sender, instance, **kwargs):
        """Automatically update referrer's total referral count when a new referral is saved."""
        referrals = Referral.objects.filter(referrer=instance.referrer)  # Get related referrals
        for referral in referrals:
            referral.update_total_referrals()  # Call method on each instance

    def __str__(self):
        return f"{self.referrer.username} - Code: {self.referral_code}"

    

class Voucher(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    visitor_id = models.CharField(max_length=64, blank=True, null=True, unique=True) 
    name = models.CharField(max_length=255, blank=False, null=False, default="Default Voucher")  # Database default value
    code = models.CharField(max_length=20, unique=True)
    discount = models.CharField(max_length=100)
    expiry_date = models.DateField(
    default=date.today() + timedelta(days=30)
)
    redeemed = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def apply_discount(self, total):
        """Applies the voucher discount to a total price."""
        if self.redeemed:
            return total  # ✅ Prevent applying already used vouchers

        # ✅ Determine discount percentage or fixed amount
        discount_percentage = int(self.discount.replace("% off", "").strip()) if "%" in self.discount else None
        discount_amount = (total * discount_percentage) / 100 if discount_percentage else int(self.discount)

        # ✅ Ensure total is not negative after discount
        final_price = max(0, total - discount_amount)

        print("discount of 10%", discount_amount)

        # ✅ Mark voucher as redeemed
        self.redeemed = False
        self.save()

        return final_price


    def __str__(self):
        return f"{self.user.username} - Voucher Code: {self.code}"

    
## suport cord backend development

class SupportMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # ✅ Link message to specific user
    visitor_id = models.CharField(max_length=64, blank=True, null=True, unique=True) 
    name = models.CharField(max_length=255)
    email = models.EmailField()
    message = models.TextField()
    support_reply = models.TextField(null=True, blank=True)  # ✅ Support team can respond here
    created_at = models.DateTimeField(auto_now_add=True)
    message_id = models.CharField(max_length=255, blank=True, null=True)  # Track outgoing emails

    def __str__(self):
        return f"Support Request from {self.user.username} - {self.created_at.strftime('%Y-%m-%d')}"
    

#model for confirming OTP codes

class EmailOTP(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)   
    otp_code = models.CharField(max_length=6) 
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)


# pending users
class PendingRegistration(models.Model):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    password = models.CharField(max_length=128)  # plaintext unless hashed
    otp_code = models.CharField(max_length=6)
    referral_code = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    otp_sent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} ({self.email})"
    

#activity model

class ActivityLog(models.Model):
    ACTOR_TYPE_CHOICES = [
        ('user', 'User'),
        ('vendor', 'Vendor'),
        ('admin', 'Admin'),
    ]

    ACTION_CHOICES = [
        ('user_registered', 'User Registered'),
        ('vendor_registered', 'Vendor Registered'),
        ('otp_verified', 'OTP Verified'),
        ('vendor_approved', 'Vendor Approved'),
        ('vendor_denied', 'Vendor Denied'),
        ('login', 'User Logged In'),
        ('logout', 'User Logged Out'),
        ('email_sent', 'Email Sent'),
        ('item_created', 'Item Created'),
        ('item_updated', 'Item Updated'),
        # Add others as needed

        # activity option for items
        ('item_created', 'Item Created'),
        ('item_sold', 'Item Purchased'),
        ('item_updated', 'Item Updated'),
        ('item_updated_qty', 'Item Updated_qty'),
        ('item_viewed', 'Item Viewed'),
        ('item_added_to_cart', 'Item Added to Cart'),
        ('item_removed_from_cart', 'Item Removed from Cart'),
        ('item_reviewed', 'Item Reviewed'),
        ('item_shared', 'Item Shared'),
        ('item_added_to_wishlist', 'Item Added to Wishlist'),
        ('item_removed_from_wishlist', 'Item Removed from Wishlist'),

        # Order / Return / Refund / Exchange
        ('order_created', 'Order Created'),
        ('order_completed', 'Order Completed'),
        ('refund_requested', 'Refund Requested'),
        ('refund_approved', 'Refund Approved'),
        ('exchange_requested', 'Exchange Requested'),
        ('exchange_approved', 'Exchange Approved'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    actor_type = models.CharField(max_length=10, choices=ACTOR_TYPE_CHOICES)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    related_url = models.URLField(blank=True, null=True) 
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="activities", null=True, blank=True)
    visitor_id = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.get_action_display()} - {self.user} ({self.timestamp})"
    
    @property
    def actor_role(self):
        return "vendor" if hasattr(self.user, "vendor") else "admin"

# NOTIFICATIONS MODEL
class Notification(models.Model):
    visitor_id = models.CharField(max_length=64, blank=True, null=True, unique=True) 
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    title = models.CharField(max_length=255, blank=True, null=True, default="")  # ✅ Add this
    message = models.TextField()
    seen = models.BooleanField(default=False)
    url = models.CharField(max_length=500, null=True, blank=True)  # <- Add this!
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    vendor_request = models.ForeignKey('vendorDashboard.VendorRequest', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"


# calendar
class CalendarEvent(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="calendar_events"
    )
    title = models.CharField(max_length=200)
    start = models.DateTimeField()
    end = models.DateTimeField(blank=True, null=True)
    all_day = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start"]

    def __str__(self):
        return f"{self.title} ({self.start.date()})"
    

#email model


class EmailLog(models.Model):
    STATUS_CHOICES = [
        ("sent", "Sent"),
        ("failed", "Failed"),
        ("received", "Received"),
    ]

    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    message = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    type = models.CharField(max_length=50, default="manual")  # compose, system, etc
    created_at = models.DateTimeField(auto_now_add=True) 