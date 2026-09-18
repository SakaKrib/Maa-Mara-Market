import logging

import requests
from django.conf import settings
from requests.auth import HTTPBasicAuth

logger = logging.getLogger(__name__)


def get_mpesa_access_token():
    """Fetch an OAuth token from the configured M-Pesa Daraja endpoint."""
    config = settings.PAYMENT_GATEWAYS["mpesa"]
    response = requests.get(
        config["auth_url"],
        auth=HTTPBasicAuth(config["consumer_key"], config["consumer_secret"]),
        timeout=10,
    )
    response.raise_for_status()

    token = response.json().get("access_token")
    if not token:
        raise ValueError("M-Pesa OAuth response did not contain an access token.")
    return token


def initiate_b2c_payment(phone_number: str, amount: int, remarks="Vendor payout"):
    """Initiate a configured M-Pesa B2C payout."""
    config = settings.PAYMENT_GATEWAYS["mpesa"]["b2c"]
    token = get_mpesa_access_token()

    payload = {
        "InitiatorName": config["initiator_name"],
        "SecurityCredential": config["initiator_password"],
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": config["short_code"],
        "PartyB": phone_number,
        "Remarks": remarks,
        "QueueTimeOutURL": config["timeout_url"],
        "ResultURL": config["result_url"],
        "Occasion": remarks[:100],
    }

    response = requests.post(
        config["url"],
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()
