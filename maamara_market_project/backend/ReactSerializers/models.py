from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
import hashlib
from decimal import Decimal
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator


SECTION_CHOICES = [
    ("organic", "Organic"),
    ("departmental", "Departmental"),
]



# atribute
ATTRIBUTE_CHOICES = [
        # 🧵 Fabric / Textile
        ("handwoven", "Handwoven"),
        ("handknitted", "Handknitted"),
        ("crocheted", "Crocheted"),
        ("embroidered", "Embroidered"),
        ("quilted", "Quilted"),
        ("tie_dye", "Tie & Dye"),
        ("batik", "Batik"),
        ("patchwork", "Patchwork"),
        ("felted", "Felted Wool"),

        # 🌿 Natural / Organic
        ("beaded", "Beaded"),
        ("wooden", "Wooden"),
        ("stone_carved", "Stone Carved"),
        ("clay", "Clay"),
        ("ceramic", "Ceramic"),
        ("bamboo", "Bamboo"),
        ("rattan", "Rattan/Wicker"),
        ("leather", "Leather"),
        ("recycled", "Recycled / Upcycled"),

        # 🎨 Artistic
        ("painted", "Hand-painted"),
        ("sculpted", "Sculpted"),
        ("engraved", "Engraved"),
        ("etched", "Etched"),
        ("calligraphy", "Calligraphy"),
        ("mosaic", "Mosaic"),

        # 🪡 Jewelry / Accessories
        ("wire_wrapped", "Wire Wrapped"),
        ("macrame", "Macrame"),
        ("resin_cast", "Resin Cast"),
        ("glass_blown", "Glass Blown"),
        ("pearl_inlay", "Pearl Inlay"),

        # 🪵 Furniture / Decor
        ("carved", "Hand-carved"),
        ("polished", "Polished"),
        ("lacquered", "Lacquered"),
        ("gilded", "Gold Leaf / Gilded"),

        # 🍴 Food / Organic
        ("homemade", "Homemade"),
        ("artisanal", "Artisanal"),
        ("fermented", "Fermented"),
        ("sun_dried", "Sun-dried"),
        ("stone_ground", "Stone Ground"),
    ]





class Section(models.Model):
    """
    Top-level grouping (e.g., Organic, Departmental, Luxury, etc.)
    """
    name = models.CharField(max_length=100, unique=True, choices=SECTION_CHOICES)

    class Meta:
        verbose_name = "Section"
        verbose_name_plural = "Sections"

    def __str__(self):
        return self.name

class Department(models.Model):
    section = models.ForeignKey("Section", on_delete=models.CASCADE, null=True, blank=True, related_name="departments")

    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name
    

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    department = models.ForeignKey(Department, related_name='categories', on_delete=models.CASCADE)

    def __str__(self):
        return self.name

class SubCategory(models.Model):
    name = models.CharField(max_length=50)
    category = models.ForeignKey(Category, related_name='subcategories', on_delete=models.CASCADE)

    def __str__(self):
        return self.name
    
