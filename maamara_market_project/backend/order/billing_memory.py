"""
Remembered billing details for returning customers.

The last billing address from a *paid* order is offered back at checkout so the
customer can review it and choose to reuse it or type a new one. A signed-in
user is matched by account; a guest by the visitor id that is bound to their
signed visitor token (see IsAuthenticatedOrVisitor). Only the fields the
checkout form needs are returned, never other people's data.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.permissions import IsAuthenticatedOrVisitor

from .models import Order

PAID_PAYMENT_STATUSES = ("PAID", "COMPLETED", "PARTIALLY_REFUNDED")


def _country_code(value):
    return str(value.code if hasattr(value, "code") else value or "")


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def previous_billing_address(request):
    orders = Order.objects.filter(
        billing_address__isnull=False,
        payment__status__in=PAID_PAYMENT_STATUSES,
    )
    if request.user and request.user.is_authenticated:
        orders = orders.filter(user=request.user)
    else:
        visitor_id = request.COOKIES.get("visitorId")
        if not visitor_id:
            return Response({"billing_address": None})
        orders = orders.filter(user__isnull=True, visitor_id=visitor_id)

    order = orders.select_related("billing_address").order_by("-ordered_date", "-id").first()
    if order is None:
        return Response({"billing_address": None}, status=status.HTTP_200_OK)
    address = order.billing_address
    return Response({
        "billing_address": {
            "first_name": address.first_name,
            "last_name": address.last_name,
            "email": address.email,
            "phone": address.phone,
            "street_address": address.street_address,
            "appartment_address": address.appartment_address or "",
            "city": address.city,
            "state": address.state or "",
            "zip": address.zip,
            "country": _country_code(address.country),
        }
    })
