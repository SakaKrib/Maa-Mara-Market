import requests

# ----------------------------
# Configuration
# ----------------------------
API_URL = "http://127.0.0.1:8000/api/mpesa/stk-push/"  # Your Django endpoint
PHONE_NUMBER = "254704241987"  # Your test phone number
AMOUNT = 10                     # Test amount
ORDER_ID = "Test123"            # Sample order ID

# ----------------------------
# Make the request
# ----------------------------
payload = {
    "phone": PHONE_NUMBER,
    "amount": AMOUNT,
    "order_id": ORDER_ID
}

try:
    response = requests.post(API_URL, json=payload)
    response.raise_for_status()
    data = response.json()
    print("✅ STK Push Response:")
    print(data)
except requests.exceptions.HTTPError as http_err:
    print(f"❌ HTTP error occurred: {http_err}")
    print(response.text)
except Exception as err:
    print(f"❌ Other error occurred: {err}")
