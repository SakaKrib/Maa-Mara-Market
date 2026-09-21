from django.urls import re_path
from .consumers import RealtimeConsumer
from .messaging_consumer import MessagingConsumer

websocket_urlpatterns = [
    re_path(r"ws/realtime/$", RealtimeConsumer.as_asgi()),
    re_path(r"ws/messaging/$", MessagingConsumer.as_asgi()),
]
