from shop.models import BlogPost, Banner, Review
from ReactSerializers.models import Item, Offer
from order.models import Order
from core.models import Notification, ActivityLog
from vendorDashboard.models import VendorRequest, Vendor

from ReactSerializers.Serializers import (
    ItemSerializer,
    VendorSerializer
)
from shop.Serializers import  BlogPostSerializer, BannerSerializer

from core.Serializer import (
    NotificationSerializer,
    ActivityLogSerializer,
)

SEARCH_REGISTRY = [
    # ================= ITEMS =================
    {
        "name": "items",
        "model": Item,
        "field": "name",
        "serializer": ItemSerializer,
        "vendor_field": "vendor",
    },

    # ================= BLOGS =================
    {
        "name": "blogs",
        "model": BlogPost,
        "field": "title",
        "serializer": BlogPostSerializer,
        "vendor_field": "vendor",
    },

    # ================= BANNERS =================
    {
        "name": "banners",
        "model": Banner,
        "field": "title",
        "serializer": BannerSerializer,
        "vendor_field": "vendor",
    },

    # ================= VENDORS =================
    {
        "name": "vendors",
        "model": Vendor,
        "field": "company_name",
        "serializer": VendorSerializer,
        "vendor_field": None,
    },

    # ================= ORDERS =================
    {
        "name": "orders",
        "model": Order,
        "field": "id",
        "serializer": None,

        # ✅ FIXED: correct reverse relation path
        "vendor_field": "order_items__item__vendor",
    },

    # ================= NOTIFICATIONS =================
    {
        "name": "notifications",
        "model": Notification,
        "field": "title",
        "serializer": NotificationSerializer,
        "vendor_field": None,
    },

    # ================= ACTIVITY LOGS =================
    {
        "name": "activity_logs",
        "model": ActivityLog,
        "field": "action",
        "serializer": ActivityLogSerializer,
        "vendor_field": None,
    },
]