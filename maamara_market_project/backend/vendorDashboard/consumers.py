# vendor/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import logging
from django.db import models

logger = logging.getLogger(__name__)

class VendorPayoutConsumer(AsyncWebsocketConsumer):
    """
    Stream payout confirmation events to the admin/vendor that owns the payout.

    The payout callbacks publish canonical realtime events to the vendor group;
    this reference-specific socket converts those events to the legacy
    payout_message shape expected by the existing payment screens.
    """

    async def connect(self):
        self.reference = self.scope["url_route"]["kwargs"]["reference"]
        user = self.scope.get("user")

        if not user or not user.is_authenticated:
            await self.close(code=4403)
            return

        payout = await self.get_payout()
        if not payout:
            await self.close(code=4404)
            return

        if not user.is_staff and payout["vendor_user_id"] != user.id:
            await self.close(code=4403)
            return

        self.group_name = f"payout_{self.reference}"
        self.vendor_group_name = f"realtime_vendor_{payout['vendor_id']}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.channel_layer.group_add(
            self.vendor_group_name, self.channel_name
        )
        await self.accept()

        logger.info(
            "Payout WebSocket connected",
            extra={"reference": self.reference, "user_id": user.id},
        )

    async def disconnect(self, close_code):
        if getattr(self, "group_name", None):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )
        if getattr(self, "vendor_group_name", None):
            await self.channel_layer.group_discard(
                self.vendor_group_name, self.channel_name
            )

    async def payout_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def realtime_event(self, event):
        payload = event.get("payload") or {}
        if payload.get("model") != "VendorPayout":
            return
        if payload.get("object_id") is None:
            return

        data = payload.get("data") or {}
        if data.get("reference") != self.reference:
            return
        status = str(data.get("status") or "").lower()
        await self.send(
            text_data=json.dumps(
                {
                    "type": "payout_message",
                    "reference": data.get("reference") or self.reference,
                    "status": status,
                    "paid": bool(data.get("paid")),
                    "paid_at": data.get("paid_at"),
                    "transaction_id": data.get("transaction_id"),
                    "payout_item_id": data.get("payout_item_id"),
                    "batch_id": data.get("batch_id"),
                    "amount": data.get("amount"),
                    "currency": data.get("currency"),
                    "provider_reference": data.get("provider_reference"),
                }
            )
        )

    @database_sync_to_async
    def get_payout(self):
        from .models import VendorPayout

        return (
            VendorPayout.objects
            .filter(reference=self.reference)
            .values("vendor_id", "vendor__user_id")
            .annotate(vendor_user_id=models.F("vendor__user_id"))
            .values("vendor_id", "vendor_user_id")
            .first()
        )


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


class AdminVendorRequestsConsumer(AsyncWebsocketConsumer):
    """Real-time invalidation channel for the admin vendor-request workspace."""

    group_name = "admin_vendor_requests"

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated or not user.is_staff:
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def request_changed(self, event):
        await self.send(text_data=json.dumps({
            "type": "vendor_request.changed",
            "resource": event.get("resource"),
            "action": event.get("action", "updated"),
            "object_id": event.get("object_id"),
        }))


class AdminPayoutsConsumer(AsyncWebsocketConsumer):
    """Real-time payout invalidation channel for admin payout history."""

    group_name = "admin_payouts"

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated or not user.is_staff:
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def payout_changed(self, event):
        await self.send(text_data=json.dumps({
            "type": "payout.changed",
            "action": event.get("action", "updated"),
            "payout_id": event.get("payout_id"),
        }))


class VendorPayoutsConsumer(AsyncWebsocketConsumer):
    """Real-time payout invalidation channel for the authenticated vendor."""

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4403)
            return

        self.vendor_id = await self.get_vendor_id()
        if not self.vendor_id:
            await self.close(code=4403)
            return

        self.group_name = f"vendor_payouts_{self.vendor_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if getattr(self, "group_name", None):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )

    async def payout_changed(self, event):
        await self.send(text_data=json.dumps({
            "type": "payout.changed",
            "action": event.get("action", "updated"),
            "payout_id": event.get("payout_id"),
        }))

    from channels.db import database_sync_to_async

    @database_sync_to_async
    def get_vendor_id(self):
        from .models import Vendor
        return (
            Vendor.objects
            .filter(user=self.user)
            .values_list("id", flat=True)
            .first()
        )
