from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async


class MessagingConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.user_group = None
        self.conversation_groups = set()

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4401)
            return

        self.user_group = f"chat_user_{self.user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()
        await self.send_json({"type": "messaging.connected"})

    async def disconnect(self, close_code):
        if self.user_group:
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

        for group in self.conversation_groups:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "join_conversation":
            try:
                conversation_id = int(content.get("conversation_id"))
            except (TypeError, ValueError):
                return

            allowed = await self._can_access(conversation_id)
            if not allowed:
                await self.send_json({"type": "messaging.error", "error": "Conversation access denied."})
                return

            group = f"chat_conversation_{conversation_id}"
            await self.channel_layer.group_add(group, self.channel_name)
            self.conversation_groups.add(group)
            await self.send_json({"type": "conversation.joined", "conversation_id": conversation_id})

    async def message_event(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def _can_access(self, conversation_id):
        from .models import Conversation
        conversation = Conversation.objects.filter(pk=conversation_id).first()
        if not conversation:
            return False
        return (
            conversation.participant_id == self.user.id
            or (self.user.is_staff and conversation.admin_id == self.user.id)
        )
}