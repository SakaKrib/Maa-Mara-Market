import logging
from typing import Any
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

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
    data = {}
    for field in instance._meta.concrete_fields:
        if field.is_relation:
            data[field.name] = getattr(instance, f"{field.name}_id", None)
        else:
            data[field.name] = _json_value(getattr(instance, field.name, None))
    return data

def broadcast_event(event: str, *, model: str, object_id=None, action="updated",
                    user_ids=None, vendor_ids=None, public=False, data=None):
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
    for group in groups:
        try:
            async_to_sync(channel_layer.group_send)(
                group, {"type": "realtime_event", "payload": payload}
            )
        except Exception:
            logger.exception("WebSocket broadcast failed for %s", group)
