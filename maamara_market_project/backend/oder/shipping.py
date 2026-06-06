import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["POST"])
def get_shipping_rates(request):
    data = request.data
    destination = {
        "postal_code": data.get("zip"),
        "city": data.get("city"),
        "country": data.get("country"),  # e.g., "US"
    }

    # Kenya warehouse origin (example: Nairobi, 00100)
    origin = {
        "postalCode": "00100",
        "cityName": "Nairobi",
        "countryCode": "KE"
    }

    # DHL payload
    payload = {
        "customerDetails": {
            "shipperDetails": origin,
            "receiverDetails": {
                "postalCode": destination["postal_code"],
                "cityName": destination["city"],
                "countryCode": destination["country"]
            }
        },
        "plannedShippingDateAndTime": "2025-09-25T10:00:00GMT+03:00",
        "unitOfMeasurement": "metric",  # DHL requires units
        "packages": [
            {
                "weight": 2.5,  # Example weight (kg)
                "dimensions": {"length": 30, "width": 20, "height": 10}  # cm
            }
        ]
    }

    headers = {
        "Authorization": "Bearer YOUR_DHL_API_KEY",
        "Content-Type": "application/json",
    }

    url = "https://api-mock.dhl.com/mydhlapi/rates"  # Sandbox/test URL
    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        rates = response.json()
        # Format simplified rates list for frontend
        shipping_options = []
        for product in rates.get("products", []):
            shipping_options.append({
                "service": product.get("productName"),
                "price": product.get("totalPrice")[0].get("price"),
                "currency": product.get("totalPrice")[0].get("currency"),
                "deliveryTime": product.get("deliveryTime"),
            })
        return Response({"rates": shipping_options})
    else:
        return Response({"error": response.text}, status=response.status_code)
