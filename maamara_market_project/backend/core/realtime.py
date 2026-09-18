import logging
from typing import Any
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

# WebSocket payloads are intentionally allow-listed. Never serialize arbitrary
# model fields because orders/payments can contain credentials, provider IDs,
# addresses, or other private data.
PUBLIC_FIELDS = {
    "Item": {"id", "name", "description", "price", "image", "available", "in_stock", "views", "likes", "created_at", "updated_at", "vendor_id", "section_id"},
    "ColorVariant": {"id", "item_id", "color", "image"},
    "SizeStock": {"id", "item_id", "variant_id", "size", "quantity_in_stock"},
    "AgeVariant": {"id", "item_id", "age_group", "quantity_in_stock"},
    "Offer": {"id", "item_id", "discount_percentage", "start_date", "end_date", "is_active"},
}
PRIVATE_FIELDS = {
    "Order": {"id", "status", "ordered_date", "updated_total_price", "user_id", "visitor_id"},
    "OrderItem": {"id", "order_id", "item_id", "quantity", "status", "refunded", "is_returned", "is_exchanged"},
    "Payment": {"id", "order_id", "user_id", "amount", "status", "created_at", "updated_at"},
    "Customer": {"id", "vendor_id", "user_id", "status"},
    "Notification": {"id", "title", "message", "url", "read", "created_at", "user_id"},
    "ActivityLog": {"id", "action", "actor_type", "description", "related_url", "created_at", "user_id", "item_id"},
    "CalendarEvent": {"id", "title", "description", "start", "end", "user_id"},
    "VendorPayout": {"id", "vendor_id", "amount", "gross_sales", "adjustment_amount", "income", "profit", "paid", "paid_at", "created_at", "payout_period_start", "payout_period_end"},
    "VendorItemRequest": {"id", "vendor_id", "status", "created_at", "updated_at"},
    "PriceChangeRequest": {"id", "item_id", "requested_by_id", "status", "created_at", "updated_at"},
}

def _json_value(value: Any):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "url"):
        try:
            return value.url
        except Exception:
            return str(value)
    return value

def model_snapshot(instance):
    allowed = PUBLIC_FIELDS.get(instance.__class__.__name__) or PRIVATE_FIELDS.get(instance.__class__.__name__) or {"id"}
    data = {}
    for field in instance._meta.concrete_fields:
        if field.name not in allowed:
            continue
        if field.is_relation:
            data[field.name] = getattr(instance, f"{field.name}_id", None)
        else:
            data[field.name] = _json_value(getattr(instance, field.name, None))
    return data

def broadcast_event(event: str, *, model: str, object_id=None, action="updated",
                    user_ids=None, vendor_ids=None, visitor_ids=None, public=False, data=None):
    payload = {
        "type": "realtime.event",
        "event": event,
        "model": model,
        "object_id": object_id,
        "action": action,
        "data": data or {},
    }
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    groups = set()
    if public:
        groups.add("realtime_catalog")
    groups.update(f"realtime_user_{i}" for i in (user_ids or []) if i)
    groups.update(f"realtime_vendor_{i}" for i in (vendor_ids or []) if i)
    groups.update(f"realtime_visitor_{i}" for i in (visitor_ids or []) if i)

    for group in groups:
        try:
            async_to_sync(channel_layer.group_send)(
                group, {"type": "realtime_event", "payload": payload}
            )
        except Exception:
            logger.exception("WebSocket broadcast failed for %s", group)
