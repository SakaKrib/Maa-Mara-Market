from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import BlogPost, Banner


def _broadcast(resource, action, object_id):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    def send():
        try:
            async_to_sync(channel_layer.group_send)(
                "admin_vendor_requests",
                {
                    "type": "request_changed",
                    "resource": resource,
                    "action": action,
                    "object_id": object_id,
                },
            )
        except Exception:
            return

    transaction.on_commit(send)


@receiver(post_save, sender=BlogPost)
def blog_saved(sender, instance, created, **kwargs):
    _broadcast("blog", "created" if created else "updated", instance.pk)


@receiver(post_delete, sender=BlogPost)
def blog_deleted(sender, instance, **kwargs):
    _broadcast("blog", "deleted", instance.pk)


@receiver(post_save, sender=Banner)
def banner_saved(sender, instance, created, **kwargs):
    _broadcast("banner", "created" if created else "updated", instance.pk)


@receiver(post_delete, sender=Banner)
def banner_deleted(sender, instance, **kwargs):
    _broadcast("banner", "deleted", instance.pk)
