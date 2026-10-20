"""Order fulfilment, shipment tracking and customer-acceptance APIs.

Carrier tracking is credential-gated. When a carrier API is not configured, this
module never fabricates updates; dispatch staff can enter verified milestones
until provider credentials are available.
"""
import hashlib
import logging
import secrets
from datetime import timedelta

import requests
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt

from .models import (
    FulfillmentEvent,
    Order,
    OrderItem,
    OrderItemFulfillment,
    Shipment,
    ShipmentEvent,
)

logger = logging.getLogger(__name__)
CUSTOMER_CONFIRMATION_DAYS = 3

FULFILLMENT_RANK = {
    "PAID": 0,
    "PROCESSING": 1,
    "PACKING": 2,
    "READY_TO_SHIP": 3,
    "DISPATCH_INSPECTED": 3,
    "SHIPPED": 4,
    "IN_TRANSIT": 5,
    "OUT_FOR_DELIVERY": 6,
    "DELIVERED": 7,
    "AWAITING_CONFIRMATION": 8,
    "COMPLETED": 9,
}
ORDER_STATUS_BY_RANK = {
    0: "PAID",
    1: "PROCESSING",
    2: "PACKING",
    3: "READY_TO_SHIP",
    4: "SHIPPED",
    5: "IN_TRANSIT",
    6: "OUT_FOR_DELIVERY",
    7: "DELIVERED",
    8: "AWAITING_CONFIRMATION",
    9: "COMPLETED",
}
VENDOR_TRANSITIONS = {
    "PAID": "PROCESSING",
    "PROCESSING": "PACKING",
    "PACKING": "READY_TO_SHIP",
}
CARRIER_URLS = {
    "DHL": "https://www.dhl.com/global-en/home/tracking.html?tracking-id=",
    "FEDEX": "https://www.fedex.com/fedextrack/?trknbr=",
}
SHIPMENT_STATUS_RANK = {
    "LABEL_CREATED": 0,
    "SHIPPED": 1,
    "IN_TRANSIT": 2,
    "OUT_FOR_DELIVERY": 3,
    "DELIVERED": 4,
}


class CarrierTrackingNotConfigured(Exception):
    pass


def _iso(value):
    return value.isoformat() if value else None


def _visitor_id(request):
    return request.COOKIES.get("visitorId") or request.COOKIES.get("visitor_id")


def _customer_owns_order(request, order):
    if request.user and request.user.is_authenticated:
        return order.user_id == request.user.pk
    visitor_id = _visitor_id(request)
    return bool(visitor_id and order.user_id is None and order.visitor_id == visitor_id)


def _vendor_owns_item(user, order_item):
    vendor = getattr(user, "vendor", None)
    item = order_item.item
    return bool(
        vendor
        and (
            getattr(item, "vendor_id", None) == vendor.pk
            or getattr(item, "created_by_id", None) == user.pk
        )
    )


def _record_event(order, fulfillment=None, shipment=None, actor=None, source="SYSTEM",
                  event_type="", from_status="", to_status="", note="", metadata=None):
    return FulfillmentEvent.objects.create(
        order=order,
        fulfillment=fulfillment,
        shipment=shipment,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        source=source,
        event_type=event_type,
        from_status=from_status or "",
        to_status=to_status or "",
        note=note or "",
        metadata=metadata or {},
    )


def _ensure_fulfillment(order_item, actor=None):
    legacy_status = str(getattr(order_item.order, "status", "PAID") or "PAID").upper()
    default_status = legacy_status if legacy_status in FULFILLMENT_RANK else "PAID"
    defaults = {"status": default_status}

    # Preserve legacy financial/return holds. Never turn an existing dispute,
    # return, or refund into a fresh paid item when tracking records are seeded.
    if legacy_status in {"DISPUTED", "RETURN_REQUESTED", "RETURN_APPROVED"}:
        defaults.update({
            "status": "ISSUE_REPORTED",
            "hold_reason": f"Existing order status is {legacy_status}; staff review is required.",
        })
    elif legacy_status in {"CANCELLED", "RETURNED", "REFUNDED"}:
        defaults.update({
            "status": "CANCELLED",
            "hold_reason": f"Existing order status is {legacy_status}; do not release this item automatically.",
        })

    # For legacy orders already marked delivered, start a transparent fresh
    # confirmation window rather than auto-completing on first page view.
    if legacy_status == "DELIVERED":
        defaults["status"] = "AWAITING_CONFIRMATION"
        defaults["delivery_reported_at"] = timezone.now()
        defaults["confirmation_deadline"] = timezone.now() + timedelta(days=CUSTOMER_CONFIRMATION_DAYS)
    elif legacy_status == "AWAITING_CONFIRMATION":
        defaults["confirmation_deadline"] = timezone.now() + timedelta(days=CUSTOMER_CONFIRMATION_DAYS)
        defaults["delivery_reported_at"] = timezone.now()

    fulfillment, created = OrderItemFulfillment.objects.get_or_create(
        order_item=order_item,
        defaults=defaults,
    )
    if created:
        initial_status = fulfillment.status
        _record_event(
            order=order_item.order,
            fulfillment=fulfillment,
            actor=actor,
            source="SYSTEM",
            event_type="legacy_fulfillment_initialized" if legacy_status not in {"PAID", "PROCESSING", "PACKING", "READY_TO_SHIP"} else "payment_confirmed",
            to_status=initial_status,
            note=(
                "Tracking was initialized for an existing delivered order. Its three-day confirmation window starts now."
                if initial_status == "AWAITING_CONFIRMATION" and legacy_status not in {"PAID", "PROCESSING", "PACKING", "READY_TO_SHIP"}
                else "Fulfilment tracking was initialized from the order's current state."
            ),
            metadata={"legacy_order_status": legacy_status},
        )
    return fulfillment

def ensure_order_fulfillments(order, actor=None):
    """Idempotently create item-level tracking records for a positively paid order."""
    if not getattr(order, "payment_confirmed", False):
        return []
    return [
        _ensure_fulfillment(item, actor=actor)
        for item in order.order_items.select_related("item", "order").all()
    ]


