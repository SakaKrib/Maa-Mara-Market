from django.urls import re_path
from .consumers import OrderConsumer, CustomerConsumer, PayoutConsumer, StockConsumer

# WebSocket URL patterns
websocket_urlpatterns = [
    # Connect to WebSocket for a specific order
    re_path(r'ws/orders/(?P<order_id>\w+)/$', OrderConsumer.as_asgi()),
    re_path(r"ws/customers/(?P<vendor_user_id>\w+)/$", CustomerConsumer.as_asgi()),

     # ⭐ NEW: payout websocket
    re_path(r'ws/payout/(?P<reference>\w+)/$', PayoutConsumer.as_asgi()),
    re_path(r"ws/stock/(?P<vendor_id>\d+)/$", StockConsumer.as_asgi()),
]
