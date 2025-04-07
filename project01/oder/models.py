from django.db import models
from django.contrib.auth.models import User
from shop.models import Item
from django.shortcuts import reverse
from django.conf import settings
from django_countries.fields import CountryField


class OderItem(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('completed', 'Completed')],
        default='pending'
    )

    def get_total_item_price(self):
        return self.quantity * self.item.price
    
    def get_total_discount(self):
        return self.quantity * self.item.discount_price
       
    
    def get_amount_saved(self):
        return self.get_total_item_price() - self.get_total_discount()


    def __str__(self):
        return f"{self.quantity} of {self.item.name}"
    
        
    def get_final_price(self):
        if self.item.discount_price:
            return self.get_total_discount()
        return self.get_total_item_price()

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    items = models.ManyToManyField(OderItem)
    ordered_date = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('completed', 'Completed')],
        default='pending'
    )
    billing_address = models.ForeignKey('BillingAddress', on_delete=models.SET_NULL, blank=True, null=True)
    payment = models.ForeignKey('Payment', on_delete=models.SET_NULL, blank=True, null=True)


    def get_total(self):
        total = 0
        for order_item in self.items.all():  # Corrected this line
            total += order_item.get_final_price()
        return total

    def __str__(self):
        return f"Order {self.id} by {self.user.username}"

    def get_total_qty(self):
        total_qty = sum([item.quantity for item in self.items.all()])  # Corrected this line
        return total_qty
    

#billing address model

class BillingAddress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    street_address = models.CharField(max_length=100)
    appartment_address = models.CharField(max_length=100)
    country = CountryField(multiple = False)
    zip = models.CharField(max_length=100) 


    def __str__(self):
        return self.user.username


# payment model

class Payment(models.Model):
    stripe_charge_id = models.CharField(max_length=50)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,blank=True, null=True)
    amount = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username



