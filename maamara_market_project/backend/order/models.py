from django.db import models
from django.contrib.auth.models import User
from ReactSerializers.models import Item, ColorVariant, AgeVariant, SizeStock
from django.shortcuts import reverse
from django.conf import settings
from django_countries.fields import CountryField
from core.models import Wallet, Voucher, Referral
from django.utils import timezone
from django.db.models import Sum
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
    provider_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    provider_currency = models.CharField(max_length=3, blank=True, null=True)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)  # PayPal/Mpesa ref
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("completed", "Completed"), ("failed", "Failed")],
        default="pending",
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        owner = self.user.username if self.user else f"Visitor {self.visitor_id}"
        return f"{owner} - {self.payment_method} - {self.amount}" 



# customer model
class Customer(models.Model):
    # Optional link to authenticated user
    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.SET_NULL)

    # Visitor ID for guest users
    visitor_id = models.CharField(max_length=100, null=True, blank=True)
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customers', null=True, blank=True)

    # Customer details
    full_name = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    loyalty_points = models.IntegerField(default=0)
    # ✅ make it a ForeignKey
    billing_address = models.ForeignKey('BillingAddress', on_delete=models.SET_NULL,null=True, blank=True, related_name='customers'
)


    def __str__(self):
        if self.full_name:
            return f"{self.full_name} ({self.email or self.phone_number})"
        elif self.user:
            return self.user.username
        else:
            return self.visitor_id or "Guest"        


