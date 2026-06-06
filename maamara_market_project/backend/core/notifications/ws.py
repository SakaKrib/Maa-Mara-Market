from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

def push_vendor_notification(vendor_id, notification_data):
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f"vendor_notifications_{vendor_id}",
        {
            "type": "notifications_update",
            "notifications": notification_data,
        }
    )