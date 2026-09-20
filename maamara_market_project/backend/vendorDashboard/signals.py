from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Vendor


def _broadcast_vendor_change(action, vendor_id):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    try:
        async_to_sync(channel_layer.group_send)(
            "admin_vendors",
            {
                "type": "vendor_changed",
                "action": action,
                "vendor_id": vendor_id,
            },
        )
    except Exception:
        # Real-time delivery must never make vendor persistence fail.
        return


@receiver(post_save, sender=Vendor)
def vendor_saved(sender, instance, created, **kwargs):
    _broadcast_vendor_change(
        "created" if created else "updated",
        instance.pk,
    )


@receiver(post_delete, sender=Vendor)
def vendor_deleted(sender, instance, **kwargs):
    _broadcast_vendor_change("deleted", instance.pk)
