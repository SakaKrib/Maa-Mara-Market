import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.forms.models import model_to_dict
from datetime import datetime, date
from channels.db import database_sync_to_async
from order.Serializers import OrderSerializer
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from order.models import Order
from decimal import Decimal
from core.models import Notification, ActivityLog
import logging
from vendorDashboard.models import Vendor
from core.Serializer import ActivityLogSerializer

import json
from channels.generic.websocket import AsyncWebsocketConsumer

import json
from channels.generic.websocket import AsyncWebsocketConsumer



#decimal helper

class SafeJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


class OrderConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.order_id = self.scope["url_route"]["kwargs"]["order_id"]
        self.room_group_name = f"order_{self.order_id}"

        if not await self.can_access_order():
            await self.close(code=4003)
            return

        try:
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
        except Exception:
            await self.close(code=1011)

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    @database_sync_to_async
    def can_access_order(self):
        order = Order.objects.filter(id=self.order_id).first()
        if not order:
            return False
        user = self.scope.get("user")
        if user and user.is_authenticated:
            return bool(user.is_staff or order.user_id == user.id)
        visitor_id = self.scope.get("visitor_id")
        return bool(visitor_id and order.visitor_id == visitor_id)

    async def payment_status(self, event):
        await self.send(text_data=json.dumps({
            "type": "payment_status",
            "status": event.get("status")
        }))

    async def transaction_success(self, event):
        await self.send(text_data=json.dumps({
            "type": "transaction.success",
            "message": event.get("message", {})
        }))


# send customer to the frontend page
# consumers.py


class CustomerConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.vendor_user_id = self.scope["url_route"]["kwargs"]["vendor_user_id"]
        if not await self.can_access_vendor():
            await self.close(code=4003)
            return
        self.group_name = f"customers_{self.vendor_user_id}"

        # Join group
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        await self.accept()
        await self.send_customers()

    async def disconnect(self, close_code):
        # connect() can reject before group_name is created.
        if getattr(self, "group_name", None):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )

    @database_sync_to_async
    def can_access_vendor(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            return False
        return bool(
            user.is_staff
            or Vendor.objects.filter(user=user, user_id=self.vendor_user_id).exists()
        )

    @database_sync_to_async
    def get_customers(self, vendor_user_id):
        from .models import Customer
        from django.contrib.auth import get_user_model

        User = get_user_model()
        vendor_user = User.objects.get(id=vendor_user_id)

        customers_qs = Customer.objects.filter(
            vendor=vendor_user  # <- MUCH better & correct
        ).distinct()

        customers = []
        for c in customers_qs:
            data = model_to_dict(c)
            for key, value in data.items():
                if isinstance(value, datetime):
                    data[key] = value.isoformat()
            customers.append(data)

        return customers

    async def send_customers(self):
        customers = await self.get_customers(self.vendor_user_id)
        await self.send(text_data=json.dumps({
            "type": "customer_list",
            "customers": customers
        }))

    ### 🔥 REAL-TIME HANDLER
    async def customer_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "customer_update",
            "customer": event["customer"]
        }))

