import requests
from django.conf import settings
from vendorDashboard.models import VendorPayout
from django.utils import timezone
from requests.auth import HTTPBasicAuth
import base64
from decimal import Decimal, InvalidOperation
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
import uuid
from cryptography import x509
from decimal import Decimal
from django.db import transaction as db_transaction
import requests
import time
from django.utils.timezone import datetime
import random
from vendorDashboard.payout.services.generatePermcert import generate_security_credential
# from order.Mpesa.C2BMpesaIntergration.c2butils import get_mpesa_token

# def get_mpesa_access_token(mpesa_config):
    
#     response = requests.get(
#         mpesa_config['auth_url'], 
#         auth=HTTPBasicAuth(mpesa_config['consumer_key'], mpesa_config['consumer_secret'])
#     )
#     response.raise_for_status()
#     print(response)
#     return response.json().get('access_token')

import logging

logger = logging.getLogger(__name__)

# ============================================================
# 1️⃣  GET M-PESA ACCESS TOKEN
# ============================================================
def get_mpesa_token():
    """
    Fetch OAuth access token from Safaricom Daraja API.
    Safe, production-ready version with proper error handling.
    """
    try:
        cfg = settings.PAYMENT_GATEWAYS.get("mpesa", {})
        consumer_key = cfg.get("consumer_key")
        consumer_secret = cfg.get("consumer_secret")
        auth_url = cfg.get("auth_url")

        # Validate required fields
        if not consumer_key or not consumer_secret or not auth_url:
            raise ValueError("Missing M-Pesa OAuth credentials or auth_url.")

        # Call Safaricom OAuth API
        response = requests.get(
            auth_url,
            auth=HTTPBasicAuth(consumer_key, consumer_secret),
            timeout=10  # 🚀 avoids hanging requests
        )

        # Raise if HTTP status is NOT 200
        response.raise_for_status()

        # Safely decode JSON
        try:
            data = response.json()
        except Exception:
            logger.error(f"❌ OAuth response not JSON: {response.text}")
            raise ValueError("Failed to parse M-Pesa OAuth response as JSON.")

        logger.info(f"🔐 OAuth Token Response: {data}")

        token = data.get("access_token")
        if not token:
            logger.error(f"❌ access_token missing in response: {data}")
            raise ValueError("M-Pesa OAuth response did not contain access_token.")

        return token

    except requests.exceptions.HTTPError as e:
        # Log full Safaricom error response if present
        err_text = e.response.text if hasattr(e, "response") and e.response is not None else str(e)
        logger.error(f"❌ Safaricom OAuth HTTPError: {err_text}")
        raise

    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Network error fetching token: {str(e)}")
        raise

    except Exception as e:
        logger.error(f"❌ Unexpected error fetching token: {str(e)}")
        raise


# ============================================================
# 2️⃣  GENERATE SECURITY CREDENTIAL
# ============================================================
# def generate_security_credential(initiator_password, cert_path):
#     """
#     Encrypt the initiator password using Safaricom's public key certificate.
#     Works with both PEM and DER certificate formats.
#     Returns a Base64 encoded SecurityCredential.
#     """
#     try:
#         with open(cert_path, "rb") as cert_file:
#             cert_data = cert_file.read()

#         try:
#             # Try loading as PEM first
#             certificate = x509.load_pem_x509_certificate(cert_data)
#         except ValueError:
#             # If PEM fails, load as DER (Safaricom .cer is DER)
#             certificate = x509.load_der_x509_certificate(cert_data)

#         public_key = certificate.public_key()

#         encrypted_bytes = public_key.encrypt(
#             initiator_password.encode("utf-8"),
#             padding.PKCS1v15()
#         )

#         return base64.b64encode(encrypted_bytes).decode("utf-8")

#     except Exception as e:
#         logger.error(f"❌ Security credential generation failed: {e}")
#         raise


