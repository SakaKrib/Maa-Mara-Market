from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class RealtimeConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.groups = {"realtime_catalog"}
        if self.user and self.user.is_authenticated:
            self.groups.add(f"realtime_user_{self.user.id}")
            if await self.is_vendor():
                self.groups.add(f"realtime_vendor_{self.vendor_id}")
            if self.user.is_staff or self.user.is_superuser:
                self.groups.add("realtime_admin")
        for group in self.groups:
            await self.channel_layer.group_add(group, self.channel_name)
        await self.accept()
        await self.send_json({"type":"realtime.connected","groups":sorted(self.groups)})

    async def disconnect(self, close_code):
        for group in getattr(self, "groups", set()):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def realtime_event(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def is_vendor(self):
        try:
            self.vendor_id = self.user.vendor.id
            return True
        except Exception:
            self.vendor_id = None
            return False

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "ping":
            await self.send_json({"type":"pong"})
