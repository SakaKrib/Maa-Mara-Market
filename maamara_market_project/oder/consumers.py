import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.forms.models import model_to_dict
from datetime import datetime
from channels.db import database_sync_to_async

import json
from channels.generic.websocket import AsyncWebsocketConsumer

import json
from channels.generic.websocket import AsyncWebsocketConsumer


class OrderConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.room_group_name = f'order_{self.order_id}'

        print(f"Connecting to room group: {self.room_group_name}")
        try:
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            print("WebSocket accepted")
        except Exception as e:
            print(f"Error on connect: {e}")
            await self.close()

    async def disconnect(self, close_code):
        print(f"Disconnecting from room group: {self.room_group_name} with code {close_code}")
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def dispatch(self, message):
        # Log message types for debugging
        message_type = message.get("type")
        print(f"Dispatching message type: {message_type}")
        
        # Transform '.' to '_' as per Channels convention for handler method names
        handler_name = message_type.replace(".", "_")
        handler = getattr(self, handler_name, None)
        
        if handler:
            await handler(message)
        else:
            print(f"WARNING: No handler for message type: {message_type}")
            # Optional: You can raise or ignore here
            # raise ValueError(f"No handler for message type {message_type}")

    async def payment_status(self, event):
        print(f"Sending payment_status event: {event}")
        await self.send(text_data=json.dumps({
            "type": "payment_status",
            "status": event.get("status")
        }))

    async def transaction_success(self, event):
        print(f"Sending transaction.success event: {event}")
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

