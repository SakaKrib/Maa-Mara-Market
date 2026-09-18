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
        self.vendor_user_id = self.scope['url_route']['kwargs']['vendor_user_id']
        self.group_name = f"customers_{self.vendor_user_id}"

        # Join group
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        await self.accept()
        await self.send_customers()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

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
        self.group_name = f"payout_{self.reference}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

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
        vendor_id = self.scope["url_route"]["kwargs"]["vendor_id"]
        self.group_name = f"stock_{vendor_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def stock_update(self, event):
        await self.send(text_data="updated")



def safe_json(data):
    if isinstance(data, Decimal):
        return float(data)
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
        
        print("WS USER:", self.user)
        print("WS AUTH:", getattr(self.user, "is_authenticated", None))

        self.vendor = await self.get_vendor(self.user)

        if not self.vendor:
            await self.close()
            return

        self.group_name = f"vendor_orders_{self.vendor.id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        try:
            await self.send_orders()
        except Exception as e:
            print("Initial send_orders error:", e)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_orders(self):
        data = await self.get_orders()

    


        await self.send_json({
            "type": "orders_update",
            "pending": data["pending"],
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

        return {
            "pending": OrderSerializer(
                orders.filter(status="pending"),
                many=True,
                context={"vendor": self.vendor},
            ).data,
            "completed": OrderSerializer(
                orders.filter(status="completed"),
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
        except Exception as e:
            print("❌ Vendor lookup error:", e)
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

        except Exception as e:
            print("❌ Notification fetch error:", e)
            return []
        
#Activity cosumer funtion class

class ActivityLogsConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.group_name = "activity_logs"
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
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
        await self.send(text_data=json.dumps({
            "type": "activity_logs_update",
            "logs": event["logs"]
        }, cls=SafeJSONEncoder))

    @database_sync_to_async
    def get_logs(self):
        logs = ActivityLog.objects.all().order_by("-timestamp")[:100]
        return ActivityLogSerializer(logs, many=True).data

# Admin activity

