import requests
from django.conf import settings
from requests.auth import HTTPBasicAuth

def get_mpesa_access_token():
    """Fetch OAuth token from M-Pesa Daraja API"""
    response = requests.get(
        settings.MPESA_CONFIG["auth_url"],
        auth=HTTPBasicAuth(
            settings.MPESA_CONFIG["consumer_key"],
            settings.MPESA_CONFIG["consumer_secret"],
        ),
    )
    response.raise_for_status()
    return response.json()["access_token"]


def initiate_b2c_payment(phone_number: str, amount: int, remarks="Test Payment"):
    """Send B2C request to M-Pesa Sandbox"""
    token = get_mpesa_access_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "InitiatorName": "testapi",  # Sandbox default initiator
        "SecurityCredential": settings.MPESA_CONFIG["security_credential"],
        "CommandID": "BusinessPayment",  # Or SalaryPayment / PromotionPayment
        "Amount": amount,
        "PartyA": settings.MPESA_CONFIG["short_code"],  # Business shortcode
        "PartyB": phone_number,  # Receiver MSISDN (e.g. 2547xxxxxxx)
        "Remarks": remarks,
        "QueueTimeOutURL": settings.MPESA_CONFIG["timeout_url"],
        "ResultURL": settings.MPESA_CONFIG["result_url"],
        "Occasion": "TestTransaction",
    }

    response = requests.post(
        settings.MPESA_CONFIG["url"],
        headers=headers,
        json=payload,
    )
    response.raise_for_status()
    return response.json()
