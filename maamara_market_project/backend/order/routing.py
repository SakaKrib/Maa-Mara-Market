from django.urls import re_path
from .consumers import (
    OrderConsumer,
    CustomerConsumer,
    PayoutConsumer,
    StockConsumer,
    VendorOrdersConsumer,
    VendorNotificationsConsumer,
    ActivityLogsConsumer,
)
from vendorDashboard.consumers import VendorPayoutConsumer
from .currency_consumer import CurrencyConsumer

websocket_urlpatterns = [
    re_path(r"ws/orders/(?P<order_id>\\w+)/$", OrderConsumer.as_asgi()),
    re_path(r"ws/customers/(?P<vendor_user_id>\\w+)/$", CustomerConsumer.as_asgi()),
    re_path(r"ws/stock/(?P<vendor_id>\\d+)/$", StockConsumer.as_asgi()),
    re_path(r"ws/payout/(?P<reference>[\\w-]+)/$", VendorPayoutConsumer.as_asgi()),
    re_path(r"ws/payout-status/(?P<reference>[\\w-]+)/$", PayoutConsumer.as_asgi()),
    re_path(r"ws/vendor-orders/$", VendorOrdersConsumer.as_asgi()),
    re_path(r"ws/vendor-notifications/$", VendorNotificationsConsumer.as_asgi()),
    re_path(r"ws/activity-logs/$", ActivityLogsConsumer.as_asgi()),
    re_path(r"ws/currency/$", CurrencyConsumer.as_asgi()),
]
