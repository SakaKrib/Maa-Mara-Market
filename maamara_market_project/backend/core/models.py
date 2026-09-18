import uuid
from datetime import date, timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from ReactSerializers.models import Item



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