def _sync_order_status(order):
    """Maintain legacy order status as the least-advanced item status.

    Detailed progress remains item-level. This aggregate rule avoids claiming
    that a multi-item order is complete while one item still needs attention.
    """
    if order.status in {"CANCELLED", "RETURNED", "REFUNDED"}:
        return order.status
    fulfillments = list(
        OrderItemFulfillment.objects.filter(order_item__order=order).only("status")
    )
    if not fulfillments:
        return order.status
    if any(item.status == "ISSUE_REPORTED" for item in fulfillments):
        target = "DISPUTED"
    elif all(item.status == "COMPLETED" for item in fulfillments):
        target = "COMPLETED"
    else:
        minimum_rank = min(FULFILLMENT_RANK.get(item.status, 0) for item in fulfillments)
        target = ORDER_STATUS_BY_RANK[minimum_rank]
    if order.status != target:
        order.status = target
        order.save(update_fields=["status"])
    return target


def _publish_order_update(order):
    """Publish to customer and vendor WebSocket groups; REST remains authoritative."""
    try:
        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            f"order_{order.pk}",
            {"type": "fulfillment_update", "order_id": order.pk},
        )
        vendor_ids = set(
            OrderItem.objects.filter(order=order, item__vendor__isnull=False)
            .values_list("item__vendor_id", flat=True)
            .distinct()
        )
        for vendor_id in vendor_ids:
            async_to_sync(layer.group_send)(
                f"vendor_orders_{vendor_id}",
                {"type": "orders_changed", "order_id": order.pk},
            )
    except Exception:
        logger.exception("Could not publish fulfilment update for order %s", order.pk)


def _fulfillment_payload(fulfillment, include_internal=False):
    line = fulfillment.order_item
    order = line.order
    shipments = []
    for shipment in fulfillment.shipments.prefetch_related("events").all():
        shipments.append({
            "id": shipment.pk,
            "carrier": shipment.carrier,
            "service": shipment.service,
            "tracking_number": shipment.tracking_number,
            "tracking_url": shipment.tracking_url,
            "status": shipment.status,
            "latest_event_description": shipment.latest_event_description,
            "handed_over_at": _iso(shipment.handed_over_at),
            "estimated_delivery_at": _iso(shipment.estimated_delivery_at),
            "delivered_at": _iso(shipment.delivered_at),
            "last_synced_at": _iso(shipment.last_synced_at),
            "events": [
                {
                    "status": event.status,
                    "description": event.description,
                    "source": event.source,
                    "occurred_at": _iso(event.occurred_at),
                    "received_at": _iso(event.received_at),
                }
                for event in shipment.events.all()
            ],
        })
    events = [
        {
            "event_type": event.event_type,
            "from_status": event.from_status,
            "to_status": event.to_status,
            "note": event.note,
            "source": event.source,
            "created_at": _iso(event.created_at),
        }
        for event in fulfillment.events.order_by("created_at", "id")
    ]
    item = line.item
    result = {
        "fulfillment_id": fulfillment.pk,
        "order_item_id": line.pk,
        "order_id": order.pk,
        "order_status": order.status,
        "item_name": getattr(item, "name", "Item"),
        "item_id": item.pk,
        "quantity": line.quantity,
        "status": fulfillment.status,
        "inspection_status": fulfillment.inspection_status,
        "delivery_reported_at": _iso(fulfillment.delivery_reported_at),
        "confirmation_deadline": _iso(fulfillment.confirmation_deadline),
        "customer_confirmed_at": _iso(fulfillment.customer_confirmed_at),
        "completed_at": _iso(fulfillment.completed_at),
        "payout_eligible_at": _iso(fulfillment.payout_eligible_at),
        "hold_reason": fulfillment.hold_reason,
        "shipments": shipments,
        "events": events,
    }
    if include_internal:
        result.update({
            "inspection_notes": fulfillment.dispatch_notes,
            "inspection_at": _iso(fulfillment.dispatch_inspected_at),
            "inspection_by": (
                fulfillment.dispatch_inspected_by.get_username()
                if fulfillment.dispatch_inspected_by_id else None
            ),
            "customer_name": (
                order.user.get_username() if order.user_id else
                (f"Guest {order.visitor_id[:8]}" if order.visitor_id else "Unknown")
            ),
            "created_at": _iso(order.created_at),
        })
    return result


def _return_or_financial_hold(order_item):
    if order_item.refunded or order_item.is_returned or order_item.is_exchanged:
        return "This order item is refunded, returned, or exchanged."
    try:
        from vendorDashboard.models import ReturnRequest
        active_return = ReturnRequest.objects.filter(item=order_item).exclude(
            status="rejected"
        ).exists()
        if active_return:
            return "A return or exchange request is open for this item."
    except Exception:
        logger.exception("Unable to check return holds for order item %s", order_item.pk)
        return "Return status could not be verified; manual review is required."
    return ""


def _transition_fulfillment(fulfillment, new_status, *, actor=None, source="SYSTEM",
                            event_type="status_changed", note="", metadata=None):
    old_status = fulfillment.status
    if old_status == new_status:
        return False
    fulfillment.status = new_status
    fields = ["status", "updated_at"]
    if new_status == "COMPLETED":
        completed_time = timezone.now()
        fulfillment.completed_at = completed_time
        fields.append("completed_at")
        if getattr(fulfillment.order_item.order, "payment_confirmed", False) and not _return_or_financial_hold(fulfillment.order_item):
            fulfillment.payout_eligible_at = completed_time
            fields.append("payout_eligible_at")
    fulfillment.save(update_fields=fields)
    _record_event(
        order=fulfillment.order_item.order,
        fulfillment=fulfillment,
        actor=actor,
        source=source,
        event_type=event_type,
        from_status=old_status,
        to_status=new_status,
        note=note,
        metadata=metadata,
    )
    return True


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def vendor_fulfillment_list(request):
    vendor = getattr(request.user, "vendor", None)
    if vendor is None:
        return Response({"detail": "Only registered vendors can view vendor fulfilment."}, status=403)
    vendor_items = OrderItem.objects.filter(
        Q(item__vendor=vendor) | Q(item__created_by=request.user),
        order__isnull=False,
    ).filter(
        Q(order__payment__status__iexact="PAID")
        | Q(order__payment__status__iexact="COMPLETED")
    ).select_related(
        "order", "item", "order__payment"
    )
    items = []
    for line in vendor_items.order_by("-order__ordered_date", "-id"):
        fulfillment = _ensure_fulfillment(line, actor=request.user)
        items.append(_fulfillment_payload(fulfillment, include_internal=True))
    return Response({"results": items, "count": len(items)})