#  confirm paypal payment
class PayoutConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.reference = self.scope["url_route"]["kwargs"]["reference"]
        if not await self.can_access_payout():
            await self.close(code=4003)
            return
        self.group_name = f"payout_{self.reference}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    @database_sync_to_async
    def can_access_payout(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        from vendorDashboard.models import VendorPayout
        return VendorPayout.objects.filter(reference=self.reference, vendor__user=user).exists()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def payout_update(self, event):
        await self.send(text_data=json.dumps({
            "event": event["event"],
            "reference": event["reference"],
            "status": event["status"],
            "success": event["success"],
            "amount": event["amount"],
            "currency": event["currency"],
            "transaction_id": event["transaction_id"],
        }))



#  stock inventory
class StockConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.vendor_id = self.scope["url_route"]["kwargs"]["vendor_id"]

        if not await self.can_access_stock():
            await self.close(code=4003)
            return

        self.group_name = f"stock_{self.vendor_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if getattr(self, "group_name", None):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )

    @database_sync_to_async
    def can_access_stock(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        return Vendor.objects.filter(id=self.vendor_id, user=user).exists()

    async def stock_update(self, event):
        await self.send(text_data="updated")



def safe_json(data):
    if isinstance(data, Decimal):
        return str(data)
    if isinstance(data, list):
        return [safe_json(i) for i in data]
    if isinstance(data, dict):
        return {k: safe_json(v) for k, v in data.items()}
    return data        


#combined order consumer
class VendorOrdersConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        logger.debug("VendorOrders WebSocket authenticated", extra={"user_id": self.user.id})

        self.vendor = await self.get_vendor(self.user)

        if not self.vendor:
            await self.close()
            return

        self.group_name = f"vendor_orders_{self.vendor.id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        try:
            await self.send_orders()
        except Exception:
            logger.exception("Initial vendor order WebSocket payload failed")

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_orders(self):
        data = await self.get_orders()

    


        await self.send_json({
            "type": "orders_update",
            "pending": data["pending"],
            "in_process": data["in_process"],
            "completed": data["completed"],
        })

    @database_sync_to_async
    def get_vendor(self, user):
        try:
            return user.vendor
        except Exception:
            return None

    @database_sync_to_async
    def get_orders(self):
        orders = (
            Order.objects
            .filter(order_items__item__vendor=self.vendor)
            .prefetch_related("order_items__item")
            .distinct()
            .order_by("-id")
        )

        # Keep unpaid/pending orders separate from paid fulfillment orders.
        # The order status itself remains the source of truth for progress.
        in_process_statuses = [
            "PAID",
            "PROCESSING",
            "PACKING",
            "READY_TO_SHIP",
            "SHIPPED",
            "IN_TRANSIT",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "AWAITING_CONFIRMATION",
        ]

        return {
            "pending": OrderSerializer(
                orders.filter(status__in=["PENDING_PAYMENT", "pending"]),
                many=True,
                context={"vendor": self.vendor},
            ).data,
            "in_process": OrderSerializer(
                orders.filter(status__in=in_process_statuses),
                many=True,
                context={"vendor": self.vendor},
            ).data,
            "completed": OrderSerializer(
                orders.filter(status__in=["COMPLETED", "completed"]),
                many=True,
                context={"vendor": self.vendor},
            ).data,
        }

    async def orders_changed(self, event):
        await self.send_orders()

logger = logging.getLogger(__name__)
#Vendor Notifications  
class VendorNotificationsConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope["user"]

        # -------------------------
        # 1. AUTH CHECK
        # -------------------------
        if not self.user.is_authenticated:

            await self.close()
            return

        # -------------------------
        # 2. GET VENDOR SAFELY
        # -------------------------
        self.vendor = await self.get_vendor(self.user)

        if not self.vendor:

            await self.close()
            return

        # -------------------------
        # 3. GROUP SETUP
        # -------------------------
        self.group_name = f"vendor_notifications_{self.vendor.id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        # -------------------------
        # 4. ACCEPT CONNECTION
        # -------------------------
        await self.accept()



        # -------------------------
        # 5. SEND INITIAL DATA
        # -------------------------
        notifications = await self.get_notifications()

        await self.send(text_data=json.dumps({
            "type": "notifications_update",
            "notifications": notifications
        }))

    # ======================================================
    # DISCONNECT
    # ======================================================
    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )



    # ======================================================
    # RECEIVE GROUP MESSAGE
    # ======================================================
    async def notifications_update(self, event):


        await self.send(text_data=json.dumps({
            "type": "notifications_update",
            "notifications": event.get("notifications", [])
        }))

    # ======================================================
    # DB HELPERS
    # ======================================================

    @database_sync_to_async
    def get_vendor(self, user):
        try:
            return Vendor.objects.filter(user=user).first()
        except Exception:
            logger.exception("Vendor lookup failed in WebSocket consumer")
            return None

    @database_sync_to_async
    def get_notifications(self):
        try:
            qs = (
                Notification.objects
                .filter(user=self.user)
                .order_by("-created_at")
            )

            notifications = []

            for n in qs:
                notifications.append({
                    "id": n.id,
                    "title": n.title,
                    "message": n.message,
                    "url": n.url,
                    "seen": n.seen,
                    # FIX: datetime → string
                    "created_at": n.created_at.isoformat() if n.created_at else None,
                })

            return notifications

        except Exception:
            logger.exception("Notification fetch failed in WebSocket consumer")
            return []
        
#Activity cosumer funtion class

class ActivityLogsConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.group_name = "activity_logs"
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        logs = await self.get_logs()

        await self.send(text_data=json.dumps({
            "type": "activity_logs_update",
            "logs": logs
        }, cls=SafeJSONEncoder))

    async def disconnect(self, close_code):
        if getattr(self, "group_name", None):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def activity_logs_update(self, event):
        logs = event.get("logs", [])
        if not self.user.is_staff:
            logs = [
                log for log in logs
                if (log.get("user") == self.user.id)
                or (
                    isinstance(log.get("user"), dict)
                    and log["user"].get("id") == self.user.id
                )
            ]

        await self.send(text_data=json.dumps({
            "type": "activity_logs_update",
            "logs": logs
        }, cls=SafeJSONEncoder))

    @database_sync_to_async
    def get_logs(self):
        if self.user.is_staff:
            logs = ActivityLog.objects.all().order_by("-timestamp")[:100]
        else:
            logs = ActivityLog.objects.filter(user=self.user).order_by("-timestamp")[:100]
        return ActivityLogSerializer(logs, many=True).data

# Admin activity



class AdminAccountsConsumer(AsyncWebsocketConsumer):
    """Real-time ledger/account invalidation channel for admin users."""

    group_name = "admin_accounts"

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated or not user.is_staff:
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def account_changed(self, event):
        await self.send(text_data=json.dumps({
            "type": "account.changed",
            "resource": event.get("resource", "transaction"),
            "action": event.get("action", "updated"),
            "object_id": event.get("object_id"),
        }))