# ============================================================
# 3️⃣  CALL M-PESA B2C ENDPOINT
# ============================================================
def call_mpesa_b2c(vendor, amount, mpesa_config, payout=None):
    """
    Execute a B2C payment (payout to vendor) through Safaricom Daraja API.
    """
    mpesa_b2c_config = mpesa_config.get("b2c", {})

    try:
        # ----------------------------------------------------------------------
        # 1️⃣ Get Access Token
        # ----------------------------------------------------------------------
        access_token = get_mpesa_token()
        if not access_token:
            return {"success": False, "error": "Failed to obtain access token"}

        # ----------------------------------------------------------------------
        # 2️⃣ Map Vendor M-Pesa Payment Type → CommandID
        # ----------------------------------------------------------------------
        command_map = {
            "PHONE": "SalaryPayment",          # Send to M-Pesa number
            "TILL": "PromotionPayment",          # Send to M-Pesa till
            "PAYBILL": "BusinessPayBill",        # Send to PayBill
        }

        command_id = command_map.get(vendor.mpesa_type)
        if not command_id:
            raise ValueError(f"Invalid M-Pesa payment type for vendor: {vendor.company_name}")

        # ----------------------------------------------------------------------
        # 3️⃣ Prepare Recipient (PartyB)
        # ----------------------------------------------------------------------
        if vendor.mpesa_type == "PHONE":
            recipient = vendor.mpesa_number.strip()
            if recipient.startswith("0"):
                recipient = "254" + recipient[1:]
            elif not recipient.startswith("254"):
                recipient = "254" + recipient

        elif vendor.mpesa_type == "TILL":
            recipient = int(vendor.mpesa_till)

        elif vendor.mpesa_type == "PAYBILL":
            recipient = int(vendor.mpesa_paybill)

        else:
            return {"success": False, "error": "Invalid vendor payment type."}

        # ----------------------------------------------------------------------
        # 4️⃣ Generate Security Credential
        # ----------------------------------------------------------------------
        initiator_password = mpesa_b2c_config.get("initiator_password")
        cert_path = mpesa_b2c_config.get("certificate_path")

        if not initiator_password or not cert_path:
            return {"success": False, "error": "Missing initiator password or certificate path."}
        

        originator_conversation_id = str(uuid.uuid4())

        security_credential = generate_security_credential(initiator_password, cert_path)


        payload = {
            "OriginatorConversationID": originator_conversation_id,
            "InitiatorName": mpesa_b2c_config.get("initiator_name"),
            "SecurityCredential": security_credential,
            "CommandID": command_id,
            "Amount": int(amount),
            "PartyA": mpesa_b2c_config.get("short_code"),
            "PartyB": recipient,
            "Remarks": "ok",
            "QueueTimeOutURL": mpesa_b2c_config.get("timeout_url"),
            "ResultURL": mpesa_b2c_config.get("result_url"),
            "Occasion": "salaryPayee",
        }



        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        logger.info("Sending M-Pesa B2C payout request", extra={"vendor_id": vendor.id, "payout_reference": getattr(payout, "reference", None)})

        # ----------------------------------------------------------------------
        # 6️⃣ Send Request
        # ----------------------------------------------------------------------
        
        response = requests.post(mpesa_b2c_config.get("url"), json=payload, headers=headers, timeout=30)



        response.raise_for_status()

        data = response.json()



        # ----------------------------------------------------------------------
        # 7️⃣ Handle M-Pesa Response
        # ----------------------------------------------------------------------
        if data.get("ResponseCode") == "0":

            # FIX: Save the conversation details
            try:
                if payout is None:\n                    raise ValueError("A payout record is required to attach M-Pesa callback identifiers.")
                payout.mpesa_conversation_id = data.get("ConversationID")
                payout.mpesa_originator_conversation_id = data.get("OriginatorConversationID")
                payout.mpesa_result_desc = data.get("ResponseDescription", "")
                payout.save(update_fields=["mpesa_conversation_id", "mpesa_originator_conversation_id", "mpesa_result_desc"])
                logger.info(f"✅ Updated payout {payout.reference} with M-Pesa conversation IDs.")
            except VendorPayout.DoesNotExist:
                logger.warning("⚠ No active VendorPayout found to attach M-Pesa ConversationIDs")
                
            return {
                "success": True,
                "ConversationID": data.get("ConversationID"),
                "OriginatorConversationID": data.get("OriginatorConversationID"),
                "ResponseDescription": data.get("ResponseDescription", ""),
            }

        # Handle Daraja error format
        if "errorCode" in data:
            return {
                "success": False,
                "error": data.get("errorMessage", "Daraja Error"),
                "code": data.get("errorCode"),
                "raw": data,
            }

        return {"success": False, "error": "Unknown M-Pesa error", "raw": data}

    # ----------------------------------------------------------------------
    # 8️⃣ EXCEPTION HANDLING
    # ----------------------------------------------------------------------
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"Network Error: {str(e)}"}
    except Exception as e:
        logger.error(f"❌ Unexpected Error: {e}")
        return {"success": False, "error": f"Unexpected Error: {str(e)}"}



