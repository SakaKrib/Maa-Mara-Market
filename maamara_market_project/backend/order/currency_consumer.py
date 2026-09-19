import json

import requests
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from asgiref.sync import sync_to_async


SUPPORTED_CURRENCIES = ("USD", "EUR", "GBP")
FALLBACK_USD_TO_KES = 140.0


def fetch_currency_rates():
    """Return KES-to-target conversion rates for the storefront."""
    try:
        response = requests.get(settings.EXCHANGE_RATE_API_URL, timeout=5)
        response.raise_for_status()
        rates = response.json().get("rates", {}) or {}
        usd_to_kes = float(rates.get("KES"))
        if usd_to_kes <= 0:
            raise ValueError("Invalid USD/KES rate")

        result = {}
        for currency in SUPPORTED_CURRENCIES:
            usd_to_currency = rates.get(currency)
            if usd_to_currency is not None:
                result[currency] = float(usd_to_currency) / usd_to_kes

        # KES is the store's source currency. USD is derived from USD/KES.
        result["USD"] = 1.0 / usd_to_kes
        result["KES"] = 1.0
        return result
    except Exception:
        return {
            "KES": 1.0,
            "USD": 1.0 / FALLBACK_USD_TO_KES,
        }


class CurrencyConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        rates = await sync_to_async(fetch_currency_rates, thread_sensitive=False)()
        await self.send(text_data=json.dumps({
            "type": "currency_rates",
            "base": "KES",
            "rates": rates,
        }))

    async def receive(self, text_data=None, bytes_data=None):
        # Allow clients to request a fresh server-side rate snapshot without
        # introducing a REST currency endpoint.
        if text_data:
            try:
                message = json.loads(text_data)
            except json.JSONDecodeError:
                message = {}
            if message.get("type") == "refresh":
                rates = await sync_to_async(fetch_currency_rates, thread_sensitive=False)()
                await self.send(text_data=json.dumps({
                    "type": "currency_rates",
                    "base": "KES",
                    "rates": rates,
                }))