@api_view(["GET"])
@permission_classes([AllowAny])
def customer_fulfillment_detail(request, order_id):
    order = Order.objects.select_related("payment", "user").filter(pk=order_id).first()
    if order is None or not _customer_owns_order(request, order):
        return Response({"detail": "Order not found."}, status=404)
    if not order.payment_confirmed:
        return Response({"detail": "Tracking is available after payment is confirmed."}, status=409)
    fulfillments = ensure_order_fulfillments(order)
    return Response({
        "order_id": order.pk,
        "order_status": order.status,
        "payment_confirmed": True,
        "items": [_fulfillment_payload(item) for item in fulfillments],
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_fulfillment_queue(request):
    # Seed durable records for legacy paid orders that predate item-level tracking.
    # Existing COMPLETED rows are marked historical-complete without fabricating
    # customer-acceptance or payout-eligibility timestamps.
    legacy_items = (
        OrderItem.objects.filter(
            Q(order__payment__status__iexact="PAID")
            | Q(order__payment__status__iexact="COMPLETED"),
            fulfillment__isnull=True,
            order__isnull=False,
        )
        .select_related("order", "order__payment", "item")
        .order_by("order_id", "id")
    )
    for line in legacy_items.iterator():
        _ensure_fulfillment(line, actor=request.user)

    qs = OrderItemFulfillment.objects.select_related(
        "order_item__order", "order_item__item", "order_item__order__user", "dispatch_inspected_by"
    ).prefetch_related("shipments__events", "events").order_by("-updated_at")
    status_filter = request.query_params.get("status")
    if status_filter:
        qs = qs.filter(status=status_filter.upper())
    return Response({
        "results": [_fulfillment_payload(item, include_internal=True) for item in qs[:500]],
        "count": qs.count(),
        "shipments": [
            {
                "id": shipment.pk,
                "order_id": shipment.order_id,
                "carrier": shipment.carrier,
                "tracking_number": shipment.tracking_number,
                "tracking_url": shipment.tracking_url,
                "status": shipment.status,
                "latest_event_description": shipment.latest_event_description,
                "created_at": _iso(shipment.created_at),
            }
            for shipment in Shipment.objects.select_related("order").order_by("-created_at")[:250]
        ],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def vendor_advance_fulfillment(request, order_item_id):
    line = OrderItem.objects.select_for_update().select_related("order", "item", "order__payment").filter(
        pk=order_item_id
    ).first()
    if line is None:
        return Response({"detail": "Order item not found."}, status=404)
    if not _vendor_owns_item(request.user, line):
        return Response({"detail": "You cannot update another vendor's order item."}, status=403)
    if not line.order.payment_confirmed:
        return Response({"detail": "Customer payment has not been verified."}, status=409)
    hold = _return_or_financial_hold(line)
    if hold:
        return Response({"detail": hold}, status=409)
    fulfillment = _ensure_fulfillment(line, actor=request.user)
    target = VENDOR_TRANSITIONS.get(fulfillment.status)
    if not target:
        return Response({
            "detail": "No further vendor preparation step is available. Dispatch must inspect the item next.",
            "status": fulfillment.status,
        }, status=409)
    _transition_fulfillment(
        fulfillment,
        target,
        actor=request.user,
        source="VENDOR",
        event_type="vendor_step_completed",
        note=str(request.data.get("note") or "").strip()[:1000],
    )
    if target == "READY_TO_SHIP":
        fulfillment.inspection_status = "PENDING"
        fulfillment.hold_reason = ""
        fulfillment.save(update_fields=["inspection_status", "hold_reason", "updated_at"])
    _sync_order_status(line.order)
    transaction.on_commit(lambda order=line.order: _publish_order_update(order))
    return Response(_fulfillment_payload(fulfillment, include_internal=True))


@api_view(["POST"])
@permission_classes([IsAdminUser])
@transaction.atomic
def dispatch_inspection(request, order_item_id):
    fulfillment = OrderItemFulfillment.objects.select_for_update().select_related(
        "order_item__order", "order_item__item"
    ).filter(order_item_id=order_item_id).first()
    if fulfillment is None:
        return Response({"detail": "Fulfilment record not found."}, status=404)
    if fulfillment.status != "READY_TO_SHIP":
        return Response({"detail": "Only items marked Ready to Ship can be inspected."}, status=409)
    passed = request.data.get("passed")
    if not isinstance(passed, bool):
        return Response({"detail": "passed must be true or false."}, status=400)
    note = str(request.data.get("notes") or "").strip()[:2000]
    fulfillment.inspection_status = "PASSED" if passed else "FAILED"
    fulfillment.dispatch_inspected_by = request.user
    fulfillment.dispatch_inspected_at = timezone.now()
    fulfillment.dispatch_notes = note
    if passed:
        old = fulfillment.status
        fulfillment.status = "DISPATCH_INSPECTED"
        fulfillment.hold_reason = ""
        fulfillment.save(update_fields=[
            "status", "inspection_status", "dispatch_inspected_by",
            "dispatch_inspected_at", "dispatch_notes", "hold_reason", "updated_at"
        ])
        _record_event(
            order=fulfillment.order_item.order,
            fulfillment=fulfillment,
            actor=request.user,
            source="STAFF",
            event_type="dispatch_inspection_passed",
            from_status=old,
            to_status="DISPATCH_INSPECTED",
            note=note,
        )
    else:
        # Return the item to the vendor packing step. That keeps the workflow
        # resumable rather than leaving READY_TO_SHIP items stuck after a fail.
        fulfillment.status = "PACKING"
        fulfillment.hold_reason = note or "Dispatch inspection failed; vendor correction is required."
        fulfillment.save(update_fields=[
            "status", "inspection_status", "dispatch_inspected_by",
            "dispatch_inspected_at", "dispatch_notes", "hold_reason", "updated_at"
        ])
        _record_event(
            order=fulfillment.order_item.order,
            fulfillment=fulfillment,
            actor=request.user,
            source="STAFF",
            event_type="dispatch_inspection_failed",
            from_status="READY_TO_SHIP",
            to_status="PACKING",
            note=fulfillment.hold_reason,
        )
    transaction.on_commit(lambda order=fulfillment.order_item.order: _publish_order_update(order))
    return Response(_fulfillment_payload(fulfillment, include_internal=True))


@api_view(["POST"])
@permission_classes([IsAdminUser])
@transaction.atomic
def create_shipment(request):
    order_id = request.data.get("order_id")
    fulfillment_ids = request.data.get("fulfillment_ids") or []
    carrier = str(request.data.get("carrier") or "").strip().upper()
    tracking_number = str(request.data.get("tracking_number") or "").strip()
    service = str(request.data.get("service") or "").strip()
    if carrier not in {"DHL", "FEDEX", "OTHER"}:
        return Response({"detail": "carrier must be DHL, FEDEX or OTHER."}, status=400)
    if not tracking_number:
        return Response({"detail": "Enter the tracking number issued by the carrier after booking the shipment."}, status=400)
    if not isinstance(fulfillment_ids, list) or not fulfillment_ids:
        return Response({"detail": "Select at least one inspected item."}, status=400)
    fulfillments = list(
        OrderItemFulfillment.objects.select_for_update().select_related("order_item__order")
        .filter(pk__in=fulfillment_ids, order_item__order_id=order_id)
    )
    if len(fulfillments) != len(set(fulfillment_ids)):
        return Response({"detail": "One or more selected items do not belong to this order."}, status=400)
    if any(item.status != "DISPATCH_INSPECTED" or item.inspection_status != "PASSED" for item in fulfillments):
        return Response({"detail": "Every selected item must pass dispatch inspection before shipment creation."}, status=409)
    order = fulfillments[0].order_item.order
    tracking_url = str(request.data.get("tracking_url") or "").strip()
    if not tracking_url:
        tracking_url = CARRIER_URLS.get(carrier, "")
        if tracking_url:
            from urllib.parse import quote
            tracking_url = tracking_url + quote(tracking_number, safe="")
    try:
        shipment = Shipment.objects.create(
            order=order,
            carrier=carrier,
            service=service,
            tracking_number=tracking_number,
            tracking_url=tracking_url,
            created_by=request.user,
            status="LABEL_CREATED",
        )
    except IntegrityError:
        logger.exception("Shipment record could not be created because the carrier tracking number is already registered")
        return Response({"detail": "A shipment with this carrier and tracking number may already exist."}, status=409)
    shipment.order_items.set(fulfillments)
    ShipmentEvent.objects.create(
        shipment=shipment,
        status="LABEL_CREATED",
        description="Shipment and carrier tracking number recorded by dispatch.",
        source="STAFF",
        occurred_at=timezone.now(),
        payload={"created_by": request.user.pk},
    )
    _record_event(
        order=order,
        shipment=shipment,
        actor=request.user,
        source="STAFF",
        event_type="shipment_recorded",
        to_status="LABEL_CREATED",
        note=f"{carrier} tracking number recorded. Carrier handover is still pending.",
    )
    transaction.on_commit(lambda: _publish_order_update(order))
    return Response({
        "shipment_id": shipment.pk,
        "carrier": shipment.carrier,
        "tracking_number": shipment.tracking_number,
        "tracking_url": shipment.tracking_url,
        "status": shipment.status,
        "detail": "Shipment recorded. Confirm carrier handover after the parcel is physically accepted by the carrier.",
    }, status=201)


@api_view(["POST"])
@permission_classes([IsAdminUser])
@transaction.atomic
def confirm_carrier_handover(request, shipment_id):
    shipment = Shipment.objects.select_for_update().select_related("order").filter(pk=shipment_id).first()
    if shipment is None:
        return Response({"detail": "Shipment not found."}, status=404)
    if shipment.status != "LABEL_CREATED":
        return Response({"detail": "This shipment is no longer waiting for carrier handover."}, status=409)
    now = timezone.now()
    shipment.status = "SHIPPED"
    shipment.handed_over_at = now
    shipment.latest_event_description = "Carrier handover confirmed by dispatch."
    shipment.save(update_fields=["status", "handed_over_at", "latest_event_description", "updated_at"])
    ShipmentEvent.objects.create(
        shipment=shipment,
        status="SHIPPED",
        description=shipment.latest_event_description,
        source="STAFF",
        occurred_at=now,
        payload={"confirmed_by": request.user.pk},
    )
    for fulfillment in shipment.order_items.select_for_update().all():
        _transition_fulfillment(
            fulfillment,
            "SHIPPED",
            actor=request.user,
            source="STAFF",
            event_type="carrier_handover_confirmed",
            note=f"Parcel handed over to {shipment.carrier}.",
            metadata={"shipment_id": shipment.pk, "tracking_number": shipment.tracking_number},
        )
    _record_event(
        order=shipment.order,
        shipment=shipment,
        actor=request.user,
        source="STAFF",
        event_type="carrier_handover_confirmed",
        from_status="LABEL_CREATED",
        to_status="SHIPPED",
        note=f"Parcel accepted by {shipment.carrier}.",
    )
    _sync_order_status(shipment.order)
    transaction.on_commit(lambda order=shipment.order: _publish_order_update(order))
    return Response({"shipment_id": shipment.pk, "status": shipment.status, "handed_over_at": _iso(shipment.handed_over_at)})


def _normalize_carrier_status(value):
    text = str(value or "").strip().upper().replace("_", " ").replace("-", " ")
    if not text:
        return None
    if any(word in text for word in ("DELIVERED", "PROOF OF DELIVERY")):
        return "DELIVERED"
    if any(word in text for word in ("OUT FOR DELIVERY", "ON VEHICLE FOR DELIVERY", "WITH COURIER")):
        return "OUT_FOR_DELIVERY"
    if any(word in text for word in ("IN TRANSIT", "TRANSIT", "DEPARTED", "ARRIVED AT", "AT LOCAL FACILITY", "IN FEDEX LOCATION", "PROCESSED AT")):
        return "IN_TRANSIT"
    if any(word in text for word in ("PICKED UP", "PICKUP", "ACCEPTED BY CARRIER", "SHIPMENT COLLECTED", "TENDERED")):
        return "SHIPPED"
    if any(word in text for word in ("EXCEPTION", "DELIVERY ATTEMPT", "CUSTOMS HOLD", "DELAY")):
        return "EXCEPTION"
    if any(word in text for word in ("RETURN TO SENDER", "RETURNED TO SENDER")):
        return "RETURNED"
    return None


@transaction.atomic
def _advance_from_carrier(shipment, carrier_status, description, *, occurred_at=None,
                          source="CARRIER_API", event_id=None, payload=None):
    carrier_status = carrier_status if carrier_status in SHIPMENT_STATUS_RANK or carrier_status in {"EXCEPTION", "RETURNED"} else _normalize_carrier_status(carrier_status)
    if not carrier_status:
        return False
    occurred_at = occurred_at or timezone.now()
    if timezone.is_naive(occurred_at):
        occurred_at = timezone.make_aware(occurred_at, timezone.get_current_timezone())
    payload = payload if isinstance(payload, dict) else {}
    if event_id:
        existing = ShipmentEvent.objects.filter(shipment=shipment, carrier_event_id=str(event_id)).exists()
        if existing:
            return False
    event = ShipmentEvent.objects.create(
        shipment=shipment,
        carrier_event_id=str(event_id) if event_id else None,
        status=carrier_status,
        description=str(description or carrier_status.replace("_", " ").title())[:500],
        source=source,
        occurred_at=occurred_at,
        payload=payload,
    )
    old_status = shipment.status
    shipment.latest_event_description = event.description
    if carrier_status == "EXCEPTION":
        shipment.status = "EXCEPTION"
    elif carrier_status == "RETURNED":
        shipment.status = "RETURNED"
    elif old_status not in {"RETURNED"} and SHIPMENT_STATUS_RANK.get(carrier_status, -1) >= SHIPMENT_STATUS_RANK.get(old_status, 0):
        shipment.status = carrier_status
    if carrier_status == "DELIVERED":
        shipment.delivered_at = occurred_at
    shipment.last_synced_at = timezone.now()
    shipment.provider_payload = payload
    shipment.save(update_fields=[
        "status", "latest_event_description", "delivered_at", "last_synced_at",
        "provider_payload", "updated_at"
    ])
    _record_event(
        order=shipment.order,
        shipment=shipment,
        actor=None,
        source=source,
        event_type="carrier_tracking_update",
        from_status=old_status,
        to_status=shipment.status,
        note=event.description,
        metadata={"carrier_event_id": event_id, "tracking_number": shipment.tracking_number},
    )

    for fulfillment in shipment.order_items.select_related("order_item__order").all():
        current = fulfillment.status
        if current in {"COMPLETED", "ISSUE_REPORTED", "CANCELLED"}:
            continue
        if carrier_status == "DELIVERED":
            if current != "AWAITING_CONFIRMATION":
                _transition_fulfillment(
                    fulfillment, "DELIVERED", source=source,
                    event_type="carrier_reported_delivery",
                    note=event.description,
                    metadata={"shipment_id": shipment.pk, "tracking_number": shipment.tracking_number},
                )
                fulfillment.delivery_reported_at = occurred_at
                fulfillment.status = "AWAITING_CONFIRMATION"
                fulfillment.confirmation_deadline = occurred_at + timedelta(days=CUSTOMER_CONFIRMATION_DAYS)
                fulfillment.save(update_fields=["status", "delivery_reported_at", "confirmation_deadline", "updated_at"])
                _record_event(
                    order=fulfillment.order_item.order,
                    fulfillment=fulfillment,
                    shipment=shipment,
                    source=source,
                    event_type="awaiting_customer_confirmation",
                    from_status="DELIVERED",
                    to_status="AWAITING_CONFIRMATION",
                    note="Customer has three days to confirm receipt or report a problem.",
                    metadata={"confirmation_deadline": _iso(fulfillment.confirmation_deadline)},
                )
        elif carrier_status in {"SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"}:
            if current in FULFILLMENT_RANK and FULFILLMENT_RANK[current] < FULFILLMENT_RANK[carrier_status]:
                _transition_fulfillment(
                    fulfillment,
                    carrier_status,
                    source=source,
                    event_type="carrier_tracking_update",
                    note=event.description,
                    metadata={"shipment_id": shipment.pk, "tracking_number": shipment.tracking_number},
                )
        _sync_order_status(fulfillment.order_item.order)
    transaction.on_commit(lambda order=shipment.order: _publish_order_update(order))
    return True


def _dhl_sync(shipment):
    config = settings.PAYMENT_GATEWAYS.get("shipping", {}).get("dhl", {})
    endpoint = config.get("tracking_api_url")
    api_key = config.get("tracking_api_key") or config.get("api_key")
    if not endpoint or not api_key:
        raise CarrierTrackingNotConfigured("DHL tracking requires DHL_TRACKING_API_URL and DHL_TRACKING_API_KEY.")
    response = requests.get(
        endpoint,
        params={"trackingNumber": shipment.tracking_number},
        headers={"DHL-API-Key": api_key},
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()
    records = data.get("shipments") or []
    if not records:
        raise ValueError("DHL returned no shipment for this tracking number.")
    record = records[0]
    events = record.get("events") or []
    if not events and record.get("status"):
        events = [{
            "timestamp": record.get("status", {}).get("timestamp"),
            "statusCode": record.get("status", {}).get("statusCode"),
            "description": record.get("status", {}).get("description"),
        }]
    changed = 0
    for event in events:
        description = event.get("description") or event.get("statusCode") or "DHL tracking update"
        stamp = parse_datetime(str(event.get("timestamp") or ""))
        external_id = hashlib.sha256(
            f"{shipment.tracking_number}|{event.get('timestamp')}|{event.get('statusCode')}|{description}".encode()
        ).hexdigest()[:40]
        carrier_status = _normalize_carrier_status(f"{event.get('statusCode', '')} {description}")
        if carrier_status and _advance_from_carrier(
            shipment, carrier_status, description, occurred_at=stamp,
            source="CARRIER_API", event_id=external_id, payload={"event": event},
        ):
            changed += 1
    shipment.refresh_from_db()
    shipment.last_synced_at = timezone.now()
    shipment.save(update_fields=["last_synced_at", "updated_at"])
    return {"carrier": "DHL", "events_applied": changed, "status": shipment.status}


def _fedex_sync(shipment):
    config = settings.PAYMENT_GATEWAYS.get("shipping", {}).get("fedex", {})
    auth_url = config.get("auth_url")
    endpoint = config.get("tracking_api_url")
    client_id = config.get("client_id")
    client_secret = config.get("client_secret")
    if not all([auth_url, endpoint, client_id, client_secret]):
        raise CarrierTrackingNotConfigured("FedEx tracking requires FEDEX_OAUTH_URL, FEDEX_TRACKING_API_URL, FEDEX_CLIENT_ID and FEDEX_CLIENT_SECRET.")
    token_response = requests.post(
        auth_url,
        data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )
    token_response.raise_for_status()
    token = token_response.json().get("access_token")
    if not token:
        raise ValueError("FedEx OAuth response did not contain an access token.")
    response = requests.post(
        endpoint,
        json={
            "trackingInfo": [{"trackingNumberInfo": {"trackingNumber": shipment.tracking_number}}],
            "includeDetailedScans": True,
        },
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()
    groups = data.get("output", {}).get("completeTrackResults") or []
    if not groups:
        raise ValueError("FedEx returned no shipment for this tracking number.")
    track_results = groups[0].get("trackResults") or []
    if not track_results:
        raise ValueError("FedEx tracking result did not contain track details.")
    record = track_results[0]
    scans = record.get("scanEvents") or []
    latest = record.get("latestStatusDetail") or {}
    if not scans and latest:
        scans = [{
            "eventDescription": latest.get("description") or latest.get("statusByLocale"),
            "eventType": latest.get("code"),
            "date": record.get("dateAndTimes", [{}])[0].get("dateTime") if record.get("dateAndTimes") else None,
        }]
    changed = 0
    for event in scans:
        description = event.get("eventDescription") or event.get("eventType") or "FedEx tracking update"
        stamp = parse_datetime(str(event.get("date") or event.get("dateTime") or ""))
        external_id = hashlib.sha256(
            f"{shipment.tracking_number}|{event.get('date') or event.get('dateTime')}|{event.get('eventType')}|{description}".encode()
        ).hexdigest()[:40]
        carrier_status = _normalize_carrier_status(f"{event.get('eventType', '')} {description}")
        if carrier_status and _advance_from_carrier(
            shipment, carrier_status, description, occurred_at=stamp,
            source="CARRIER_API", event_id=external_id, payload={"event": event},
        ):
            changed += 1
    shipment.refresh_from_db()
    shipment.last_synced_at = timezone.now()
    shipment.save(update_fields=["last_synced_at", "updated_at"])
    return {"carrier": "FEDEX", "events_applied": changed, "status": shipment.status}


def sync_shipment_tracking(shipment):
    if not shipment.tracking_number:
        raise ValueError("Shipment has no tracking number.")
    if shipment.carrier == "DHL":
        return _dhl_sync(shipment)
    if shipment.carrier == "FEDEX":
        return _fedex_sync(shipment)
    raise CarrierTrackingNotConfigured("Automated tracking is available only for configured DHL and FedEx accounts.")


@api_view(["POST"])
@permission_classes([IsAdminUser])
def refresh_shipment_tracking(request, shipment_id):
    shipment = Shipment.objects.select_related("order").filter(pk=shipment_id).first()
    if shipment is None:
        return Response({"detail": "Shipment not found."}, status=404)
    try:
        result = sync_shipment_tracking(shipment)
    except CarrierTrackingNotConfigured as exc:
        return Response({"detail": str(exc)}, status=424)
    except requests.RequestException:
        logger.exception("Carrier tracking request failed for shipment %s", shipment_id)
        return Response({"detail": "Carrier tracking provider request failed. The saved tracking record was not fabricated or advanced."}, status=502)
    except (ValueError, TypeError, KeyError):
        logger.exception("Carrier returned an unrecognized tracking response for shipment %s", shipment_id)
        return Response({"detail": "Carrier returned no usable tracking event. The shipment remains at its last confirmed state."}, status=502)
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAdminUser])
@transaction.atomic
def manual_shipment_event(request, shipment_id):
    shipment = Shipment.objects.select_for_update().select_related("order").filter(pk=shipment_id).first()
    if shipment is None:
        return Response({"detail": "Shipment not found."}, status=404)
    raw_status = request.data.get("status")
    event_status = _normalize_carrier_status(raw_status) or str(raw_status or "").strip().upper()
    allowed = {"SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "EXCEPTION", "RETURNED"}
    if event_status not in allowed:
        return Response({"detail": "Use SHIPPED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, EXCEPTION or RETURNED."}, status=400)
    description = str(request.data.get("description") or event_status.replace("_", " ").title()).strip()[:500]
    raw_time = request.data.get("occurred_at")
    occurred_at = parse_datetime(str(raw_time)) if raw_time else timezone.now()
    _advance_from_carrier(
        shipment, event_status, description, occurred_at=occurred_at,
        source="STAFF", event_id=None,
        payload={"updated_by": request.user.pk, "manual": True},
    )
    return Response({"shipment_id": shipment.pk, "status": shipment.status, "latest_event_description": shipment.latest_event_description})


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def carrier_tracking_webhook(request, carrier):
    """Normalized webhook receiver; carrier-specific signing/setup remains account-dependent."""
    configured = getattr(settings, "SHIPMENT_TRACKING_WEBHOOK_TOKEN", "")
    provided = request.headers.get("X-Tracking-Token", "")
    if not configured:
        return Response({"detail": "Shipment tracking webhook secret is not configured."}, status=503)
    if not provided or not secrets.compare_digest(configured, provided):
        return Response({"detail": "Invalid webhook credentials."}, status=401)
    carrier = str(carrier or "").strip().upper()
    if carrier not in {"DHL", "FEDEX"}:
        return Response({"detail": "Unsupported carrier."}, status=400)
    tracking_number = str(request.data.get("tracking_number") or "").strip()
    shipment = Shipment.objects.filter(carrier=carrier, tracking_number=tracking_number).first()
    if shipment is None:
        return Response({"detail": "Shipment not found."}, status=404)
    status_text = request.data.get("status")
    normalized = _normalize_carrier_status(status_text) or str(status_text or "").strip().upper()
    if normalized not in {"SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "EXCEPTION", "RETURNED"}:
        return Response({"detail": "Unsupported tracking status."}, status=400)
    raw_time = request.data.get("occurred_at")
    occurred_at = parse_datetime(str(raw_time)) if raw_time else timezone.now()
    event_id = str(request.data.get("event_id") or "").strip() or None
    _advance_from_carrier(
        shipment, normalized,
        str(request.data.get("description") or normalized.replace("_", " ").title()),
        occurred_at=occurred_at, source="CARRIER_WEBHOOK", event_id=event_id,
        payload={"webhook": True},
    )
    return Response({"accepted": True, "shipment_id": shipment.pk, "status": shipment.status})


@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def customer_accept_item(request, order_item_id):
    line = OrderItem.objects.select_for_update().select_related("order", "order__payment", "item").filter(pk=order_item_id).first()
    if line is None or not _customer_owns_order(request, line.order):
        return Response({"detail": "Order item not found."}, status=404)
    if not line.order.payment_confirmed:
        return Response({"detail": "Customer payment has not been verified."}, status=409)
    fulfillment = _ensure_fulfillment(line)
    if fulfillment.status != "AWAITING_CONFIRMATION":
        if fulfillment.status == "COMPLETED":
            return Response(_fulfillment_payload(fulfillment), status=200)
        return Response({"detail": "This item is not awaiting customer confirmation.", "status": fulfillment.status}, status=409)
    hold = _return_or_financial_hold(line)
    if hold:
        return Response({"detail": hold}, status=409)
    old = fulfillment.status
    accepted_at = timezone.now()
    fulfillment.customer_confirmed_at = accepted_at
    fulfillment.confirmation_deadline = None
    fulfillment.hold_reason = ""
    fulfillment.status = "COMPLETED"
    fulfillment.completed_at = accepted_at
    fulfillment.payout_eligible_at = accepted_at
    fulfillment.save(update_fields=[
        "customer_confirmed_at", "confirmation_deadline", "hold_reason",
        "status", "completed_at", "payout_eligible_at", "updated_at"
    ])
    _record_event(
        order=line.order,
        fulfillment=fulfillment,
        actor=request.user if request.user.is_authenticated else None,
        source="CUSTOMER",
        event_type="customer_accepted_item",
        from_status=old,
        to_status="COMPLETED",
        note="Customer confirmed receipt of the correct item in acceptable condition.",
    )
    _sync_order_status(line.order)
    transaction.on_commit(lambda order=line.order: _publish_order_update(order))
    return Response(_fulfillment_payload(fulfillment))


@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def customer_report_item_issue(request, order_item_id):
    line = OrderItem.objects.select_for_update().select_related("order", "order__payment", "item").filter(pk=order_item_id).first()
    if line is None or not _customer_owns_order(request, line.order):
        return Response({"detail": "Order item not found."}, status=404)
    if not line.order.payment_confirmed:
        return Response({"detail": "Customer payment has not been verified."}, status=409)
    fulfillment = _ensure_fulfillment(line)
    if fulfillment.status != "AWAITING_CONFIRMATION":
        return Response({"detail": "Only an item awaiting confirmation can be reported here.", "status": fulfillment.status}, status=409)
    note = str(request.data.get("reason") or "").strip()[:2000]
    if not note:
        return Response({"detail": "Please describe the problem with the item."}, status=400)
    old = fulfillment.status
    fulfillment.status = "ISSUE_REPORTED"
    fulfillment.hold_reason = note
    fulfillment.confirmation_deadline = None
    fulfillment.save(update_fields=["status", "hold_reason", "confirmation_deadline", "updated_at"])
    _record_event(
        order=line.order,
        fulfillment=fulfillment,
        actor=request.user if request.user.is_authenticated else None,
        source="CUSTOMER",
        event_type="customer_reported_item_issue",
        from_status=old,
        to_status="ISSUE_REPORTED",
        note=note,
    )
    _sync_order_status(line.order)
    transaction.on_commit(lambda order=line.order: _publish_order_update(order))
    return Response(_fulfillment_payload(fulfillment))


@api_view(["POST"])
@permission_classes([IsAdminUser])
@transaction.atomic
def resolve_fulfillment_issue(request, order_item_id):
    fulfillment = OrderItemFulfillment.objects.select_for_update().select_related("order_item__order").filter(
        order_item_id=order_item_id
    ).first()
    if fulfillment is None:
        return Response({"detail": "Fulfilment record not found."}, status=404)
    if fulfillment.status != "ISSUE_REPORTED":
        return Response({"detail": "This item has no unresolved customer-reported issue."}, status=409)
    resolution = str(request.data.get("resolution") or "").strip().lower()
    note = str(request.data.get("notes") or "").strip()[:2000]
    if resolution not in {"resume_confirmation", "complete_after_review"} or not note:
        return Response({"detail": "Provide resolution resume_confirmation or complete_after_review and an audit note."}, status=400)
    if resolution == "complete_after_review":
        if not fulfillment.order_item.order.payment_confirmed:
            return Response({"detail": "Customer payment is not verified; the item cannot become payout-eligible."}, status=409)
        hold = _return_or_financial_hold(fulfillment.order_item)
        if hold:
            return Response({"detail": hold}, status=409)
    old = fulfillment.status
    if resolution == "resume_confirmation":
        fulfillment.status = "AWAITING_CONFIRMATION"
        fulfillment.confirmation_deadline = timezone.now() + timedelta(days=CUSTOMER_CONFIRMATION_DAYS)
        fulfillment.hold_reason = ""
        fulfillment.save(update_fields=["status", "confirmation_deadline", "hold_reason", "updated_at"])
        target = "AWAITING_CONFIRMATION"
    else:
        completed_time = timezone.now()
        fulfillment.status = "COMPLETED"
        fulfillment.completed_at = completed_time
        fulfillment.payout_eligible_at = completed_time
        fulfillment.customer_confirmed_at = None
        fulfillment.confirmation_deadline = None
        fulfillment.hold_reason = ""
        fulfillment.save(update_fields=[
            "status", "completed_at", "payout_eligible_at", "customer_confirmed_at",
            "confirmation_deadline", "hold_reason", "updated_at"
        ])
        target = "COMPLETED"
    _record_event(
        order=fulfillment.order_item.order,
        fulfillment=fulfillment,
        actor=request.user,
        source="STAFF",
        event_type="admin_resolved_item_issue",
        from_status=old,
        to_status=target,
        note=note,
        metadata={"resolution": resolution},
    )
    _sync_order_status(fulfillment.order_item.order)
    transaction.on_commit(lambda order=fulfillment.order_item.order: _publish_order_update(order))
    return Response(_fulfillment_payload(fulfillment, include_internal=True))


def auto_complete_unconfirmed_items():
    """Auto-complete eligible items after 72 hours; never clear return/issue holds."""
    now = timezone.now()
    ids = list(
        OrderItemFulfillment.objects.filter(
            status="AWAITING_CONFIRMATION",
            confirmation_deadline__isnull=False,
            confirmation_deadline__lte=now,
            customer_confirmed_at__isnull=True,
        ).values_list("pk", flat=True)
    )
    completed = 0
    held = 0
    for fulfillment_id in ids:
        with transaction.atomic():
            fulfillment = OrderItemFulfillment.objects.select_for_update().select_related(
                "order_item__order", "order_item__item"
            ).filter(pk=fulfillment_id).first()
            if (
                fulfillment is None
                or fulfillment.status != "AWAITING_CONFIRMATION"
                or not fulfillment.confirmation_deadline
                or fulfillment.confirmation_deadline > now
            ):
                continue
            order_item = fulfillment.order_item
            hold = _return_or_financial_hold(order_item)
            if hold:
                fulfillment.status = "ISSUE_REPORTED"
                fulfillment.hold_reason = hold
                fulfillment.confirmation_deadline = None
                fulfillment.save(update_fields=["status", "hold_reason", "confirmation_deadline", "updated_at"])
                _record_event(
                    order=order_item.order,
                    fulfillment=fulfillment,
                    source="SYSTEM",
                    event_type="auto_completion_blocked",
                    from_status="AWAITING_CONFIRMATION",
                    to_status="ISSUE_REPORTED",
                    note=hold,
                )
                _sync_order_status(order_item.order)
                transaction.on_commit(lambda order=order_item.order: _publish_order_update(order))
                held += 1
                continue
            fulfillment.status = "COMPLETED"
            original_deadline = fulfillment.confirmation_deadline
            if not order_item.order.payment_confirmed:
                held_reason = "Customer payment could not be verified at auto-completion time."
                fulfillment.status = "ISSUE_REPORTED"
                fulfillment.hold_reason = held_reason
                fulfillment.confirmation_deadline = None
                fulfillment.save(update_fields=["status", "hold_reason", "confirmation_deadline", "updated_at"])
                _record_event(
                    order=order_item.order, fulfillment=fulfillment, source="SYSTEM",
                    event_type="auto_completion_blocked", from_status="AWAITING_CONFIRMATION",
                    to_status="ISSUE_REPORTED", note=held_reason,
                )
                _sync_order_status(order_item.order)
                transaction.on_commit(lambda order=order_item.order: _publish_order_update(order))
                held += 1
                continue
            fulfillment.status = "COMPLETED"
            fulfillment.completed_at = now
            fulfillment.payout_eligible_at = now
            fulfillment.confirmation_deadline = None
            fulfillment.save(update_fields=["status", "completed_at", "payout_eligible_at", "confirmation_deadline", "updated_at"])
            _record_event(
                order=order_item.order,
                fulfillment=fulfillment,
                source="SYSTEM",
                event_type="auto_completed_after_72_hours",
                from_status="AWAITING_CONFIRMATION",
                to_status="COMPLETED",
                note="The customer did not confirm or report a problem within the 72-hour delivery-confirmation window.",
                metadata={"deadline": _iso(original_deadline)},
            )
            _sync_order_status(order_item.order)
            transaction.on_commit(lambda order=order_item.order: _publish_order_update(order))
            completed += 1
    return {"completed": completed, "held_for_review": held}


def sync_pending_shipments():
    """Poll configured carrier tracking APIs; unconfigured carriers are skipped."""
    now = timezone.now()
    cutoff = now - timedelta(minutes=25)
    qs = Shipment.objects.filter(
        status__in=["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "EXCEPTION"]
    ).filter(
        Q(last_synced_at__isnull=True) | Q(last_synced_at__lt=cutoff)
    ).exclude(tracking_number="")
    results = {"checked": 0, "updated": 0, "skipped_unconfigured": 0, "errors": 0}
    for shipment in qs.iterator():
        results["checked"] += 1
        try:
            outcome = sync_shipment_tracking(shipment)
            results["updated"] += outcome.get("events_applied", 0)
        except CarrierTrackingNotConfigured:
            results["skipped_unconfigured"] += 1
        except Exception:
            results["errors"] += 1
            logger.exception("Shipment tracking refresh failed for shipment %s", shipment.pk)
    return results
