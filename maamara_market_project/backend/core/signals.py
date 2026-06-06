from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification, ActivityLog
from .notifications.ws import push_vendor_notification
from core.Serializer import NotificationSerializer, ActivityLogSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from vendorDashboard.models import VendorRequest


# notify admin for anyincomig vendor requests
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


@receiver(post_save, sender=Notification)
def notify_vendor(sender, instance, created, **kwargs):
    #print("SIGNAL FIRED", instance.id, created)
    if not created:
        return

    vendor = getattr(instance.user, "vendor", None)
    if not vendor:
        return

    instance.refresh_from_db()

    data = NotificationSerializer(instance).data
    

    print("SERIALIZED NOTIFICATION:", data)

    #push_vendor_notification(vendor.id, [data])

# activity
@receiver(post_save, sender=ActivityLog)
def broadcast_activity_log(sender, instance, created, **kwargs):
    if not created:
        return

    channel_layer = get_channel_layer()

    raw_data = ActivityLogSerializer(instance).data

    # 🔥 FIX: convert Decimal → str recursively
    def clean_data(obj):
        if isinstance(obj, dict):
            return {k: clean_data(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [clean_data(i) for i in obj]
        elif hasattr(obj, "to_eng_string"):  # Decimal
            return str(obj)
        return obj

    data = clean_data(raw_data)

    print("🔥 Activity log signal fired:", instance.id)

    async_to_sync(channel_layer.group_send)(
        "activity_logs",
        {
            "type": "activity_logs_update",
            "logs": [data],
        }
    )


