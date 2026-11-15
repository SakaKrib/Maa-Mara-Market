"""
Return eligibility rules, shared by the return request endpoint and the
Returns page so customers see the same answer before and after they submit.

Rules:
  * the item must be completed and paid (checked by the caller);
  * the vendor must have marked the item as returnable;
  * the request must be made within RETURN_WINDOW_DAYS of delivery being
    confirmed (or reported, or, failing both, of the order date).
After the window, customers contact support, who may make an exception.
"""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

SUPPORT_URL = "/support"
NOT_RETURNABLE = "NOT_RETURNABLE"
WINDOW_EXPIRED = "RETURN_WINDOW_EXPIRED"


def return_window_days():
    return int(getattr(settings, "RETURN_WINDOW_DAYS", 14))


def return_window_start(order_item):
    """When the return clock started: delivery confirmation, else report, else order."""
    fulfillment = getattr(order_item, "fulfillment", None)
    if fulfillment is not None:
        started = fulfillment.customer_confirmed_at or fulfillment.delivery_reported_at
        if started:
            return started
    order = getattr(order_item, "order", None)
    return getattr(order, "ordered_date", None) or timezone.now()


def return_eligibility(order_item, now=None):
    """Return a dict describing whether the vendor and time rules allow a return."""
    now = now or timezone.now()
    days = return_window_days()
    deadline = return_window_start(order_item) + timedelta(days=days)
    result = {
        "returnable": bool(getattr(order_item.item, "returnable", True)),
        "window_days": days,
        "window_ends_at": deadline,
        "support_url": SUPPORT_URL,
        "eligible": True,
        "code": "",
        "message": "",
    }
    if not result["returnable"]:
        result.update(
            eligible=False,
            code=NOT_RETURNABLE,
            message=(
                "The vendor does not accept returns for this item. "
                "For further assistance, please contact us."
            ),
        )
    elif now > deadline:
        result.update(
            eligible=False,
            code=WINDOW_EXPIRED,
            message=(
                f"The {days}-day return period for this item has ended. "
                "If you have a good reason for the delay, please contact us and we will review your case."
            ),
        )
    return result
