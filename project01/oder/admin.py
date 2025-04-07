from django.contrib import admin
from .models import OderItem, Order,Payment,BillingAddress

# Register your models here.

admin.site.register(OderItem)

admin.site.register(Payment)
admin.site.register(BillingAddress)


from django.contrib import admin
from .models import Order, OderItem

class OrderItemInline(admin.TabularInline):
    model = Order.items.through  # Use the intermediate model for ManyToMany

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    inlines = [OrderItemInline]
    list_display = ['id', 'user', 'status', 'ordered_date', 'get_total']
    list_filter = ['status', 'ordered_date']

    class Meta:
        verbose_name = "Order"
        verbose_name_plural = "Orders"
