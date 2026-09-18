import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# ==============================
# 🔹 Load PayPal Settings
# ==============================
PAYPAL = settings.PAYMENT_GATEWAYS.get("paypal", {})

if not PAYPAL:
    raise ValueError("⚠️ PayPal configuration missing in settings.PAYMENT_GATEWAYS")

PAYPAL_AUTH_URL = PAYPAL.get("auth_url", "https://api.sandbox.paypal.com/v1/oauth2/token")
PAYPAL_BASE_URL = PAYPAL.get("base_url", "https://api-m.sandbox.paypal.com")
PAYPAL_CLIENT_ID = PAYPAL.get("client_id")
PAYPAL_SECRET = PAYPAL.get("client_secret")


# ==============================
# 🔹 Get Access Token
# ==============================
def get_paypal_access_token():
    """
    Retrieve an OAuth2 access token from PayPal.
    """
    auth = (PAYPAL_CLIENT_ID, PAYPAL_SECRET)
    headers = {
        "Accept": "application/json",
        "Accept-Language": "en_US",
    }
    data = {"grant_type": "client_credentials"}

    try:
        resp = requests.post(PAYPAL_AUTH_URL, data=data, auth=auth, headers=headers, timeout=10)
        resp.raise_for_status()
        token = resp.json().get("access_token")
        if not token:
            raise ValueError("No access token in PayPal response")
        logger.info("✅ PayPal access token fetched successfully")
        return token

    except requests.exceptions.RequestException as e:
        logger.error("Failed to obtain PayPal access token.")
        logger.error("PayPal OAuth request failed.")
        raise


# ==============================
# 🔹 Create Order
# ==============================
def create_paypal_order(amount, currency="USD", *, reference_id=None):
    """
    Create a new PayPal order.
    Returns the order JSON object containing the approval link.
    """
    token = get_paypal_access_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    data = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {"currency_code": currency, "value": str(amount)},
                **({"reference_id": str(reference_id)} if reference_id else {}),
            }
        ]
    }

    url = f"{PAYPAL_BASE_URL}/v2/checkout/orders"

    try:
        resp = requests.post(url, headers=headers, json=data, timeout=10)
        resp.raise_for_status()
        order_data = resp.json()
        logger.info("PayPal order created successfully.")
        return order_data

    except requests.exceptions.RequestException as e:
        logger.error("Failed to create PayPal order.")
        logger.error("PayPal order creation request failed.")
        raise


# ==============================
# 🔹 Capture Order
# ==============================
def capture_paypal_order(order_id):
    """
    Capture an existing PayPal order (finalizes the payment).
    Returns the capture result JSON.
    """
    token = get_paypal_access_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    url = f"{PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}/capture"

    try:
        resp = requests.post(url, headers=headers, timeout=10)
        resp.raise_for_status()
        capture_data = resp.json()
        logger.info("PayPal order captured successfully.")
        return capture_data

    except requests.exceptions.RequestException as e:
        logger.error("Failed to capture PayPal order.")
        logger.error("PayPal capture request failed.")
        raise