# --------------------------------------------------------
# 4️⃣ Bulk M-Pesa B2C Payment Call
# --------------------------------------------------------
def call_mpesa_b2c_bulk(payouts, mpesa_config):
    results = []
    for payout in payouts:
        vendor = payout.vendor
        amount = payout.amount

        response = call_mpesa_b2c(vendor, amount, mpesa_config, payout=payout)
        status = "Sent to M-Pesa" if response.get('success') else f"Failed: {response.get('error', 'Unknown error')}"

        results.append({
            "vendor": vendor.company_name,
            "reference": payout.reference,
            "status": status,
            "payment_method": "MOBILE_MONEY",
        })
    return results


#-----------------------------------
# paypal
#-----------------------------------
import requests
from requests.auth import HTTPBasicAuth
from django.utils import timezone

def get_usd_to_kes_rate():
    """
    Fetch the real-time USD to KES exchange rate from configured API.
    Expects `settings.EXCHANGE_RATE_API_URL` to be set.
    """
    url = getattr(settings, "EXCHANGE_RATE_API_URL", None)
    if not url:
        logger.error("Exchange rate API URL not configured in settings")
        return None

    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # Adjust this check depending on your API response format
        if data.get('result') != 'success':
            raise Exception(f"Exchange rate API error: {data}")

        rate = data.get('rates', {}).get('KES')
        if not rate or rate <= 0:
            raise Exception("Invalid or missing KES exchange rate")
        logger.info(f"Exchange rate USD to KES fetched: {rate}")
        return rate
    except Exception as e:
        logger.error(f"Failed to get exchange rate USD to KES: {e}")
        return None
    

PAYPAL = settings.PAYMENT_GATEWAYS.get("paypal", {})

if not PAYPAL:
    raise ValueError("⚠️ PayPal configuration missing in settings.PAYMENT_GATEWAYS")

PAYPAL_AUTH_URL = PAYPAL.get("auth_url", "https://api.sandbox.paypal.com/v1/oauth2/token")
PAYPAL_BASE_URL = PAYPAL.get("base_url", "https://api-m.sandbox.paypal.com")
PAYPAL_CLIENT_ID = PAYPAL.get("client_id")
PAYPAL_SECRET = PAYPAL.get("client_secret")


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

    resp = None
    try:
        resp = requests.post(PAYPAL_AUTH_URL, data=data, auth=auth, headers=headers, timeout=10)
        resp.raise_for_status()
        token = resp.json().get("access_token")
        if not token:
            raise ValueError("No access token in PayPal response")
        logger.info("✅ PayPal access token fetched successfully")
        return token

    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Failed to get PayPal token: {e}")
        if resp is not None:
            logger.error(f"PayPal response: {resp.text}")
        raise



