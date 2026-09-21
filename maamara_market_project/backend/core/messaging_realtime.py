from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Conversation, DirectMessage


def _send(group, payload):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    def send():
        try:
            async_to_sync(channel_layer.group_send)(
                group,
                {"type": "message_event", "payload": payload},
            )
        except Exception:
            return

    transaction.on_commit(send)


@receiver(post_save, sender=DirectMessage)
def direct_message_saved(sender, instance, created, **kwargs):
    if not created:
        return

    payload = {
        "type": "message.created",
        "conversation_id": instance.conversation_id,
        "message_id": instance.id,
        "sender_id": instance.sender_id,
        "body": instance.body,
        "image": instance.image.url if instance.image else None,
        "created_at": instance.created_at.isoformat(),
    }

    _send(f"chat_conversation_{instance.conversation_id}", {**payload, "type": "message.created"})
    sidebar_payload = {
        "type": "conversation.updated",
        "conversation_id": instance.conversation_id,
        "message_id": instance.id,
        "sender_id": instance.sender_id,
        "body": instance.body,
        "has_image": bool(instance.image),
        "created_at": instance.created_at.isoformat(),
    }
    _send(f"chat_user_{instance.conversation.admin_id}", sidebar_payload)
    _send(f"chat_user_{instance.conversation.participant_id}", sidebar_payload)


@receiver(post_save, sender=Conversation)
def conversation_saved(sender, instance, created, **kwargs):
    if not created:
        return

    payload = {
        "type": "conversation.created",
        "conversation_id": instance.id,
        "admin_id": instance.admin_id,
        "participant_id": instance.participant_id,
    }
    _send(f"chat_user_{instance.admin_id}", payload)
    _send(f"chat_user_{instance.participant_id}", payload)
