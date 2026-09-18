from django.contrib import admin
from .models import OderItem, Order,Payment,BillingAddress, Transaction, Customer, Card

# Register your models here.

admin.site.register(OderItem)

admin.site.register(Payment)
admin.site.register(BillingAddress)
admin.site.register(Transaction)
admin.site.register(Customer)
admin.site.register(Card)


from django.contrib import admin
from .models import Order, OderItem

class OrderItemInline(admin.TabularInline):
    model = OderItem  # Directly use OderItem
    extra = 1  # Optional, number of empty forms

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    inlines = [OrderItemInline]
    list_display = ['id', 'user', 'status', 'ordered_date', 'get_total']
    list_filter = ['status', 'ordered_date']

    class Meta:
        verbose_name = "Order"
        verbose_name_plural = "Orders"


class TransactionAdmin(admin.ModelAdmin):
    list_display = ("transaction_type", "payment_method", "amount", "status", "created_at")

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["paypal_total"] = Transaction.get_paypal_total()
        extra_context["mpesa_total"] = Transaction.get_mpesa_total()
        return super().changelist_view(request, extra_context=extra_context)
