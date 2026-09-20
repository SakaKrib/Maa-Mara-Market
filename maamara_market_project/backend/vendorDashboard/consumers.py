# vendor/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
import logging

logger = logging.getLogger(__name__)

class VendorPayoutConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.reference = self.scope["url_route"]["kwargs"]["reference"]
        self.group_name = f"payout_{self.reference}"

        # Join group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebSocket connected: {self.channel_name} joined {self.group_name}")

    async def disconnect(self, close_code):
        # Leave group
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"WebSocket disconnected: {self.channel_name} left {self.group_name}")

    # Receive message from group
    async def payout_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event))

class VendorDirectoryConsumer(AsyncWebsocketConsumer):
    """
    Broadcast a lightweight change event to admin vendor-directory clients.
    Clients refetch the canonical /api/vendors/ payload after each event.
    """

    group_name = "admin_vendors"

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated or not user.is_staff:
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def vendor_changed(self, event):
        await self.send(text_data=json.dumps({
            "type": "vendor.changed",
            "action": event.get("action", "updated"),
            "vendor_id": event.get("vendor_id"),
        }))
