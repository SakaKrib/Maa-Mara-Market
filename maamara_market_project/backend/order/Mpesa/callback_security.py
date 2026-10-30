"""Authenticity checks for Safaricom Daraja callbacks.

Daraja callbacks are plain unauthenticated POSTs, so anyone who learns a
CheckoutRequestID (the browser is given it) could forge a "payment succeeded"
message. Two independent defences are used:

* a secret token in the callback URL (``MPESA_CALLBACK_TOKEN``), and
* for customer payments, asking Safaricom itself whether the STK request
  really succeeded before the order is marked paid.
"""
import base64
import hmac
import logging

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def callback_token_ok(request):
    """True when the request carries the configured secret token.

    If no token is configured the check is skipped (and logged), so existing
    deployments keep working until the callback URLs are updated.
    """
    expected = getattr(settings, "MPESA_CALLBACK_TOKEN", "") or ""
    if not expected:
        logger.warning("MPESA_CALLBACK_TOKEN is not set: M-Pesa callbacks are not token protected.")
        return True
    supplied = request.query_params.get("token", "") if hasattr(request, "query_params") else ""
    return hmac.compare_digest(str(supplied), str(expected))


def _query_url(stk_url):
    return stk_url.replace("stkpush/v1/processrequest", "stkpushquery/v1/query")


def stk_query_confirms(checkout_request_id):
    """Ask Safaricom whether this STK request was paid. Fails closed."""
    from .mpesaView import get_mpesa_access_token

    config = settings.PAYMENT_GATEWAYS["mpesa"]["stk_push"]
    shortcode = str(config.get("shortcode") or "").strip()
    passkey = str(config.get("passkey") or "").strip()
    stk_url = str(config.get("stk_url") or "").strip()
    if not all((shortcode, passkey, stk_url, checkout_request_id)):
        return False
    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()
    try:
        response = requests.post(
            _query_url(stk_url),
            json={
                "BusinessShortCode": shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": checkout_request_id,
            },
            headers={"Authorization": f"Bearer {get_mpesa_access_token()}", "Content-Type": "application/json"},
            timeout=20,
        )
        data = response.json()
    except (requests.RequestException, ValueError):
        logger.exception("M-Pesa STK query failed for %s.", checkout_request_id)
        return False
    return str(data.get("ResultCode", "")) == "0"
