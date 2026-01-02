from django.contrib import admin


# Register your models here.

from django.contrib import admin
from .models import Referral, Voucher, Wallet, Profile, PendingRegistration, EmailOTP, Notification, ActivityLog

class ReferralAdmin(admin.ModelAdmin):
    list_display = ('referrer', 'invited_user', 'referral_code')  # Ensure fields exist in Referral model
    search_fields = ('referral_code', 'referrer__username', 'invited_user__username')

class VoucherAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'discount', 'expiry_date', 'redeemed')  # Ensure fields exist in Voucher model
    list_filter = ('redeemed',)

admin.site.register(Referral, ReferralAdmin)
admin.site.register(Voucher, VoucherAdmin)


admin.site.register(Profile)
admin.site.register(Wallet)
admin.site.register(PendingRegistration)
admin.site.register(EmailOTP)
admin.site.register(Notification)
admin.site.register(ActivityLog)



# admin render messages for reply
from django.contrib import admin
from .models import SupportMessage
from django.core.mail import send_mail

class SupportMessageAdmin(admin.ModelAdmin):
    list_display = ["user", "message", "support_reply", "created_at"]
    search_fields = ["user__username", "message"]
    readonly_fields = ["user", "email", "message"]  # ✅ Prevent edits to original message

    def save_model(self, request, obj, form, change):
        if obj.support_reply:  # ✅ If the support team added a reply, trigger an email
            send_mail(
                subject="Your Support Request Has Been Answered",
                message=f"Our team has responded to your support request:\n\n{obj.support_reply}",
                from_email="support@example.com",
                recipient_list=[obj.email],
            )
        obj.save()

admin.site.register(SupportMessage, SupportMessageAdmin)
