import json

import requests
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from asgiref.sync import sync_to_async


SUPPORTED_CURRENCIES = ("USD", "EUR", "GBP")
# Approximate emergency rates used only when the live exchange-rate API fails.
# Values represent KES per unit of the foreign currency.
FALLBACK_KES_PER_CURRENCY = {
    "USD": 140.0,
    "EUR": 155.0,
    "GBP": 180.0,
}


def fallback_currency_rates():
    """Return approximate KES-to-target rates for offline storefront display."""
    return {
        "KES": 1.0,
        **{
            currency: 1.0 / kes_per_currency
            for currency, kes_per_currency in FALLBACK_KES_PER_CURRENCY.items()
        },
    }


def fetch_currency_rates():
    """Return KES-to-target conversion rates for the storefront."""
    try:
        response = requests.get(settings.EXCHANGE_RATE_API_URL, timeout=5)
        response.raise_for_status()
        rates = response.json().get("rates", {}) or {}
        usd_to_kes = float(rates.get("KES"))
        if usd_to_kes <= 0:
            raise ValueError("Invalid USD/KES rate")

        fallback_rates = fallback_currency_rates()
        result = {"KES": 1.0}
        for currency in SUPPORTED_CURRENCIES:
            usd_to_currency = rates.get(currency)
            if usd_to_currency is not None:
                try:
                    rate = float(usd_to_currency) / usd_to_kes
                    if rate > 0:
                        result[currency] = rate
                        continue
                except (TypeError, ValueError):
                    pass
            result[currency] = fallback_rates[currency]

        # USD is derived from USD/KES to keep KES as the store's source currency.
        result["USD"] = 1.0 / usd_to_kes
        return result
    except Exception:
        return fallback_currency_rates()


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