class OrderItem(models.Model):
    order = models.ForeignKey(
        'Order',
        on_delete=models.CASCADE,
        related_name='order_items',
        null=True,  # temporary to allow migration
        blank=True,
    )
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)

    # 🔥 ADD THESE
    color_variant = models.ForeignKey(
        ColorVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    size_stock = models.ForeignKey(
        SizeStock,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    age_variant = models.ForeignKey(
        AgeVariant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    selected_weight = models.CharField(max_length=50, null=True, blank=True)


    selected_length = models.CharField(max_length=50, null=True, blank=True)

    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)

    shoe_size = models.CharField(max_length=50, null=True, blank=True)


    visitor_id = models.CharField(max_length=255, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    refunded = models.BooleanField(default=False)
    refunded_at = models.DateTimeField(blank=True,null=True)
    is_returned =models.BooleanField(default=False)
    is_exchanged = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=[('none', 'No Refund'),('approved', 'Approved'),('rejected', 'Rejected'),('refunded', 'Refunded')],
        default='none'
    )
    ordered_date = models.DateTimeField(auto_now_add=True)

    

    def get_total_item_price(self):
        return self.quantity * self.item.get_item_final_price()
    
    def get_total_discount(self):
        return self.quantity * self.item.get_item_final_discounted_price()
       
    
    def get_amount_saved(self):
        return self.get_total_item_price() - self.get_total_discount()


    def __str__(self):
        return f"{self.quantity} of {self.item.name}"
    
        
    def get_final_price(self):
        if self.item.discount_price:
            return self.get_total_discount()
        return self.get_total_item_price()
    
    #-----------------------
    # get payout for vendor
    #----------------------

    # if no discount, if price
    def get_total_item_price_for_vendor(self):
        return self.quantity * self.item.get_item_final_price_for_vendor()
    
    # if discount no price
    def get_total_discount_for_vendor(self):
        return self.quantity * self.item.get_item_final_discounted_price_for_vendor()
    
    # get total price for vendor in order item
    def get_final_price_for_vendor(self):
        if self.item.discount_price:
            return self.get_total_discount_for_vendor()
        return self.get_total_item_price_for_vendor()



class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    visitor_id = models.CharField(max_length=255, null=True, blank=True)
    ordered_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('completed', 'Completed')],
        default='pending'
    )
    customer = models.ForeignKey(  # ✅ new field
        'Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    paypal_order_id = models.CharField(max_length=64, blank=True, null=True, unique=True)
    updated_total_price = models.IntegerField(null=True, blank=True, default=0)
    shipping_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    shipping_provider = models.CharField(max_length=32, blank=True, null=True)
    shipping_service = models.CharField(max_length=128, blank=True, null=True)
    shipping_provider_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    shipping_currency = models.CharField(max_length=3, blank=True, null=True)
    billing_address = models.ForeignKey(BillingAddress, on_delete=models.SET_NULL, blank=True, null=True)
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, blank=True, null=True)
    paypal_invoice_id = models.CharField(max_length=128, blank=True, null=True, unique=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(status="pending", user__isnull=False),
                name="uniq_pending_order_user",
            ),
            models.UniqueConstraint(
                fields=["visitor_id"],
                condition=models.Q(status="pending", visitor_id__isnull=False),
                name="uniq_pending_order_visitor",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["visitor_id", "status"]),
        ]

    @property
    def payment_confirmed(self):
        return self.payment and self.payment.status == 'completed'



    @property
    def items(self):
        # Keep the same interface as before for backward compatibility
        return self.order_items.all()

    #--------------------------------
    # get final order total for vendor @@Vendor
    #---------------------------------
    def get_total_for_vendor(self, use_wallet=False, voucher_code=None):
        """Returns the total price as a whole number."""
        total = sum(order_item.get_final_price_for_vendor() for order_item in self.items.all())

        # ✅ Round and convert to int to remove decimals
        final_price_for_vendor = round(total)

         # ✅ Apply Wallet Discount (Ensure Wallet Exists)
        if use_wallet:
            wallet = Wallet.objects.get(user=self.user)
            available_kes = wallet.balance or 0
            deduction = min(available_kes, total)
            final_price = max(0, total - deduction)

            # ✅ Update Wallet Balance
            wallet.balance -= deduction * wallet.POINTS_TO_KES_RATIO
            wallet.save()

        # ✅ Apply Voucher Discount
        elif voucher_code:
            voucher = Voucher.objects.filter(code=voucher_code, user=self.user, redeemed=False).first()
            if voucher:
                discount_percentage = int(voucher.discount.replace("% off", "").strip()) if "%" in voucher.discount else int(voucher.discount)
                discount_amount = (total * discount_percentage) / 100
                final_price = max(0, total - discount_amount)

                # ✅ Mark Voucher as Redeemed
                voucher.redeemed = True
                voucher.save()

        return int(final_price_for_vendor)
    

    #****************************
    #****************************
    #****************************


    #--------------------------------
    # get final order total for vendor @@Admin
    #---------------------------------

    def get_total(self, use_wallet=False, voucher_code=None):
        """Returns the total price as a whole number."""
        total = sum(order_item.get_final_price() for order_item in self.items.all())

        # ✅ Round and convert to int to remove decimals
        final_price = round(total)
        

        

        # ✅ Apply Wallet Discount (Ensure Wallet Exists)
        if use_wallet:
            wallet = Wallet.objects.get(user=self.user)
            available_kes = wallet.balance or 0
            deduction = min(available_kes, total)
            final_price = max(0, total - deduction)

            # ✅ Update Wallet Balance
            wallet.balance = float(wallet.balance) - float(deduction) * float(wallet.POINTS_TO_KES_RATIO)
            wallet.save()

        # ✅ Apply Voucher Discount
        elif voucher_code:
            voucher = Voucher.objects.filter(code=voucher_code, user=self.user, redeemed=False).first()
            if voucher:
                discount_percentage = int(voucher.discount.replace("% off", "").strip()) if "%" in voucher.discount else int(voucher.discount)
                discount_amount = (total * discount_percentage) / 100
                final_price = max(0, total - discount_amount)

                # ✅ Mark Voucher as Redeemed
                voucher.redeemed = True
                voucher.save()

        return int(final_price)
    
    def get_voucher_discounted_total(self, voucher_code):
        """Applies voucher discount safely using Voucher model."""
        voucher = Voucher.objects.filter(code=voucher_code, user=self.user, redeemed=False).first()

        if voucher:
            return voucher.apply_discount(self.get_total())  # ✅ Use reusable method
        
        return self.get_total()  # ✅ Return original total if no voucher is found


    #calculate the total cart item in general depending on the method selection
    def final_total_of_cart(self):
        if self.updated_total_price > 0:
            return self.updated_total_price
        return self.get_total() + int(round(self.shipping_amount or Decimal("0.00")))


    def __str__(self):
        if self.user:
            return f"Order {self.id} by {self.user.username}"
        return f"Order {self.id} (Visitor: {self.visitor_id})"


    def get_total_qty(self):
        total_qty = sum([item.quantity for item in self.items.all()])  # Corrected this line
        return total_qty
    
    # shipping demensions calculations
    def get_total_shipping_dimensions(self):
        """
        Calculate the total shipping dimensions and weight for all items in this order.
        Returns a dictionary of total length, width, height, and weight.
        """
        total_weight = Decimal("0.00")
        total_volume = Decimal("0.00")
        has_dimensions = False

        for order_item in self.order_items.all():
            item = order_item.item
            qty = order_item.quantity

            if hasattr(item, "shipping_dimension"):
                dim = item.shipping_dimension
                has_dimensions = True

                # volume = L × W × H
                volume = dim.length * dim.width * dim.height
                total_volume += volume * qty
                total_weight += dim.weight * qty

        if not has_dimensions:
            return None  # No items have shipping dimensions

        # Approximate cubic box side from total volume
        cubic_side = Decimal(math.pow(float(total_volume), 1/3)) if total_volume > 0 else Decimal("0")

        return {
            "length": float(round(cubic_side, 2)),
            "width": float(round(cubic_side, 2)),
            "height": float(round(cubic_side, 2)),
            "weight": float(round(total_weight, 2))
        }
    



