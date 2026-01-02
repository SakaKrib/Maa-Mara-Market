from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification
from django.contrib.auth.models import User
from vendorDashboard.models import VendorRequest

@receiver(post_save, sender=VendorRequest)
def create_vendor_request_notification(sender, instance, created, **kwargs):
    # Define your frontend route template — update this as needed
    frontend_review_url = f"/admin/vendor-requests/{instance.id}/review"  # or full URL if needed

    # Notify all admins (you can change this to a group or specific users)
    admins = User.objects.filter(is_superuser=True)

    if created:
        for admin in admins:
            Notification.objects.create(
                user=admin,
                message=f"New vendor request submitted by {instance.user.username}.",
                vendor_request=instance,
                url=frontend_review_url
            )
    else:
        # For example, notify only when status becomes 'pending'
        if instance.status == 'pending':
            for admin in admins:
                Notification.objects.create(
                    user=admin,
                    message=f"Vendor request {instance.id} updated to status '{instance.status}'.",
                    vendor_request=instance,
                    url=frontend_review_url
                )
