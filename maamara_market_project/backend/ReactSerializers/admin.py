from django.contrib import admin
from .models import Item, Category, SubCategory, Department, ColorVariant, SizeStock, Section, Weight, Shoe, Length, PriceChangeRequest, Offer, FeaturedItem, ItemView, Brand

# Register your models here.

admin.site.register(Item)
admin.site.register(Category)
admin.site.register(SubCategory)
admin.site.register(Department)
admin.site.register(ColorVariant)
admin.site.register(SizeStock)
admin.site.register(Section)
admin.site.register(Shoe)
admin.site.register(Weight)
admin.site.register(Length)
admin.site.register(PriceChangeRequest)
admin.site.register(FeaturedItem)
admin.site.register(Offer)
admin.site.register(ItemView)
admin.site.register(Brand)

