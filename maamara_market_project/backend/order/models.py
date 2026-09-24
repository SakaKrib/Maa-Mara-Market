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
import uuid
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
    

    #  to address easy podt
    # ✅ Add this method
    def to_easypost_address(self):
        """
        Convert BillingAddress instance to an EasyPost-compatible address dict.
        """
        return {
            "name": f"{self.first_name} {self.last_name}".strip(),
            "street1": self.street_address,
            "street2": self.appartment_address or "",
            "city": self.city,
            "state": self.state or "",
            "zip": self.zip,
            "country": str(self.country.code if hasattr(self.country, "code") else self.country),
            "phone": self.phone,
            "email": self.email,
        }


# payment model

from django.conf import settings
from django.db import models


class Payment(models.Model):
    GATEWAY_CHOICES = [
        ("PESAPAL", "Pesapal"),
        ("PAYPAL", "PayPal"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("UNKNOWN", "Unknown"),
        ("MPESA", "M-Pesa"),
        ("CARD", "Card"),
        ("BANK", "Bank Transfer"),
        ("AIRTEL", "Airtel Money"),
    ]

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
        ("FAILED", "Failed"),
        ("REFUNDED", "Refunded"),
        ("PARTIALLY_REFUNDED", "Partially Refunded"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    # Guest checkout support
    visitor_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    # Gateway (always Pesapal for now)
    payment_gateway = models.CharField(
        max_length=20,
        choices=GATEWAY_CHOICES,
        default="PESAPAL",
    )

    # Actual payment method selected inside Pesapal
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default="UNKNOWN",
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    currency = models.CharField(
        max_length=10,
        default="KES",
    )

    merchant_reference = models.CharField(
        max_length=100,
        unique=True,
    )

    order_tracking_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
    )

    callback_payload = models.JSONField(
        blank=True,
        null=True,
    )

    paid_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)
    provider_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    provider_currency = models.CharField(max_length=10, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        owner = self.user.username if self.user else f"Visitor {self.visitor_id}"
        return (
            f"{owner} | {self.payment_gateway} | "
            f"{self.payment_method} | {self.status}"
        )



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
    billing_address = models.ForeignKey(BillingAddress, on_delete=models.SET_NULL,null=True, blank=True, related_name='customers')


    def __str__(self):
        if self.full_name:
            return f"{self.full_name} ({self.email or self.phone_number})"
        elif self.user:
            return self.user.username
        else:
            return self.visitor_id or "Guest"     
        
           


class OrderItem(models.Model):
    RETURN_STATUS_CHOICES = [
        ("NONE", "No Return"),
        ("REQUESTED", "Return Requested"),
        ("APPROVED", "Return Approved"),
        ("REJECTED", "Return Rejected"),
        ("RECEIVED", "Item Received"),
        ("REFUNDED", "Refunded"),
        ("EXCHANGED", "Exchanged"),
    ]
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
    custom_preferences = models.JSONField(default=dict, blank=True)


    visitor_id = models.CharField(max_length=255, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    refunded = models.BooleanField(default=False)
    refunded_at = models.DateTimeField(blank=True,null=True)
    is_returned =models.BooleanField(default=False)
    is_exchanged = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=RETURN_STATUS_CHOICES,
        default='NONE'
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
        """
        Return the immutable customer price captured when this order item
        was created. Checkout pricing is snapshotted in price_at_purchase so
        later offer/discount changes cannot alter a paid order total.
        """
        return self.quantity * self.price_at_purchase
    
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
    ORDER_STATUS_CHOICES = [
        ("PENDING_PAYMENT", "Pending Payment"),
        ("PAID", "Paid"),
        ("PROCESSING", "Processing"),
        ("PACKING", "Packing"),
        ("READY_TO_SHIP", "Ready to Ship"),
        ("SHIPPED", "Shipped"),
        ("IN_TRANSIT", "In Transit"),
        ("OUT_FOR_DELIVERY", "Out for Delivery"),
        ("DELIVERED", "Delivered"),
        ("AWAITING_CONFIRMATION", "Awaiting Customer Confirmation"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
        ("RETURN_REQUESTED", "Return Requested"),
        ("RETURN_APPROVED", "Return Approved"),
        ("RETURNED", "Returned"),
        ("REFUNDED", "Refunded"),
        ("DISPUTED", "Disputed"),
    ]

    # Canonical status groups used across cart, payments, and dashboards
    CART_STATUS = "PENDING_PAYMENT"
    # Orders that have been paid (sales / customer history)
    PAID_STATUSES = (
        "PAID",
        "PROCESSING",
        "PACKING",
        "READY_TO_SHIP",
        "SHIPPED",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "AWAITING_CONFIRMATION",
        "COMPLETED",
    )
    # Paid but still needing vendor fulfillment
    FULFILLMENT_PENDING_STATUSES = (
        "PAID",
        "PROCESSING",
        "PACKING",
        "READY_TO_SHIP",
    )
    FULFILLMENT_COMPLETED_STATUSES = (
        "SHIPPED",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "AWAITING_CONFIRMATION",
        "COMPLETED",
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    visitor_id = models.CharField(max_length=255, null=True, blank=True)
    ordered_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=100,
        choices=ORDER_STATUS_CHOICES,
        default='PENDING_PAYMENT'
    )
    customer = models.ForeignKey(  # ✅ new field
        'Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    paypal_order_id = models.CharField(max_length=64, blank=True, null=True, unique=True)
    updated_total_price = models.IntegerField( null=True, blank=True, default=0)
    billing_address = models.ForeignKey(BillingAddress, on_delete=models.SET_NULL, blank=True, null=True)
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, blank=True, null=True)
    paypal_invoice_id = models.CharField(max_length=128, blank=True, null=True, unique=True)
    # Snapshot of checkout form fields; used to create BillingAddress/Customer only after payment succeeds
    checkout_billing_data = models.JSONField(blank=True, null=True)
    # Gateway correlation before Payment row exists (e.g. M-Pesa CheckoutRequestID)
    pending_payment_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
    )
    shipping_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_provider = models.CharField(max_length=100, null=True, blank=True)
    shipping_service = models.CharField(max_length=100, null=True, blank=True)
    shipping_provider_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    shipping_currency = models.CharField(max_length=10, null=True, blank=True)

    @property
    def payment_confirmed(self):
        if not self.payment:
            return False
        return self.payment.status in ("PAID", "completed", "COMPLETED")



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
        print("this is the func voucher", voucher)

        if voucher:
            return voucher.apply_discount(self.get_total())  # ✅ Use reusable method
        
        return self.get_total()  # ✅ Return original total if no voucher is found


    #calculate the total cart item in general depending on the method selection
    def final_total_of_cart(self):
        if self.updated_total_price > 0:
            return self.updated_total_price
        return self.get_total()


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

        for order_item in self.items.all():
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
    
   
    


# payments/models.py

from django.db import models

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

    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, null=True, blank=True)

    visitor_id = models.CharField(max_length=64, blank=True, null=True, unique=True) 

    transaction_type = models.CharField(max_length=15, choices=TRANSACTION_TYPES)

    payout = models.ForeignKey("vendorDashboard.VendorPayout", on_delete=models.CASCADE, related_name="transactions", null=True, blank=True)

    order = models.ForeignKey(
        "Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions"
    )

    # payment method
    payment_method = models.CharField(
        max_length=50,
        choices=[("paypal", "PayPal"), ("mpesa", "M-Pesa"), ("card", "Card")],
        default="paypal",
    )

    payment = models.ForeignKey(
        Payment,  
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )

    # link vendor
    vendor = models.ForeignKey(
        "vendorDashboard.Vendor",  
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True)

    # ✅ Common fields
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, default="Completed")
    account_reference = models.CharField(max_length=100, blank=True, null=True)
    raw_data = models.JSONField()  # Store full response
    created_at = models.DateTimeField(auto_now_add=True)

    # ✅ M-Pesa fields
    mpesa_receipt_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=15, null=True, blank=True)

    # ✅ PayPal fields
    paypal_transaction_id = models.CharField(max_length=100, null=True, blank=True)
    payer_email = models.EmailField(null=True, blank=True)

    class Meta:
        unique_together = ('paypal_transaction_id', 'vendor')

    def __str__(self):
        identifier = (
            self.mpesa_receipt_number
            or self.paypal_transaction_id
            or self.account_reference
            or "Unknown"
        )
        return f"{self.transaction_type} - {identifier} - {self.amount}"


    @staticmethod
    def get_paypal_total():
        total = (
            Transaction.objects.filter(payment_method__iexact="paypal")
            .aggregate(total=Sum("amount"))
            .get("total")
        )
        return float(total or 0)

    @staticmethod
    def get_mpesa_total():
        total = (
            Transaction.objects.filter(payment_method__iexact="mpesa")
            .aggregate(total=Sum("amount"))
            .get("total")
        )
        return float(total or 0)
    

    @property
    def amount_in_kes(self):
        if self.payment_method.lower() == "paypal":
            rate = get_usd_to_kes_rate()
            return float(self.amount) * rate
        else:
            return float(self.amount)




       




