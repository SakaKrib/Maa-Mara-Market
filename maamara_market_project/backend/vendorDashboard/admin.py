from django.contrib import admin
from .models import Vendor, SoldItem,ReturnRequest,VendorAdjustment, VendorPayout, VendorRequest, VendorItemRequest

# Register your models here.

admin.site.register(Vendor)
admin.site.register(ReturnRequest)
admin.site.register(VendorAdjustment)
admin.site.register(VendorPayout)
admin.site.register(VendorRequest)
admin.site.register(VendorItemRequest)


@admin.register(SoldItem)
class SoldItemAdmin(admin.ModelAdmin):
    list_display = ['item', 'vendor', 'quantity', 'sale_price', 'total_price', 'date_sold']
    readonly_fields = ['sale_price', 'total_price', 'date_sold']