#brand mode
class Brand(models.Model):
    name = models.CharField(max_length=255, unique=True)
    logo = models.ImageField(upload_to="brands_logos/", blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Item(models.Model):
        # Core fields
    section = models.ForeignKey(
        "Section",
        on_delete=models.CASCADE,
        related_name="items",
        null=True,  # allow null for older data
        blank=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField()
    image = models.ImageField(upload_to='items/')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    in_stock = models.PositiveIntegerField(null=True, blank=True)
    available = models.BooleanField(default=True)
    returnable = models.BooleanField(default=True)
    brand = models.ForeignKey(Brand, related_name="items", on_delete=models.CASCADE, null=True, blank=True)

    # Categorization
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="items")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="items")
    subcategory = models.ForeignKey(SubCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="items")

    # Attributes
    item_attribute = models.CharField(max_length=30, blank=True, null=True, choices=ATTRIBUTE_CHOICES)
    gender_based = models.CharField(max_length=15, default='none', blank=True, null=True)
    children_size_based_age = models.CharField(max_length=30, default='none', blank=True, null=True)
 

    #on offer
    in_offer = models.BooleanField(default=False)

    # Organic food details
    is_organic = models.BooleanField(default=False)
    manufactured_date = models.DateField(blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    is_fresh_food = models.BooleanField(default=False)

    # ✅ New vendor relationship
    vendor = models.ForeignKey(
        "vendorDashboard.Vendor",                 # Vendor model
        related_name="items",     # lets you do vendor.items.all()
        on_delete=models.CASCADE,
        null=True,                # allow null for older items
        blank=True
    )

    # Metadata
    created_by = models.ForeignKey(User, related_name="items", on_delete=models.CASCADE)
    slug = models.SlugField(unique=True, blank=True)
    image_hash = models.CharField(max_length=64, unique=True, blank=True, null=True)
    likes = models.PositiveIntegerField(default=0)
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    percentage_discount = models.DecimalField(
        max_digits=5,  # e.g., max 100.00
        decimal_places=2,
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentage value between 0 and 100"
    )

    # ✅ Coffee-specific fields
    roast_type = models.CharField(
        max_length=50,
        choices=[
            ("light", "Light Roast"),
            ("medium", "Medium Roast"),
            ("dark", "Dark Roast"),
            ("espresso", "Espresso Roast"),
            ("decaf", "Decaf"),
        ],
        null=True,
        blank=True,
        help_text="Only required if category = Coffee"
    )

    coffee_state = models.CharField(
        max_length=50,
        choices=[
            ("whole_beans", "Whole Beans"),
            ("ground_coarse", "Ground – Coarse"),
            ("ground_medium", "Ground – Medium"),
            ("ground_fine", "Ground – Fine"),
            ("instant", "Instant Coffee"),
            ("capsules", "Capsules/Pods"),
        ],
        null=True,
        blank=True,
        help_text="Only required if category = Coffee"
    )

    # prevent direct price change
    def save(self, *args, **kwargs):
        if self.pk:
            old = Item.objects.get(pk=self.pk)

            # Detect price change
            if old.price != self.price:
                # Only allow if explicitly flagged from approval flow
                if not getattr(self, "_allow_price_update", False):
                    raise ValidationError(
                        "Direct price changes are not allowed. Use PriceChangeRequest approval flow."
                    )

        super().save(*args, **kwargs)

    # get vendor price without markup
    def get_item_final_price_for_vendor(self):
        """Returns the price including 7% markup."""
        return self.price 
    
    # get dicounted price for vendor withot markup
    def get_item_final_discounted_price_for_vendor(self):
        """Returns the discount price including 7% markup."""
        if self.discount_price:
            return self.discount_price 
        return self.get_item_final_price_for_vendor()

    # price with markup
    def get_item_final_price(self):
        """Returns the price including 7% markup."""
        return self.price * Decimal('1.7')


    def get_item_final_discounted_price(self):
        """Returns the discount price including 7% markup."""
        if self.discount_price:
            return self.discount_price * Decimal('1.7')
        return self.get_item_final_price()
    
    def get_current_price(self):
        """Return the price considering active offers, fallback to discount/normal price."""
        if hasattr(self, "offer") and self.offer.is_active():
            return self.offer.final_price
        if self.discount_price:
            return self.discount_price
        return self.price

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Item.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        # Calculate image hash on save if not present
        if not self.image_hash and self.image:
            self.image_hash = hashlib.sha256(self.image.name.encode('utf-8')).hexdigest()

        super().save(*args, **kwargs)

    @property
    def get_save_upto(self):
        """Returns the price difference between discounted and normal price."""
        if self.discount_price and self.price:
            return self.get_item_final_price() - self.get_item_final_discounted_price()
        return 0
    
    def get_vendor_dicounted(self):
        """Returns the total discounted price for vendor."""
        return self.in_stock * int(self.discount_price)
    
    def get_vendor_total(self):
        """Returns the total price for vendor."""
        return self.in_stock * int(self.price)
    
    def get_final_vendor_price(self):
        """Returns the final vendor price after checking for discount."""
        if self.discount_price:
            return self.get_vendor_dicounted()
        return self.get_vendor_total()

    def __str__(self):
        return self.name

    class Meta:
        ordering = ('-created_at',)

    #get vendor payment info
    def get_vendor_payment_info(self):
        """Returns payment details based on the vendor's preferred method."""
        vendor = self.get_vendor()
        if not vendor:
            return {"error": "Vendor not found for this item."}

        payment_info = {
            "vendor_name": f"{vendor.first_name} {vendor.surname_name}",
            "vendor_code": vendor.vendor_code,
            "payment_method": vendor.payment_method,
            "amount_due": float(self.get_final_vendor_price()),
            "currency": "KES",  # You can make this dynamic if needed
        }

        if vendor.payment_method == 'BANK_TRANSFER':
            payment_info.update({
                "bank_account_number": vendor.bank_account_number,
            })
        elif vendor.payment_method == 'PAYPAL':
            payment_info.update({
                "paypal_email": vendor.email,
            })
        elif vendor.payment_method == 'MOBILE_MONEY':
            payment_info.update({
                "mpesa_number": vendor.mpesa_number,
            })

        return payment_info   

class FeaturedItem(models.Model):
    item = models.ForeignKey(Item, related_name='featured_items', on_delete=models.CASCADE)
    priority = models.PositiveIntegerField(default=0)

    @staticmethod
    def assign_priority_by_views(item):
        views = item.views  # ✅ use integer field directly
        if views > 1000:
            priority = 1
        elif views > 500:
            priority = 2
        else:
            priority = 3  # fallback priority

        # ✅ Update or create FeaturedItem for this item
        featured_item, created = FeaturedItem.objects.update_or_create(
            item=item,
            defaults={"priority": priority}
        )
        return featured_item


         

class ColorVariant(models.Model):
    item = models.ForeignKey(Item, related_name='variants', on_delete=models.CASCADE)
    color = models.CharField(max_length=50)
    image = models.ImageField(upload_to='variant_images/', blank=True, null=True)

    def __str__(self):
        return f"{self.item.name} - {self.color}"

    class Meta:
        unique_together = ('item', 'color')


class SizeStock(models.Model):
    item = models.ForeignKey(Item, related_name="size_only_icon", on_delete=models.CASCADE, null=True, blank=True)
    variant = models.ForeignKey(ColorVariant, related_name="sizes", on_delete=models.CASCADE, null=True, blank=True)
    size = models.JSONField(null=True, blank=True)
    quantity_in_stock = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(item__isnull=False, variant__isnull=True) |
                    models.Q(item__isnull=True, variant__isnull=False)
                ),
                name="size_stock_attached_to_one_parent"
            ),
            models.UniqueConstraint(
                fields=['item', 'size'],
                condition=models.Q(variant__isnull=True),  # Only apply this constraint when there is no ColorVariant
                name='unique_size_only_variant'
            ),
            models.UniqueConstraint(
                fields=['variant', 'size'],
                condition=models.Q(item__isnull=True),  # Only apply this constraint when there is no Item
                name='unique_size_per_color_variant'
            ),
        ]

    def __str__(self):
        parent = self.variant.color if self.variant else self.item.name
        return f'{parent} - {self.size} - {self.quantity_in_stock} in stock'


