from django.contrib import admin
from .models import Vendor, SoldItem,PersistentItemData

# Register your models here.

admin.site.register(Vendor)
admin.site.register(SoldItem)
admin.site.register(PersistentItemData)
