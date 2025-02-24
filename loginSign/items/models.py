from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

# Create your models here.


CATEGORY_CHOICES = (
    (' KTN', ' kitchen'),
    (' FSHN', ' Fashion'),
    (' HMEDCO', ' Home Decor'),
    (' PHNSTD', ' Phone stand'),
    (' LTPS', ' Laptop stand'),
    (' BSKT', ' Baskets'),
    (' FTRS', ' Furnitures'),
    (' MIR', ' Mirror'),
    (' MSK', ' Masks'),
    (' ONAMNT', ' Ornamemts'),
    (' SCPT', ' Sculptures'),
    (' KKOI', ' Kikoi'),
    (' BNKT', ' Blankets'),
    (' JWY', ' Jewelry'),
)

LABEL_CHOICES = (
    (' ', ' primary'),
    (' ', ' secondary'),
    (' ', ' danger'),
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
    label = models.CharField(choices=LABEL_CHOICES, max_length=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class OrderItem(models.Model):
    Item = models.ForeignKey(Item, on_delete=models.CASCADE)

    def __str__(self):
        return self.name

class Order(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    items =models.ManyToManyField(OrderItem)
    start_date = models.DateField(auto_now_add=True)
    orderd_date = models.DateTimeField()
    ordered = models.BooleanField(default=False)

    def __str__(self):
        return self.name

