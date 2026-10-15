from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification, ActivityLog
from .notifications.ws import push_vendor_notification
from core.Serializer import NotificationSerializer, ActivityLogSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from vendorDashboard.models import VendorRequest
from core.push_notifications import send_notification_push


# notify admin for anyincomig vendor requests
@receiver(post_save, sender=VendorRequest)
def create_vendor_request_notification(sender, instance, created, **kwargs):
    # Define your frontend route template — update this as needed
    frontend_review_url = f"/admin/vendor-requests/{instance.id}/review"  # or full URL if needed

    # Notify all admins (you can change this to a group or specific users)
    admins = User.objects.filter(is_superuser=True)

    if created:
        user = instance.user
        vendor_name = (user.get_full_name() or "").strip() or user.username
        vendor_label = (
            vendor_name
            if vendor_name.lower().startswith("vendor ")
            else f"Vendor {vendor_name}"
        )
        for admin in admins:
            Notification.objects.create(
                user=admin,
                title="New Vendor Request",
                message=f"{vendor_label} submitted a new vendor request.",
                vendor_request=instance,
                url=frontend_review_url
            )


@receiver(post_save, sender=Notification)
def notify_vendor(sender, instance, created, **kwargs):
    #print("SIGNAL FIRED", instance.id, created)
    if not created:
        return

    # Central delivery hook: every newly-created notification gets the same
    # push path, including order updates, approvals, messages, returns and payouts.
    # Defer until commit so a rolled-back transaction cannot send a false alert.
    if instance.user_id:
        notification_id = instance.pk
        transaction.on_commit(lambda: send_notification_push(notification_id))

    # Retain the existing vendor-specific serialization hook without making
    # push delivery dependent on the recipient being a vendor.
    vendor = getattr(instance.user, "vendor", None)
    if not vendor:
        return

    instance.refresh_from_db()
    data = NotificationSerializer(instance).data


@receiver(post_save, sender=ActivityLog)
def notify_item_owner_for_marketplace_activity(sender, instance, created, **kwargs):
    """Turn important customer item actions into vendor-facing notifications."""
    if not created or not instance.item_id or instance.action not in {
        "item_added_to_cart",
        "item_viewed",
        "item_sold",
    }:
        return

    item = instance.item
    vendor = getattr(item, "vendor", None)
    recipient = getattr(vendor, "user", None) if vendor else None
    if recipient is None or recipient.pk == instance.user_id:
        return

    action_copy = {
        "item_added_to_cart": (
            "Item added to cart",
            f"A customer added {item.name} to their cart.",
            "/vendors-dashboard",
        ),
        "item_viewed": (
            "Your item was viewed",
            f"A customer viewed your item {item.name}.",
            "/vendors-dashboard",
        ),
        "item_sold": (
            "Your item was purchased",
            f"Your item {item.name} was purchased.",
            "/vendors-dashboard/orders",
        ),
    }
    title, message, url = action_copy[instance.action]
    Notification.objects.create(
        user=recipient,
        title=title,
        message=message,
        url=url,
    )


# activity
@receiver(post_save, sender=ActivityLog)
def broadcast_activity_log(sender, instance, created, **kwargs):
    if not created:
        return

    channel_layer = get_channel_layer()

    data = ActivityLogSerializer(instance).data

    print("🔥 Activity log signal fired:", instance.id)

    # ActivityLogSerializer includes the nested ItemSerializer. Decimal model
    # fields (for example price/discount values) are valid DRF response values
    # but channels-redis/msgpack cannot serialize Decimal instances directly.
    def make_channel_safe(value):
        if isinstance(value, dict):
            return {key: make_channel_safe(item) for key, item in value.items()}
        if isinstance(value, (list, tuple)):
            return [make_channel_safe(item) for item in value]
        if hasattr(value, "isoformat"):
            return value.isoformat()
        # Keep numeric semantics for the frontend while making the payload
        # compatible with msgpack used by channels-redis.
        from decimal import Decimal
        if isinstance(value, Decimal):
            return float(value)
        return value

    data = make_channel_safe(data)

    async_to_sync(channel_layer.group_send)(
        "activity_logs",
        {
            "type": "activity_logs_update",
            "logs": [data],
        }
    )


