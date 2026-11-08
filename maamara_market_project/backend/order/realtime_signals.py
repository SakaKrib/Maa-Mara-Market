from asgiref.sync import async_to_sync
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer

from .models import Transaction


def _broadcast_account_change(action, object_id):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    def send():
        try:
            async_to_sync(channel_layer.group_send)(
                "admin_accounts",
                {
                    "type": "account_changed",
                    "resource": "transaction",
                    "action": action,
                    "object_id": object_id,
                },
            )
        except Exception:
            return

    transaction.on_commit(send)


@receiver(post_save, sender=Transaction)
def transaction_saved(sender, instance, created, **kwargs):
    _broadcast_account_change("created" if created else "updated", instance.pk)


@receiver(post_delete, sender=Transaction)
def transaction_deleted(sender, instance, **kwargs):
    _broadcast_account_change("deleted", instance.pk)


def _broadcast_payout_change(payout_id):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    def send():
        try:
            async_to_sync(channel_layer.group_send)(
                "admin_fulfillment", {"type": "payout_changed", "payout_id": payout_id}
            )
        except Exception:
            return

    transaction.on_commit(send)


def _register_payout_signal():
    from vendorDashboard.models import VendorPayout

    @receiver(post_save, sender=VendorPayout, weak=False, dispatch_uid="monthly-accounting-payout-live")
    def payout_saved(sender, instance, **kwargs):
        # Any payout change (created, sent, paid, failed) can alter a month's settlement.
        _broadcast_payout_change(instance.pk)


_register_payout_signal()