def call_paypal_payout_bulk(items, paypal_config):
    access_token = get_paypal_access_token()
    payout_url = paypal_config.get('payout_url') or PAYPAL.get('payout_url') or PAYPAL.get('url')

    if not payout_url:
        raise ValueError("PayPal payout URL is missing")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }

    payload = {
        "sender_batch_header": {
            "sender_batch_id": f"batch_{int(timezone.now().timestamp())}_{uuid.uuid4().hex[:6]}",
            "email_subject": "You have a payout!",
            "email_message": "You have received a payout!"
        },
        "items": items
    }

    response = None
    try:
        response = requests.post(payout_url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()

        batch_header = data.get("batch_header", {})
        batch_id = batch_header.get("payout_batch_id")

        # Save payout_item_id to your VendorPayout by matching sender_item_id
        with db_transaction.atomic():
            for item in data.get("items", []):
                payout_item_id = item.get("payout_item_id")
                sender_item_id = item.get("payout_item", {}).get("sender_item_id")

                try:
                    payout = VendorPayout.objects.get(reference=sender_item_id)
                    payout.paypal_payout_item_id = payout_item_id
                    payout.save()
                    logger.info(f"Linked VendorPayout {payout.reference} with payout_item_id {payout_item_id}")
                except VendorPayout.DoesNotExist:
                    logger.warning(f"No VendorPayout found with reference {sender_item_id} to link payout_item_id {payout_item_id}")

        return {
            "success": True,
            "data": data,
            "batch_id": batch_id,
            "payout_items": [
                {"payout_item_id": item.get("payout_item_id"),
                 "sender_item_id": item.get("payout_item", {}).get("sender_item_id")}
                for item in data.get("items", [])
            ],
        }

    except requests.RequestException as e:
        logger.error(f"PayPal payout request failed: {e}")
        if response is not None:
            logger.error(f"Response content: {response.text}")
        return {"success": False, "error": str(e)}






def call_paypal_payout(payout, paypal_email, amount, paypal_config):
    """
    Make a single PayPal payout using the payout.reference as sender_item_id.

    Args:
        payout: VendorPayout instance (must have .reference)
        paypal_email: recipient email for payout
        amount: decimal or float payout amount
        paypal_config: dict with PayPal config like payout_url

    Returns:
        dict: result from call_paypal_payout_bulk
    """

    item = {
        "recipient_type": "EMAIL",
        "amount": {
            "value": f"{amount:.2f}",
            "currency": "USD",  # Ensure this matches your expected currency
        },
        "receiver": paypal_email,
        "note": "Thank you for your service",
        "sender_item_id": payout.reference  # use payout.reference here
    }

    result = call_paypal_payout_bulk([item], paypal_config)

    logger.info(f"PayPal single payout response for {payout.reference}: {result}")

    return result




# Example usage:

# paypal_config = {
#     "auth_url": "https://api.sandbox.paypal.com/v1/oauth2/token",
#     "client_id": "YOUR_CLIENT_ID",
#     "client_secret": "YOUR_CLIENT_SECRET",
#     "payout_url": "https://api.sandbox.paypal.com/v1/payments/payouts"
# }

# # Single payout example
# result = call_paypal_payout("recipient@example.com", 10.00, paypal_config)
# print(result)

# # Bulk payout example
# bulk_items = [
#     {
#         "recipient_type": "EMAIL",
#         "amount": {"value": "10.00", "currency": "KES"},
#         "receiver": "user1@example.com",
#         "note": "Thank you!",
#         "sender_item_id": "item_1"
#     },
#     {
#         "recipient_type": "EMAIL",
#         "amount": {"value": "25.50", "currency": "KES"},
#         "receiver": "user2@example.com",
#         "note": "Thank you!",
#         "sender_item_id": "item_2"
#     },
# ]

# bulk_result = call_paypal_payout_bulk(bulk_items, paypal_config)
# print(bulk_result)


#-----------------------------------
# bank transfer
#-----------------------------------

def to_float(value):
    """Safely convert Decimal to float."""
    if isinstance(value, Decimal):
        return float(value)
    return value


def get_kcb_access_token():
    auth_url = settings.PAYMENT_GATEWAYS["kcb"]["auth_url"]
    client_id = settings.PAYMENT_GATEWAYS["kcb"]["client_id"]
    client_secret = settings.PAYMENT_GATEWAYS["kcb"]["client_secret"]

    print("KCB OAuth Settings:", settings.PAYMENT_GATEWAYS["kcb"])

    try:
        response = requests.post(
            auth_url,
            auth=HTTPBasicAuth(client_id, client_secret),
            data={"grant_type": "client_credentials"},
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout=10
        )
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"[ERROR] Failed to get access token: {e}")
        return None

    token = response.json().get("access_token")
    if not token:
        print("[ERROR] Access token not found in response")
    return token


