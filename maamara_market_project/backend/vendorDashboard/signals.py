from asgiref.sync import async_to_sync
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer

from .models import Vendor, VendorRequest, VendorItemRequest, ReturnRequest, VendorPayout
from ReactSerializers.models import PriceChangeRequest


def _broadcast(group, resource, action, object_id):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    def send():
        try:
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    "type": "request_changed",
                    "resource": resource,
                    "action": action,
                    "object_id": object_id,
                },
            )
        except Exception:
            # WebSocket delivery must never break database persistence.
            return

    transaction.on_commit(send)


def _broadcast_vendor_change(action, vendor_id):
    _broadcast("admin_vendors", "vendor", action, vendor_id)


def _broadcast_request_change(resource, action, object_id):
    _broadcast("admin_vendor_requests", resource, action, object_id)


@receiver(post_save, sender=Vendor)
def vendor_saved(sender, instance, created, **kwargs):
    _broadcast_vendor_change("created" if created else "updated", instance.pk)


@receiver(post_delete, sender=Vendor)
def vendor_deleted(sender, instance, **kwargs):
    _broadcast_vendor_change("deleted", instance.pk)


@receiver(post_save, sender=VendorRequest)
def vendor_request_saved(sender, instance, created, **kwargs):
    _broadcast_request_change(
        "vendor",
        "created" if created else "updated",
        instance.pk,
    )


@receiver(post_save, sender=VendorItemRequest)
def vendor_item_request_saved(sender, instance, created, **kwargs):
    _broadcast_request_change(
        "item",
        "created" if created else "updated",
        instance.pk,
    )


@receiver(post_save, sender=PriceChangeRequest)
def price_change_request_saved(sender, instance, created, **kwargs):
    _broadcast_request_change(
        "price",
        "created" if created else "updated",
        instance.pk,
    )


@receiver(post_delete, sender=VendorRequest)
def vendor_request_deleted(sender, instance, **kwargs):
    _broadcast_request_change("vendor", "deleted", instance.pk)


@receiver(post_delete, sender=VendorItemRequest)
def vendor_item_request_deleted(sender, instance, **kwargs):
    _broadcast_request_change("item", "deleted", instance.pk)


@receiver(post_delete, sender=PriceChangeRequest)
def price_change_request_deleted(sender, instance, **kwargs):
    _broadcast_request_change("price", "deleted", instance.pk)


@receiver(post_save, sender=ReturnRequest)
def return_request_saved(sender, instance, created, **kwargs):
    _broadcast_request_change(
        "return",
        "created" if created else "updated",
        instance.pk,
    )


@receiver(post_delete, sender=ReturnRequest)
def return_request_deleted(sender, instance, **kwargs):
    _broadcast_request_change("return", "deleted", instance.pk)


@receiver(post_save, sender=VendorPayout)
def vendor_payout_saved(sender, instance, created, **kwargs):
    _broadcast(
        "admin_payouts",
        "payout",
        "created" if created else "updated",
        instance.pk,
    )


@receiver(post_delete, sender=VendorPayout)
def vendor_payout_deleted(sender, instance, **kwargs):
    _broadcast("admin_payouts", "payout", "deleted", instance.pk)
