import json

from channels.generic.websocket import AsyncWebsocketConsumer


class FAQConsumer(AsyncWebsocketConsumer):
    group_name = "public_faq"

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def faq_changed(self, event):
        await self.send(text_data=json.dumps({
            "type": "faq.changed",
            "action": event.get("action", "updated"),
            "faq_id": event.get("object_id"),
        }))