class AgeVariant(models.Model):
    item = models.ForeignKey(Item, related_name="kids_sizes", on_delete=models.CASCADE)
    age_group = models.CharField(max_length=30)  # e.g., "0-3 months", "4-6 years"
    quantity_in_stock = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('item', 'age_group')

    def __str__(self):
        return f"{self.item.name} - Age: {self.age_group} - {self.quantity_in_stock} in stock"
    
## weight and length models
class Weight(models.Model):
    item = models.OneToOneField("Item", on_delete=models.CASCADE, related_name="weight")
    UNITS = [
        ("g", "Grams"),
        ("kg", "Kilograms"),
        ("lb", "Pounds"),
        ("ml", "Milliliters"),
        ("l", "Liters"),
        ("oz", "Ounces"),
    ]
    value = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=10, choices=UNITS, default="kg")

    def __str__(self):
        return f"{self.value} {self.unit}"


class Length(models.Model):
    item = models.OneToOneField("Item", on_delete=models.CASCADE, related_name="length")
    UNITS = [
        ("cm", "Centimeters"),
        ("m", "Meters"),
        ("in", "Inches"),
    ]
    value = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=10, choices=UNITS, default="cm")

    def __str__(self):
        return f"{self.value} {self.unit}"

    

class Shoe(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="shoe_input")

    shoe_type = models.CharField(max_length=100)
    shoe_gender = models.CharField(max_length=50)
    shoe_size = models.JSONField(help_text="Array of sizes: [38, 39, 40]")

    def __str__(self):
        return f"{self.shoe_type} ({self.shoe_gender})"   




