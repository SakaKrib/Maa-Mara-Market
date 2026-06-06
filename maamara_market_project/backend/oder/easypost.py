import easypost
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .views import IsAuthenticatedOrVisitor
from rest_framework.decorators import permission_classes, api_view
from .models import Order
from easypost import errors as easypost_errors



from decimal import Decimal
from django.conf import settings
from easypost import EasyPostClient
from easypost.errors import ApiError

client = EasyPostClient(settings.EASYPOST_API_KEY)


def create_shipment(order):
    """
    Create an EasyPost shipment from an order object using EasyPost v10+ client.
    Returns the created Shipment object (with rates).
    """
    # ✅ Billing address
    to_address = order.to_easypost_address()
    if not to_address:
        raise ValueError("Order has no billing address.")

    # ✅ From address (store or warehouse)
    from_address = getattr(settings, "EASYPOST_FROM_ADDRESS", None)
    if not from_address:
        raise ValueError("Missing EASYPOST_FROM_ADDRESS in settings.py")

    # ✅ Parcel
    parcel = order.to_easypost_parcel()
    if not parcel:
        raise ValueError("Order has no valid shipping dimensions.")

    try:
        shipment = client.shipment.create(
            to_address=to_address,
            from_address=from_address,
            parcel=parcel,
        )
        return shipment

    except ApiError as e:
        print("❌ EasyPost API Error:", e)
        raise







@api_view(["POST"])
@permission_classes([AllowAny])
def get_shipping_rates(request):
    try:
        order_id = request.data.get("order_id")
        if not order_id:
            return Response({"error": "Order ID is required."}, status=400)

        # ✅ Find the order
        order = Order.objects.get(id=order_id)

        # (Optional) Skip billing address validation for pre-check
        # if not order.billing_address:
        #     return Response({"error": "Order has no billing address."}, status=400)

        if not order.items.exists():
            return Response({"error": "Order has no items."}, status=400)

        from_address = getattr(settings, "EASYPOST_FROM_ADDRESS", None)
        if not from_address:
            return Response({"error": "Missing EASYPOST_FROM_ADDRESS in settings."}, status=400)

        # ✅ Create the shipment using helper
        shipment = create_shipment(order)

        # ✅ Extract available shipping rates
        rates = [
            {
                "id": rate.id,
                "carrier": rate.carrier,
                "service": rate.service,
                "rate": float(rate.rate),
                "currency": rate.currency,
                "delivery_days": rate.delivery_days,
            }
            for rate in shipment.rates
        ]

        if not rates:
            return Response({"error": "No shipping rates available."}, status=400)

        return Response({"rates": rates}, status=200)

    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=404)

    except easypost_errors.ApiError as ee:
        return Response({"error": f"EasyPost API error: {str(ee)}"}, status=400)

    except Exception as e:
        print("❌ Error getting rates:", str(e))
        return Response({"error": str(e)}, status=400)