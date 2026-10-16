from django.db import transaction
from django.db.models.signals import post_save, pre_save
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
    frontend_review_url = "/admin-dashboard/vendor-requests"

    # Notify all admins (you can change this to a group or specific users)
    admins = User.objects.filter(is_staff=True)

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
        "item_reviewed",
        "item_added_to_wishlist",
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
        "item_reviewed": (
            "New customer review",
            f"A customer left a review for {item.name}.",
            f"/item/{item.pk}/",
        ),
        "item_added_to_wishlist": (
            "Your item was wishlisted",
            f"A customer added {item.name} to their wishlist.",
            "/vendors-dashboard",
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


# Important order lifecycle changes are persisted as notifications so the same
# in-app, browser, and native push pipeline handles fulfillment updates.
_ORDER_NOTIFICATION_COPY = {
    "PROCESSING": ("Order processing", "is being processed"),
    "PACKING": ("Order being packed", "is being packed for dispatch"),
    "READY_TO_SHIP": ("Order ready to ship", "is ready to ship"),
    "SHIPPED": ("Order shipped", "has been shipped"),
    "IN_TRANSIT": ("Order in transit", "is in transit"),
    "OUT_FOR_DELIVERY": ("Order out for delivery", "is out for delivery"),
    "DELIVERED": ("Order delivered", "has been marked delivered"),
    "AWAITING_CONFIRMATION": ("Delivery confirmation needed", "is awaiting your delivery confirmation"),
    "COMPLETED": ("Order completed", "has been completed"),
    "CANCELLED": ("Order cancelled", "has been cancelled"),
}


@receiver(pre_save, sender="oder.Order")
def remember_order_status_for_notifications(sender, instance, **kwargs):
    if not instance.pk:
        instance._notification_previous_status = None
        return
    instance._notification_previous_status = (
        sender.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
    )


@receiver(post_save, sender="oder.Order")
def notify_order_status_change(sender, instance, created, **kwargs):
    previous = getattr(instance, "_notification_previous_status", None)
    current = str(instance.status or "").upper()
    if created or previous is None or str(previous).upper() == current:
        return
    if current not in _ORDER_NOTIFICATION_COPY:
        # PAID is notified by complete_paid_order() exactly once; return/refund
        # workflows already create audience-specific notifications of their own.
        return

    from core.models import Notification
    from order.models import OrderItem

    title, phrase = _ORDER_NOTIFICATION_COPY[current]
    customer_message = f"Order #{instance.pk} {phrase}."
    if instance.user_id:
        Notification.objects.create(
            user=instance.user,
            title=title,
            message=customer_message,
            url=f"/customer-order?order={instance.pk}",
        )

    order_items = OrderItem.objects.filter(
        order_id=instance.pk
    ).select_related("item__vendor__user")
    vendor_users = {}
    for order_item in order_items:
        vendor = getattr(order_item.item, "vendor", None)
        vendor_user = getattr(vendor, "user", None) if vendor else None
        if vendor_user:
            vendor_users[vendor_user.pk] = vendor_user

    for vendor_user in vendor_users.values():
        Notification.objects.create(
            user=vendor_user,
            title=title,
            message=f"Order #{instance.pk} {phrase}.",
            url=f"/vendors-dashboard/orders?order={instance.pk}",
        )
