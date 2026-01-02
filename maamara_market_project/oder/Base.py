from rest_framework.permissions import BasePermission

import requests
from django.conf import settings
from functools import lru_cache

class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)



@lru_cache(maxsize=1)  # cache the result so it doesn't fetch every call
def get_usd_to_kes_rate():
    try:
        response = requests.get(settings.EXCHANGE_RATE_API_URL, timeout=5)
        response.raise_for_status()
        data = response.json()
        rate = data.get("rates", {}).get("KES")
        if rate:
            return float(rate)
    except Exception as e:
        print(f"Error fetching exchange rate: {e}")
    return 140.0  # fallback rate
