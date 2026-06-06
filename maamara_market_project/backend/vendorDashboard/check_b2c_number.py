import os
import sys
import django
import requests
import json
import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography import x509

# -----------------------------
# Initialize Django
# -----------------------------
sys.path.append("/home/oopondo/Desktop/clear Django")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project01.settings")
django.setup()
from django.conf import settings

# -----------------------------
# Load MPESA B2C config from settings
# -----------------------------
mpesa_config = settings.PAYMENT_GATEWAYS["mpesa"]
b2c_config = mpesa_config["b2c"]

# -----------------------------
# Functions
# -----------------------------
def get_access_token():
    """Fetch OAuth access token from Safaricom sandbox"""
    try:
        response = requests.get(
            mpesa_config["auth_url"],
            auth=(mpesa_config["consumer_key"], mpesa_config["consumer_secret"]),
            timeout=10
        )
        response.raise_for_status()
        token = response.json().get("access_token")
        print(f"✅ Access token retrieved: {token[:10]}...")
        return token
    except Exception as e:
        print(f"❌ Failed to get access token: {e}")
        return None

def generate_security_credential(password, certificate_path):
    """Encrypt initiator password using Safaricom sandbox certificate"""
    try:
        with open(certificate_path, "rb") as f:
            cert_data = f.read()
        try:
            public_key = serialization.load_pem_public_key(cert_data)
        except ValueError:
            cert = x509.load_pem_x509_certificate(cert_data)
            public_key = cert.public_key()
        encrypted = public_key.encrypt(
            password.encode(),
            padding.PKCS1v15()
        )
        return base64.b64encode(encrypted).decode()
    except Exception as e:
        print(f"❌ Failed to generate security credential: {e}")
        return None

def send_b2c_payout(phone_number, amount=1):
    """Send B2C payout using sandbox-safe settings"""
    access_token = get_access_token()
    if not access_token:
        print("❌ Cannot proceed without access token.")
        return

    security_credential = generate_security_credential(
        b2c_config["initiator_password"],
        b2c_config["certificate_path"]
    )
    if not security_credential:
        print("❌ Cannot proceed without security credential.")
        return

    payload = {
        "InitiatorName": b2c_config["initiator_name"],     # testapi
        "SecurityCredential": security_credential,
        "CommandID": "BusinessPayment",                   # Sandbox-safe command
        "Amount": amount,
        "PartyA": b2c_config["short_code"],              # Sandbox shortcode 600992
        "PartyB": phone_number,
        "Remarks": "Sandbox payout test",
        "QueueTimeOutURL": b2c_config["timeout_url"],    # Must be HTTPS
        "ResultURL": b2c_config["result_url"],           # Must be HTTPS
        "Occasion": "Test"
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(b2c_config["url"], headers=headers, json=payload, timeout=10)
        result = response.json()
        if "errorCode" in result:
            print(f"❌ Error sending to {phone_number}: {result.get('errorMessage')}")
        else:
            print(f"📤 Sent payout to {phone_number}, Response:\n{json.dumps(result, indent=2)}")
    except Exception as e:
        print(f"❌ Network error: {e}")

# -----------------------------
# Sandbox Test Numbers
# -----------------------------
if __name__ == "__main__":
    sandbox_numbers = [
        "254708374149",  # Should succeed
        "254708374150",  # Should succeed
        "254700000000",  # Should fail (2040)
    ]

    for number in sandbox_numbers:
        send_b2c_payout(number, amount=1)