import logging

import requests
from django.conf import settings
from requests.auth import HTTPBasicAuth

from vendorDashboard.payout.services.generatePermcert import generate_security_credential

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


def initiate_b2c_payment(phone_number: str, amount: int, remarks="Vendor payout", payout=None):
    """Initiate a configured M-Pesa B2C payout.

    When a VendorPayout is supplied, its locally generated originator
    conversation id is persisted before the provider request so a very fast
    callback can still be correlated safely.
    """
    config = settings.PAYMENT_GATEWAYS["mpesa"]["b2c"]
    token = get_mpesa_access_token()

    import uuid

    originator_conversation_id = str(uuid.uuid4())

    if payout is not None:
        payout.mpesa_originator_conversation_id = originator_conversation_id
        payout.mpesa_result_desc = "Submitted to M-Pesa"
        payout.save(update_fields=["mpesa_originator_conversation_id", "mpesa_result_desc"])

    certificate_path = config.get("certificate_path")
    initiator_password = config.get("initiator_password")
    if not initiator_password or not certificate_path:
        raise ValueError("M-Pesa B2C security credential configuration is incomplete.")

    security_credential = generate_security_credential(initiator_password, certificate_path)

    payload = {
        "InitiatorName": config["initiator_name"],
        "SecurityCredential": security_credential,
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": config["short_code"],
        "PartyB": phone_number,
        "Remarks": remarks,
        "QueueTimeOutURL": config["timeout_url"],
        "ResultURL": config["result_url"],
        "Occasion": remarks[:100],
        "OriginatorConversationID": originator_conversation_id,
    }

    response = requests.post(
        config["url"],
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    response.raise_for_status()

    data = response.json()

    if payout is not None and data.get("ConversationID"):
        payout.mpesa_conversation_id = data["ConversationID"]
        if data.get("OriginatorConversationID"):
            payout.mpesa_originator_conversation_id = data["OriginatorConversationID"]
        payout.mpesa_result_desc = data.get("ResponseDescription", "")[:255]
        payout.save(
            update_fields=[
                "mpesa_conversation_id",
                "mpesa_originator_conversation_id",
                "mpesa_result_desc",
            ]
        )

    return data