class Refund(models.Model):
    """
    Immutable financial ledger entry for an approved customer refund.

    The refund is created only after an admin approves a return request.
    Provider calls are performed asynchronously and this row is the source
    of truth for idempotency, reconciliation, and audit history.
    """

    STATUS_CHOICES = [
        ("approved", "Approved"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    PROVIDER_CHOICES = [
        ("PayPal", "PayPal"),
        ("Mpesa", "M-Pesa"),
    ]

    return_request = models.OneToOneField(
        "vendorDashboard.ReturnRequest",
        on_delete=models.PROTECT,
        related_name="refund_record",
    )
    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name="refunds",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="approved",
        db_index=True,
    )

    # Provider-side idempotency/correlation.
    provider_reference = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
    )
    mpesa_originator_conversation_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
    )
    mpesa_conversation_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
    )
    mpesa_result_code = models.IntegerField(blank=True, null=True)

    failure_reason = models.TextField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["payment", "status"]),
            models.Index(fields=["provider", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                condition=models.Q(
                    provider_reference__isnull=False,
                    provider_reference__gt="",
                ),
                fields=["provider", "provider_reference"],
                name="uniq_refund_provider_reference",
            ),
        ]

    def __str__(self):
        return (
            f"Refund {self.pk} | {self.provider} | "
            f"{self.amount} {self.currency} | {self.status}"
        )



class CheckoutSession(models.Model):
    """Short-lived checkout state used until a payment provider confirms payment."""
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("payment_pending", "Payment Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("expired", "Expired"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="checkout_sessions",
    )
    visitor_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    payment_method = models.CharField(
        max_length=20,
        choices=[("Mpesa", "M-Pesa"), ("PayPal", "PayPal")],
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="KES")
    paypal_order_id = models.CharField(max_length=128, null=True, blank=True, db_index=True)
    mpesa_checkout_request_id = models.CharField(max_length=128, null=True, blank=True, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft", db_index=True)
    expires_at = models.DateTimeField()
    order = models.OneToOneField(
        "Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checkout_session",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Checkout {self.id} ({self.status})"
