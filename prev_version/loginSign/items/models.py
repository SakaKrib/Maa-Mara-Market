from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

# Create your models here.



CATEGORY_CHOICES = (
  (' Home Decor', ' Home Decor'),
  (' kitchen', ' kitchen', ),
  
  (' Fashion-men', 'Men Shoe', ),
  (' Fashion-men', 'Men Shirt'),
  (' Fashion-men', 'Men T-Shirt'),
  (' Fashion-children', ' Men Hat / cap'),
  (' Fashion-men', 'Men Trouser'),
  
  (' Fashion-women', ' Women Shoe '),
  (' Fashion-women', ' Women Shirt'),
  (' Fashion-women', ' Women T-Shirt'),
  (' Fashion-children', ' Women Hat / cap'),
  
  (' Fashion-women', ' Women Trouser'),
  (' Fashion-children', ' Children Shoe'),
  (' Fashion-children', ' Children Shirt'),
  (' Fashion-children', ' Children T-Shirt'),
  (' Fashion-children', ' Children Touser'),
  (' Fashion-children', ' Children Hat / cap'),
  
  (' Phone stand', ' Phone stand'),
  (' Laptop stand', ' Laptop stand'),
  (' Baskets', ' Baskets'),
  (' Furnitures', ' Furnitures'),
  (' Mirror', ' Mirror'),
  (' Masks', ' Masks'),
  (' Ornamemts', ' Ornamemts'),
  (' Sculptures', ' Sculptures'),
  (' Kikoi', ' Kikoi'),
  (' Blankets', ' Blankets'),
  (' Jewelery', ' Jewelery'),
  ( ' Carpet', ' Carpet')
)

LABEL_CHOICES = (
  (' p', ' primary'),
  (' s', ' secondary'),
  (' d', ' danger'),
)

class Category(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ('name',)
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name

class Item(models.Model):
    category = models.ForeignKey(Category, related_name='items', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='media/', blank=False, null=False)
    name = models.CharField(max_length=200) 
    description = models.TextField(blank=True, null=True)
    price = models.IntegerField(blank=False,) 
    in_stock = models.IntegerField() 
    created_by = models.ForeignKey(User, related_name='items', on_delete=models.CASCADE)
    #label = models.CharField(choices=LABEL_CHOICES, max_length=1)
    created_at = models.DateTimeField(auto_now_add=True)
    slug = models.SlugField

    def __str__(self):
        return self.name





