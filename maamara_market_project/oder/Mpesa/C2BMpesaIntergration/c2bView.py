import requests
from django.conf import settings

def get_mpesa_access_token():
    """
    Generate OAuth access token for Safaricom APIs
    using PAYMENT_GATEWAYS settings.
    """
    mpesa_config = settings.PAYMENT_GATEWAYS["mpesa"]

    consumer_key = mpesa_config["consumer_key"]
    consumer_secret = mpesa_config["consumer_secret"]
    auth_url = mpesa_config["auth_url"]

    response = requests.get(auth_url, auth=(consumer_key, consumer_secret))
    response.raise_for_status()
    return response.json().get("access_token")

