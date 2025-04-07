from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError

class Vendor(models.Model):
    # Personal Details
    item = models.ManyToManyField('shop.Item', related_name='vendors') 
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    surname_name = models.CharField(max_length=255)  # Vendor's last name
    middle_name = models.CharField(max_length=255, null=True, blank=True)  # Middle name (optional)
    first_name = models.CharField(max_length=255)  # Vendor's first name
    phone_number = models.CharField(max_length=15)  # Contact phone number

    # Updated `username` with alphanumeric validation and length constraint
    username = models.CharField(
        max_length=8, 
        blank=False, 
        null=False, 
        unique=True, 
        validators=[
            RegexValidator(
                regex=r'^(?=.*\d)[a-zA-Z0-9]{8}$',
                message="Username must be exactly 8 characters long, include only letters and numbers, and contain at least one digit."
            )
        ]
    )

    email = models.EmailField(unique=True)  # Unique email
    password = models.CharField(max_length=128)  # Password (hash it properly in a real application)
    id_number = models.CharField(max_length=12)
    vendor_code = models.CharField(max_length=20, unique=True)
    vendor_id = models.IntegerField(unique=True, blank=True, null=True)

    # Company Details
    company_name = models.CharField(max_length=255)  # Name of the company
    workshop_location = models.TextField()  # Workshop location
    product_type = models.CharField(max_length=255)  # Type/category of products
    vendor_company_logo = models.ImageField(upload_to='vendor_logos/', blank=True, null=True)

    # Payment Details
    PAYMENT_METHOD_CHOICES = [
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('MOBILE_MONEY', 'M-pesa'),
        ('PAYPAL', 'PayPal'),
    ]
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='BANK_TRANSFER'
    )
    bank_account_number = models.CharField(max_length=50)  # Bank account number
    mpesa_number = models.CharField(max_length=15)  # M-Pesa number

    # Optional Details
    tax_number = models.CharField(max_length=50, null=True, blank=True)  # Tax number
    website_url = models.URLField(null=True, blank=True)  # Website URL
    profile_picture = models.ImageField(upload_to='vendor_profiles/', null=True, blank=True)  # Profile image
    social_media_links = models.JSONField(null=True, blank=True)  # Social media links

    # Additional Metadata
    date_created = models.DateTimeField(auto_now_add=True)  # Automatically set at creation
    is_active = models.BooleanField(default=True)  # Indicates active status
    date_updated = models.DateTimeField(auto_now_add=True)

    # Validate model fields
    def clean(self):
        # Add any custom validation logic
        if len(self.username) != 8:
            raise ValidationError("Username must be exactly 8 characters long.")

    
    def save(self, *args, **kwargs):
        # Ensure vendor_id corresponds to user.id (or another unique logic)
        if not self.vendor_id:
            self.vendor_id = self.user.id  # Set vendor_id to user.id if not already set
        super().save(*args, **kwargs)

    

 


    def save(self, *args, **kwargs):
        if not self.vendor_code:
            # Generate the next vendor code (e.g., max existing code + 1)
            last_code = Vendor.objects.aggregate(models.Max('vendor_code'))['vendor_code__max']
            # Explicitly convert last_code to an integer
            last_code = int(last_code) if last_code else 0
            self.vendor_code = last_code + 1
        super().save(*args, **kwargs)


    def __str__(self):
        return f'{self.first_name} - {str(self.vendor_code)}'

    
    


    



#sold item model
class SoldItem(models.Model):
    item = models.ForeignKey('shop.Item', on_delete=models.CASCADE, related_name='sold_items')  # Links to the Item model
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='sold_items')  # Links to the Vendor model
    quantity = models.PositiveIntegerField()  # Quantity of the item sold
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, editable=False)  # Sale price per unit (auto-filled)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, editable=False)  # Total price (calculated automatically)
    date_sold = models.DateTimeField(auto_now_add=True)  # Timestamp of the sale

    def save(self, *args, **kwargs):
        # Check if the item has a discount, and set the sale_price accordingly
        if self.item.discount_price and self.item.discount_price < self.item.price:
            self.sale_price = self.item.discount_price  # Use the discounted price
        else:
            self.sale_price = self.item.price  # Use the regular price if no discount is available

        # Automatically calculate the total price
        self.total_price = self.quantity * self.sale_price
        super(SoldItem, self).save(*args, **kwargs)

    def __str__(self):
        return f"Sold {self.quantity} of {self.item.name} by {self.vendor.company_name}"

    class Meta:
        ordering = ['-date_sold']  # Orders by the most recent sales first






class PersistentItemData(models.Model):
    SIZE_CHOICES = (
    ('Small', 'small'),
    ('medium', 'medium'),
    ('large', 'large'),
    ('extra-large', 'XL'),
    ('double-extra-large', 'XXL'),
    ('triple-extra-large', 'XXXL'),
    ('free-size', 'Free size'),
    (' 36', ' 36'),
    ('37 ', '37 '),
    (' 38', '38 '),
    ('39 ', ' 39'),
    ('40 ', '40 '),
    ('41 ', ' 41'),
    (' 42', ' 42'),
    (' 43', ' 43'),
    (' 44', ' 44'),
    (' 45', ' 45'),
    ('46 ', ' 46'),
    (' 47', ' 47'),
    )

    AGE_CHOICES =(
        (' 0-3 m', ' 0-3 months'),
        (' 3-6 m', ' 3-6 months '),
        (' 6-9 m', ' 6-9 months'),
        (' 9-12 m', ' 9-12 months'),
        ('12-18 m ', ' 12-18 months'),
        ('18-24 m ', ' 18-24 months'),
        ('2 y ', ' 2 years'),
        ('3 y ', ' 3 years'),
        ('4 y ', '4 years '),
        ('6-7 y ', ' 6-7 years'),
        ('8-10 y ', ' 8-10 years'),
        ('11-13 y ', ' 11-13 years'),
        ('14+ y ', ' 14+ years'),
    )

    GENDER_CHOICES =(
        ('men ', ' For Men'),
        (' women', ' For women'),
        (' children', 'For Children '),
        ('unisex ', ' Unisex'),


    )
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='seller')
    category = models.ForeignKey('shop.Category', related_name='persistentItem', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='persistent_media/', blank=False, null=False)
    name = models.CharField(max_length=40, blank=False, null=False)
    size = models.CharField(max_length=30, choices=SIZE_CHOICES, blank=True, null=True)
    description = models.TextField(blank=False, null=False)
    gender_based = models.CharField(max_length=15, choices=GENDER_CHOICES, blank=True, null=True)
    children_size_based_age = models.CharField(max_length=15, choices=AGE_CHOICES, blank=True, null=True)
    price = models.IntegerField(blank=False, null=False)
    discount_price = models.IntegerField(blank=True, null=True)
    in_stock = models.IntegerField(blank=False, null=False)
    created_by = models.ForeignKey('auth.User', related_name='persistent', on_delete=models.CASCADE)
    available = models.BooleanField(default=True)
    updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    image_hash = models.CharField(max_length=64, unique=True, blank=True, null=True)  # New field

    # Optional fields for custom logic
    final_price = models.FloatField(blank=True, null=True)

    def calculate_final_price(self):
        if self.discount_price:
            return (self.price * self.in_stock) * (1 - (self.discount_price / 100))
        return self.price * self.in_stock

    def save(self, *args, **kwargs):
        self.final_price = self.calculate_final_price()
        super(PersistentItemData, self).save(*args, **kwargs)

