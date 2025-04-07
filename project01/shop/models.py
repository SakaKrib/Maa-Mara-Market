from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.shortcuts import reverse
from django.core.exceptions import ValidationError



CATEGORY_CHOICES = (
    ('Home Decor', 'Home Decor'),
    ('kitchen', 'kitchen'),
    ('Beauty & cosmetic Products', 'Beauty & cosmetic Products'),
    ('jewelery-earings', 'Earings'),
    ('jewelery-anklets', 'Ankets'),
    ('jewelery-bracelets', 'Bracelets'),
    ('jewelery-necklace', 'Nacklace'),
    ('clothes-bandana', 'Bandana'),
    ('clothes-scrunchies', 'Scrunchies'),
    ('clothes-kitenge', 'Clothes Ankara'),
    ('clothes-kitenge', 'Clothes Kitenge'),
    ('clothes-kitenge', 'Clothes Kikoi'),
    ('Fashion-men', 'Men Shoe'),
    ('Fashion-men', 'Men Shirt'),
    ('Fashion-men', 'Men T-Shirt'),
    ('Fashion-children', 'Men Hat / cap'),
    ('Fashion-men', 'Men Trouser'),
    ('Fashion-women', 'Women Shoe'),
    ('Fashion-women', 'Women Shirt'),
    ('Fashion-women', 'Women T-Shirt'),
    ('Fashion-children', 'Women Hat / cap'),
    ('Fashion-women', 'Women Trouser'),
    ('Fashion-children', 'Children Shoe'),
    ('Fashion-children', 'Children Shirt'),
    ('Fashion-children', 'Children T-Shirt'),
    ('Fashion-children', 'Children Trouser'),
    ('Fashion-children', 'Children Hat / cap'),
    ('Phone-stand', 'Phone stand'),
    ('Phone-case', 'Phone Case'),
    ('Laptop-stand', 'Laptop stand'),
    ('Baskets', 'Baskets'),
    ('Furnitures', 'Furnitures'),
    ('Mirror', 'Mirror'),
    ('Masks', 'Masks'),
    ('Ornaments', 'Ornaments'),
    ('Sculptures', 'Sculptures'),
    ('Kikoi', 'Kikoi'),
    ('Blankets', 'Blankets'),
    ('Jewelery', 'Jewelery'),
    ('Carpet', 'Carpet')
)




class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)

    class Meta:
        ordering = ('name',)
        verbose_name_plural = 'categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


from django.db import models

class Item(models.Model):
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

    
    category = models.ForeignKey('Category', related_name='items', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='media/', blank=False, null=False)
    name = models.CharField(max_length=40, blank=False, null=False)
    size = models.CharField(max_length=30, choices=SIZE_CHOICES, blank=True, null=True)
    description = models.TextField(blank=False, null=False)
    gender_based = models.CharField(max_length=15, choices=GENDER_CHOICES, blank=True, null=True)
    children_size_based_age = models.CharField(max_length=15, choices=AGE_CHOICES, blank=True, null=True)
    price = models.IntegerField(blank=False, null=False)
    discount_price = models.IntegerField(blank=True, null=True)
    in_stock = models.IntegerField(blank=False,null=False)
    created_by = models.ForeignKey('auth.User', related_name='items', on_delete=models.CASCADE)
    available = models.BooleanField(default=True)
    updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    image_hash = models.CharField(max_length=64, unique=True, blank=True, null=True)  # New field



    def validate_category(self, category_instance):
        valid_choices = [choice[0] for choice in CATEGORY_CHOICES]
        if category_instance not in valid_choices:
            raise ValidationError(f"{category_instance} is not a valid category.")

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Item.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def get_save_upto(self):
        if self.discount_price and self.price:
            return self.price - self.discount_price
        return 0
    
    def get_vendor_dicounted(self):
        return self.in_stock * int(self.discount_price)
    
    def get_vendor_total(self):
        return self.in_stock * int(self.price)
    
    #vendor total or every item
    def get_final_vendor_price(self):
        if self.discount_price:
            return self.get_vendor_dicounted()
        return self.get_vendor_total()
    
   

    def __str__(self):
        return self.name

    class Meta:
        ordering = ('-created_at',)





