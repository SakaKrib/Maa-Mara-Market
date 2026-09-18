import logging

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .views import IsAuthenticatedOrVisitor
from .models import Order

logger = logging.getLogger(__name__)


def _order_for_request(request, order_id):
    qs = Order.objects.filter(id=order_id).select_related("billing_address")
    if request.user and request.user.is_authenticated:
        return qs.filter(user=request.user, visitor_id__isnull=True).first()

    visitor_id = request.COOKIES.get("visitorId")
    if not visitor_id:
        return None
    return qs.filter(user__isnull=True, visitor_id=visitor_id).first()


def _dimensions(order):
    dimensions = order.get_total_shipping_dimensions()
    if not dimensions or dimensions["weight"] <= 0:
        raise ValueError("Shipping weight and dimensions are required.")

    return {
        "weight": round(float(dimensions["weight"]), 2),
        "length": max(1, round(float(dimensions["length"]), 2)),
        "width": max(1, round(float(dimensions["width"]), 2)),
        "height": max(1, round(float(dimensions["height"]), 2)),
    }


def _dhl_rates(order, destination):
    config = settings.PAYMENT_GATEWAYS.get("shipping", {}).get("dhl", {})
    if not config.get("api_url") or not config.get("api_key"):
        return []

    dims = _dimensions(order)
    payload = {
        "customerDetails": {
            "shipperDetails": {
                "postalCode": config.get("origin_postal_code", "00100"),
                "cityName": config.get("origin_city", "Nairobi"),
                "countryCode": config.get("origin_country", "KE"),
            },
            "receiverDetails": destination,
        },
        "plannedShippingDateAndTime": timezone.localtime().strftime("%Y-%m-%dT%H:%M:%S%z"),
        "unitOfMeasurement": "metric",
        "packages": [{
            "weight": dims["weight"],
            "dimensions": {
                "length": dims["length"],
                "width": dims["width"],
                "height": dims["height"],
            },
        }],
    }

    response = requests.post(
        config["api_url"],
        json=payload,
        headers={
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json",
        },
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()

    rates = []
    for product in data.get("products", []):
        prices = product.get("totalPrice") or []
        price = prices[0] if prices else {}
        if price.get("price") is not None:
            rates.append({
                "provider": "DHL",
                "service": product.get("productName") or product.get("productCode"),
                "price": price.get("price"),
                "currency": price.get("currency") or "USD",
                "delivery_time": product.get("deliveryTime"),
            })
    return rates


def _fedex_rates(order, destination):
    config = settings.PAYMENT_GATEWAYS.get("shipping", {}).get("fedex", {})
    if not all(config.get(key) for key in ("auth_url", "api_url", "client_id", "client_secret")):
        return []

    token_response = requests.post(
        config["auth_url"],
        data={
            "grant_type": "client_credentials",
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    token_response.raise_for_status()
    token = token_response.json().get("access_token")
    if not token:
        raise ValueError("FedEx OAuth response did not contain an access token.")

    dims = _dimensions(order)
    payload = {
        "accountNumber": {"value": config.get("account_number", "")},
        "requestedShipment": {
            "shipper": {"address": {
                "postalCode": config.get("origin_postal_code", "00100"),
                "city": config.get("origin_city", "Nairobi"),
                "countryCode": config.get("origin_country", "KE"),
            }},
            "recipient": {"address": destination},
            "pickupType": config.get("pickup_type", "USE_SCHEDULED_PICKUP"),
            "packagingType": config.get("packaging_type", "YOUR_PACKAGING"),
            "requestedPackageLineItems": [{
                "weight": {"units": "KG", "value": dims["weight"]},
                "dimensions": {
                    "length": dims["length"],
                    "width": dims["width"],
                    "height": dims["height"],
                    "units": "CM",
                },
            }],
        },
    }

    response = requests.post(
        config["api_url"],
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        timeout=20,
    )
    response.raise_for_status()
    data = response.json()

    rates = []
    for detail in data.get("output", {}).get("rateReplyDetails", []):
        rated = detail.get("ratedShipmentDetails") or []
        amount = None
        currency = "USD"
        if rated:
            shipment = rated[0].get("totalNetCharge")
            if shipment is not None:
                amount = shipment
                currency = rated[0].get("currency", currency)
        if amount is not None:
            rates.append({
                "provider": "FedEx",
                "service": detail.get("serviceName") or detail.get("serviceType"),
                "price": amount,
                "currency": currency,
                "delivery_time": detail.get("commit", {}).get("dateDetail"),
            })
    return rates


def get_rates_for_destination(order, destination):
    """Return live DHL/FedEx rates for an owned order and destination."""
    rates = []
    provider_errors = []
    for provider_name, provider in (("DHL", _dhl_rates), ("FedEx", _fedex_rates)):
        try:
            rates.extend(provider(order, destination))
        except requests.exceptions.RequestException:
            logger.exception("%s shipping provider request failed", provider_name)
            provider_errors.append(provider_name)
        except (ValueError, KeyError, TypeError):
            logger.exception("%s returned an invalid shipping response", provider_name)
            provider_errors.append(provider_name)
    return rates, provider_errors


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def get_shipping_rates(request):
    order_id = request.data.get("order_id")
    if not order_id:
        return Response({"error": "order_id is required"}, status=400)

    order = _order_for_request(request, order_id)
    if not order:
        return Response({"error": "Order not found"}, status=404)

    address = request.data
    if not address.get("zip") or not address.get("city") or not address.get("country"):
        return Response({"error": "city, country and ZIP / postal code are required"}, status=400)

    destination = {
        "postalCode": str(address["zip"]).strip(),
        "cityName": str(address["city"]).strip(),
        "countryCode": str(address["country"]).strip().upper(),
    }

    rates, provider_errors = get_rates_for_destination(order, destination)

    if not rates:
        return Response({
            "rates": [],
            "providers_unavailable": provider_errors,
        }, status=502 if provider_errors else 200)

    return Response({"rates": rates})
