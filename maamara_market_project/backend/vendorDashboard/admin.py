from django.contrib import admin
from .models import (
    Vendor,
    SoldItem,
    ReturnRequest,
    VendorAdjustment,
    VendorPayout,
    VendorRequest,
    VendorItemRequest,
    ItemDraft,
    ItemDraftMedia,
)

# Register your models here.

admin.site.register(Vendor)
admin.site.register(ReturnRequest)
admin.site.register(VendorAdjustment)
admin.site.register(VendorPayout)
admin.site.register(VendorRequest)
admin.site.register(VendorItemRequest)


@admin.register(ItemDraft)
class ItemDraftAdmin(admin.ModelAdmin):
    list_display = ["id", "owner", "vendor", "created_item", "status", "updated_at", "expires_at"]
    list_filter = ["status", "vendor"]
    search_fields = ["id", "owner__username", "owner__email", "vendor__vendor_code"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-updated_at"]


@admin.register(ItemDraftMedia)
class ItemDraftMediaAdmin(admin.ModelAdmin):
    list_display = ["id", "draft", "kind", "slot_key", "variant_key", "media_type", "sort_order", "created_at"]
    list_filter = ["kind", "media_type"]
    search_fields = ["slot_key", "variant_key", "draft__id", "draft__owner__username", "draft__owner__email"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["draft", "sort_order", "id"]


@admin.register(SoldItem)
class SoldItemAdmin(admin.ModelAdmin):
    list_display = ['item', 'vendor', 'quantity', 'sale_price', 'total_price', 'date_sold']
    readonly_fields = ['sale_price', 'total_price', 'date_sold']