# this model for item price change request
class PriceChangeRequest(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE)
    new_price = models.FloatField()
    approved = models.BooleanField(default=False)
    reason = models.TextField(blank=True, null=True,max_length=500)  # <-- added reason field
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_price_changes"
    )  


    def __str__(self):
        return f"{self.item.name} - {self.new_price}"  




#offer model
class Offer(models.Model):
    item = models.OneToOneField(
        "Item", on_delete=models.CASCADE, related_name="offer"
    )
    discount_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    final_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    def clean(self):
        if self.start_date > self.end_date:
            raise ValidationError("start_date must be before or equal to end_date")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)  # Save to get PK if new

        if self.discount_percentage and self.discount_percentage > 0:
            self.final_price = self.item.price - (
                self.item.price * (self.discount_percentage / Decimal("100"))
            )
            self.item.discount_price = self.final_price
        else:
            self.final_price = None
            self.item.discount_price = None

        self.item.save(update_fields=["discount_price"])
        super().save(update_fields=["final_price"])

    def is_active(self):
        now = timezone.now()
        return self.start_date <= now <= self.end_date

    def __str__(self):
        return f"Offer for {self.item.name} ({self.discount_percentage}% off)"


# track price change
class ItemPriceHistory(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    old_price = models.DecimalField(max_digits=10, decimal_places=2)
    new_price = models.DecimalField(max_digits=10, decimal_places=2)
    changed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    reason = models.TextField(null=True, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

# shipping dimensions
class ShippingDimension(models.Model):
    item = models.OneToOneField(Item, on_delete=models.CASCADE, related_name="shipping_dimension")
    length = models.DecimalField(max_digits=10, decimal_places=2)
    width = models.DecimalField(max_digits=10, decimal_places=2)
    height = models.DecimalField(max_digits=10, decimal_places=2)
    weight = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=10, default="cm")       # cm, in
    weight_unit = models.CharField(max_length=10, default="kg")  # kg, lb

    def volumetric_weight(self):
        """
        Calculate volumetric weight.
        Usually: (L * W * H) / 5000 for cm/kg (common in shipping)
        Adjust divisor if using inches/oz.
        """
        return (self.length * self.width * self.height) / 5000

    def chargeable_weight(self):
        """
        Returns the greater of actual weight or volumetric weight.
        """
        return max(self.weight, self.volumetric_weight())


    



# checking if the visitor/user has already viewed
import uuid
from django.db import models
from django.conf import settings

class ItemView(models.Model):
    item = models.ForeignKey("Item", on_delete=models.CASCADE, related_name="views_log")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    visitor_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("item", "user", "visitor_id")  # ✅ prevent duplicates

    def __str__(self):
        if self.user:
            return f"{self.user.username} viewed {self.item.name}"
        return f"Visitor {self.visitor_id} viewed {self.item.name}"


       
    

    