# card
class Card(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="saved_cards")
    visitor_id = models.CharField(max_length=64, blank=True, null=True, db_index=True) 
    brand = models.CharField(max_length=32, null=True, blank=True)
    last_digits = models.CharField(max_length=4, null=True, blank=True)
    type = models.CharField(max_length=16, null=True, blank=True)
    capture_id = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.brand or 'CARD'} ****{self.last_digits or '----'}"


# Payment transaction ledger
class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ("C2B", "Customer to Business"),
        ("B2C", "Business to Customer"),
        ("PayPal", "PayPal Payment"),
        ("BANK_TRANSFER", "Bank Transfer"),
    )

    CATEGORY_CHOICES = (
        ("vendors", "Vendors"),
        ("staffs", "Staffs"),
        ("kra", "KRA Licenses"),
        ("refund", "Refund"),
        ("training", "Training"),
        ("subscriptions", "Subscriptions"),
        ("rent", "Rent"),
    )

    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPES)
    payment_method = models.CharField(max_length=30)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, null=True, blank=True)
    visitor_id = models.CharField(max_length=64, blank=True, null=True, db_index=True)

    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    vendor = models.ForeignKey(
        "vendorDashboard.Vendor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=30, default="pending")
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    mpesa_receipt_number = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    account_reference = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    paypal_transaction_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    payer_email = models.EmailField(blank=True, null=True)
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["order", "payment"]),
            models.Index(fields=["transaction_type", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["mpesa_receipt_number"],
                condition=(
                    models.Q(transaction_type="C2B")
                    & models.Q(mpesa_receipt_number__isnull=False)
                    & ~models.Q(mpesa_receipt_number="")
                ),
                name="uniq_c2b_mpesa_receipt",
            ),
            models.UniqueConstraint(
                fields=["account_reference"],
                condition=(
                    models.Q(transaction_type="C2B")
                    & models.Q(account_reference__isnull=False)
                    & ~models.Q(account_reference="")
                ),
                name="uniq_c2b_account_reference",
            ),
            models.UniqueConstraint(
                fields=["payment", "paypal_transaction_id", "vendor"],
                condition=(
                    models.Q(transaction_type="PayPal")
                    & models.Q(paypal_transaction_id__isnull=False)
                    & ~models.Q(paypal_transaction_id="")
                    & models.Q(vendor__isnull=False)
                ),
                name="uniq_paypal_transaction_vendor",
            ),
            models.UniqueConstraint(
                fields=["payment", "paypal_transaction_id"],
                condition=(
                    models.Q(transaction_type="PayPal")
                    & models.Q(paypal_transaction_id__isnull=False)
                    & ~models.Q(paypal_transaction_id="")
                    & models.Q(vendor__isnull=True)
                ),
                name="uniq_paypal_transaction_no_vendor",
            ),
        ]

    def __str__(self):
        return self.mpesa_receipt_number or self.paypal_transaction_id or f"TX-{self.pk}"