def call_bank_transfer(account_number, amount, max_retries=3, retry_delay=2):
    access_token = get_kcb_access_token()
    if not access_token:
        return {"success": False, "error": "Failed to retrieve access token."}

    print(f"KCB Access Token: {access_token}")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-IBM-Client-Id": settings.PAYMENT_GATEWAYS["kcb"]["client_id"],
        "X-IBM-Client-Secret": settings.PAYMENT_GATEWAYS["kcb"]["client_secret"],
        "X-Message-ID": str(uuid.uuid4()),
    }

    single_transfer_url = "https://uat.buni.kcbgroup.com/fundstransfer/1.0.0/api/v1/transfer"


    company_code = "KE0010001"
    transaction_type = "IF"
    debit_account_number = "37890012"

    try:
        debit_amount = float(amount)
    except Exception as ex:
        return {"success": False, "error": f"Invalid amount: {ex}"}

    payload = {
        "header": {
            "messageID": str(uuid.uuid4()),
            "messageDateTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "channel": "API",
            "destination": "KCB"
        },
        "companyCode": company_code,
        "transactionType": transaction_type,
        "debitAccountNumber": debit_account_number,
        "creditAccountNumber": account_number,
        "debitAmount": debit_amount,
        "currency": "KES",
        "narrative": "Automated payment",
        "debitPostingDate": datetime.now().strftime("%Y-%m-%d"),
        "creditPostingDate": datetime.now().strftime("%Y-%m-%d"),
        "beneficiaryDetails": "Beneficiary Name",  # Replace with dynamic value if possible
        "beneficiaryBankCode": "01",  # Adjust if needed
        "bankingSlipNumber": str(random.randint(100000, 999999)),
        "transactionReference": str(uuid.uuid4())[:12],
    }

    print(f"[DEBUG] Single transfer payload: {payload}")

    for attempt in range(1, max_retries + 1):
        try:
            response = requests.post(single_transfer_url, json=payload, headers=headers, timeout=10)
            print(f"[DEBUG] Attempt {attempt} HTTP status: {response.status_code}")
            print(f"[DEBUG] Response content: {response.text}")

            response.raise_for_status()

            data = response.json()

            status_code = data.get("header", {}).get("statusCode")
            status_desc = data.get("header", {}).get("statusDescription", "")

            if status_code == "0":
                return {"success": True, "raw": data}
            else:
                print(f"[ERROR] API returned failure status: {status_desc}")
                return {"success": False, "error": status_desc, "raw": data}

        except requests.RequestException as e:
            error_msg = str(e)
            if hasattr(e, "response") and e.response is not None:
                try:
                    error_json = e.response.json()
                    error_msg += f" - {error_json}"
                except Exception:
                    error_msg += f" - {e.response.text}"

            print(f"[ERROR] Attempt {attempt} failed: {error_msg}")

            if attempt < max_retries:
                print(f"[INFO] Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                return {"success": False, "error": error_msg}

    return {"success": False, "error": "Unknown error after retries."}



#-----------------------------------
# payment processor
#-----------------------------------
def payment_processors(start_date, end_date, payment_method=None):
    payouts = VendorPayout.objects.filter(
        payout_period_start=start_date,
        payout_period_end=end_date,
        paid=False
    )
    
    if payment_method:
        payouts = payouts.filter(vendor__payment_method=payment_method)
    
    results = []

    mpesa_config = settings.PAYMENT_GATEWAYS.get("mpesa", {})
    paypal_config = settings.PAYMENT_GATEWAYS.get("paypal", {})

    # Handle BANK_TRANSFER: no bulk support, so loop individual calls
    if payment_method == "BANK_TRANSFER":
        for payout in payouts:
            try:
                response = call_bank_transfer(payout.vendor.bank_account_number, payout.amount)
                status = "Transferred to Bank" if response.get("success") else f"Failed: {response.get('error', 'Unknown error')}"
            except Exception as e:
                status = f"Exception: {str(e)}"

            results.append({
                "vendor": payout.vendor.company_name,
                "reference": payout.reference,
                "status": status,
                "payment_method": "BANK_TRANSFER",
            })
        return {"results": results}

    # Handle M-PESA bulk payments
    if payment_method == "MOBILE_MONEY":
        try:
            # Pass queryset of payouts directly, as call_mpesa_b2c_bulk expects model instances
            response = call_mpesa_b2c_bulk(payouts, mpesa_config)
        except Exception as e:
            for payout in payouts:
                results.append({
                    "vendor": payout.vendor.company_name,
                    "reference": payout.reference,
                    "status": f"Exception: {str(e)}",
                    "payment_method": "MOBILE_MONEY",
                })
            return {"results": results}

        # Process response according to your bulk API response format
        for res in response:
            vendor_name = res.get('vendor')
            # If vendor_name is a model instance, get company_name
            if hasattr(vendor_name, 'company_name'):
                vendor_name = vendor_name.company_name

            # Assuming 'status' in response holds the status message from call_mpesa_b2c_bulk
            status = res.get('status')
            if status != "Sent to M-Pesa":
                status = f"Failed: {status or 'Unknown error'}"

            results.append({
                "vendor": vendor_name,
                "reference": res.get('reference'),
                "status": status,
                "payment_method": "MOBILE_MONEY",
            })
        return {"results": results}

    # Handle PayPal bulk payments
    if payment_method == "PAYPAL":
        bulk_paypal_items = []

        usd_to_kes_rate_raw = get_usd_to_kes_rate()
        if not usd_to_kes_rate_raw:
            for payout in payouts:
                results.append({
                    "vendor": payout.vendor.company_name,
                    "reference": payout.reference,
                    "status": "Failed: Could not fetch exchange rate USD to KES",
                    "payment_method": "PAYPAL",
                })
            return {"results": results}

        try:
            usd_to_kes_rate = Decimal(str(usd_to_kes_rate_raw))
        except (InvalidOperation, TypeError) as e:
            for payout in payouts:
                results.append({
                    "vendor": payout.vendor.company_name,
                    "reference": payout.reference,
                    "status": f"Failed: Invalid exchange rate value ({e})",
                    "payment_method": "PAYPAL",
                })
            return {"results": results}

        for payout in payouts:
            if not payout.vendor.paypal_email:
                results.append({
                    "vendor": payout.vendor.company_name,
                    "reference": payout.reference,
                    "status": "Failed: Missing PayPal email",
                    "payment_method": "PAYPAL",
                })
                continue

            try:
                amount_usd = (payout.amount / usd_to_kes_rate).quantize(Decimal('0.01'))
            except (InvalidOperation, ZeroDivisionError) as e:
                results.append({
                    "vendor": payout.vendor.company_name,
                    "reference": payout.reference,
                    "status": f"Failed: Conversion error {str(e)}",
                    "payment_method": "PAYPAL",
                })
                continue

            if amount_usd <= 0:
                results.append({
                    "vendor": payout.vendor.company_name,
                    "reference": payout.reference,
                    "status": "Failed: Invalid converted payout amount",
                    "payment_method": "PAYPAL",
                })
                continue

            bulk_paypal_items.append({
                "recipient_type": "EMAIL",
                "amount": {
                    "value": str(amount_usd),  # safer than f-string for Decimal
                    "currency": "USD"
                },
                "receiver": payout.vendor.paypal_email,
                "note": "Thank you for your service",
                "sender_item_id": payout.reference or f"item_{uuid.uuid4().hex[:6]}"
            })

        try:
            response = call_paypal_payout_bulk(bulk_paypal_items, paypal_config)
        except Exception as e:
            for payout in payouts:
                results.append({
                    "vendor": payout.vendor.company_name,
                    "reference": payout.reference,
                    "status": f"Exception: {str(e)}",
                    "payment_method": "PAYPAL",
                })
            return {"results": results}

        if response.get("success"):
            for payout in payouts:
                results.append({
                    "vendor": payout.vendor.company_name,
                    "reference": payout.reference,
                    "status": "Sent to PayPal",
                    "payment_method": "PAYPAL",
                })
        else:
            error_msg = response.get('error', 'Unknown error')
            for payout in payouts:
                results.append({
                    "vendor": payout.vendor.company_name,
                    "reference": payout.reference,
                    "status": f"Failed: {error_msg}",
                    "payment_method": "PAYPAL",
                })
        return {"results": results}

    # If payment_method is None or unknown, process individually
    for payout in payouts:
        vendor = payout.vendor
        method = vendor.payment_method
        amount = payout.amount
        try:
            if method == "MOBILE_MONEY":
                response = call_mpesa_b2c(vendor, amount, mpesa_config, payout=payout)
                status = "Sent to M-Pesa" if response.get('success') else f"Failed: {response.get('error', 'Unknown error')}"

            elif method == "PAYPAL":
                response = call_paypal_payout(vendor.paypal_email, amount, paypal_config)
                status = "Sent to PayPal" if response.get('success') else f"Failed: {response.get('error', 'Unknown error')}"

            elif method == "BANK_TRANSFER":
                response = call_bank_transfer(vendor.bank_account_number, amount)
                status = "Transferred to Bank" if response.get('success') else f"Failed: {response.get('error', 'Unknown error')}"

            else:
                status = "Unknown payment method"

        except Exception as e:
            status = f"Exception: {str(e)}"

        results.append({
            "vendor": vendor.company_name,
            "reference": payout.reference,
            "status": status,
            "payment_method": method,
        })

    return {"results": results}
