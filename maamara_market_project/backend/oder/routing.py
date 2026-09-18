from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/orders/(?P<order_id>\w+)/$', consumers.OrderConsumer.as_asgi()),
    re_path(r"ws/customers/(?P<vendor_user_id>\w+)/$", consumers.CustomerConsumer.as_asgi()),

     # ⭐ NEW: payout websocket
    re_path(r'ws/payout/(?P<reference>\w+)/$', consumers.PayoutConsumer.as_asgi()),
]
