from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db import transaction as db_transaction
from decimal import Decimal, InvalidOperation
from datetime import datetime

# wesockets
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

import json
import logging
import ipaddress
from vendorDashboard.models import VendorPayout
from core.models import Notification, ActivityLog
from order.models import Transaction
from order.paypalApis import verify_paypal_signature
from vendorDashboard.payout.services.paypal_payouts import apply_paypal_payout_status
from django.contrib.auth import get_user_model

User = get_user_model()

logger = logging.getLogger(__name__)

ALLOWED_MPESA_IPS = [
    '196.201.96.0/19',
    '41.204.192.0/19',
    # add other Safaricom IP ranges here
]

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def is_valid_mpesa_ip(ip):
    ip_addr = ipaddress.ip_address(ip)
    for ip_range in ALLOWED_MPESA_IPS:
        if ip_addr in ipaddress.ip_network(ip_range):
            return True
    return False

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

@csrf_exempt
def mpesa_result(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    ip = get_client_ip(request)
    logger.info(f"📥 Incoming M-Pesa Result callback from IP: {ip}, Raw body: {request.body}")

    # ---------------------------------------------------------
    # Parse JSON
    # ---------------------------------------------------------
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        logger.error("❌ Failed to decode JSON from M-Pesa B2C callback")
        return JsonResponse({"ResultCode": 1, "ResultDesc": "Invalid JSON"}, status=400)

    logger.info(f"✅ Parsed Callback Data: {data}")

    result = data.get("Result")
    if not result:
        logger.error("❌ Missing 'Result' block in callback")
        return JsonResponse({"ResultCode": 1, "ResultDesc": "Invalid Callback Format"})

    # ---------------------------------------------------------
    # Extract fields from Result
    # ---------------------------------------------------------
    conversation_id = result.get("ConversationID")
    originator_conversation_id = result.get("OriginatorConversationID")
    result_code = result.get("ResultCode")
    result_desc = result.get("ResultDesc")
    transaction_id = result.get("TransactionID")

    # amount fetch
    params = result.get("ResultParameters", {}).get("ResultParameter", [])
    amount = next((p.get("Value") for p in params if p.get("Key") == "TransactionAmount"), 0)

    if not conversation_id:
        logger.error("❌ Missing ConversationID in callback")
        return JsonResponse({"ResultCode": 1, "ResultDesc": "Missing ConversationID"})

    logger.info(f"🔎 Looking for payout with reference={conversation_id}")

    # ---------------------------------------------------------
    # DB OPERATIONS
    # ---------------------------------------------------------
    try:
        with db_transaction.atomic():

            payout = VendorPayout.objects.filter(mpesa_conversation_id=conversation_id).first()

            if not payout:
                logger.warning(f"⚠️ No VendorPayout found for ConversationID={conversation_id}")
                return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

            # Avoid duplicate callback processing
            if Transaction.objects.filter(account_reference=conversation_id).exists():
                logger.info(f"🟡 Duplicate callback ignored for {conversation_id}")
                return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

            success = (result_code == 0)

            # ---------------------------------------------------------
            # Update payout with M-Pesa metadata
            # ---------------------------------------------------------
            payout.mpesa_conversation_id = conversation_id
            payout.mpesa_originator_conversation_id = originator_conversation_id
            payout.mpesa_transaction_id = transaction_id
            payout.mpesa_result_code = result_code
            payout.mpesa_result_desc = result_desc

            if success:
                payout.paid = True
                payout.paid_at = timezone.now()
            else:
                payout.paid = False

            payout.save()
            logger.info(f"💾 Updated payout {payout.reference} with M-Pesa metadata")

            # ---------------------------------------------------------
            # Create Transaction Log
            # ---------------------------------------------------------
            if Transaction.objects.filter(mpesa_receipt_number=transaction_id).exists():
                logger.info(f"🟡 Duplicate M-Pesa receipt ignored: {transaction_id}")
            else:
                Transaction.objects.create(
                    transaction_type="B2C",
                    mpesa_receipt_number=transaction_id,
                    phone_number=payout.vendor.mpesa_number,
                    amount=amount,
                    account_reference=conversation_id,
                    status="Completed" if success else "Failed",
                    raw_data=data,
                    payout=payout,
                    vendor=payout.vendor,
                )
            logger.info(f"🧾 Created Transaction record for {conversation_id}")

            # ---------------------------------------------------------
            # Send Notifications
            # ---------------------------------------------------------
            if success:
                message = (
                    f"Payout of KES {amount} completed for vendor "
                    f"{payout.vendor.company_name}. Transaction ID: {transaction_id}."
                )

                # Vendor Notification
                vendor_user = getattr(payout.vendor, "user", None)
                if vendor_user:
                    Notification.objects.create(
                        user=vendor_user,
                        title="Vendor Payout Successful",
                        message=message,
                        url=f"/vendor/payouts/{payout.reference}/",
                    )
                    logger.info(f"📢 Vendor notified: {vendor_user.username}")

                # Admin Notifications
                for admin in User.objects.filter(is_superuser=True):
                    Notification.objects.create(
                        user=admin,
                        title="Vendor Payout Completed",
                        message=message,
                        url=f"/admin-vendor/payouts/{payout.reference}/",
                    )
                    logger.info(f"🗂️ Admin notified: {admin.username}")

            else:
                logger.warning(
                    f"❌ Payout failed for {payout.vendor.company_name}: "
                    f"Code={result_code}, Desc={result_desc}"
                )

            # ---------------------------------------------------------
            # ⭐⭐⭐ WEBSOCKET BROADCAST HERE ⭐⭐⭐
            # ---------------------------------------------------------
            # WebSocket broadcast to frontend
            channel_layer = get_channel_layer()
            group_name = f"payout_{payout.reference}"

            # Include vendor info in the event
            vendor_name = getattr(payout.vendor, "company_name", None) or getattr(payout.vendor, "name", "Vendor")

            event = {
                "type": "payout_message",
                "status": "success" if success else "failed",
                "reference": payout.reference,
                "amount": amount,
                "transaction_id": transaction_id,
                "vendor": vendor_name,
                "message": (
                    f"Payout of KES {amount} completed successfully."
                    if success else
                    f"Payout failed: {result_desc}"
                ),
            }
            async_to_sync(channel_layer.group_send)(group_name, event)
            logger.info(f"📡 WebSocket broadcast sent to {group_name}: {event}")

    except Exception as e:
        logger.error(f"🔥 Error processing B2C callback: {e}")

    # ---------------------------------------------------------
    # Safaricom MUST always receive status=0 for retry prevention
    # ---------------------------------------------------------
    return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})






@csrf_exempt
def mpesa_timeout(request):
    if request.method == "POST":
        ip = get_client_ip(request)
        logger.info(f"Incoming M-Pesa Timeout callback from IP: {ip}, Raw body: {request.body}")

        # Uncomment after testing to enable IP filtering:
        if not is_valid_mpesa_ip(ip):
            logger.warning(f"Blocked M-Pesa Timeout callback from invalid IP: {ip}")
            return HttpResponseForbidden("Invalid IP")

        try:
            data = json.loads(request.body.decode("utf-8"))
        except json.JSONDecodeError:
            logger.error("Failed to decode JSON from M-Pesa Timeout callback")
            return JsonResponse({"ResultCode": 1, "ResultDesc": "Invalid JSON"}, status=400)

        logger.warning("⚠️ M-Pesa Timeout Callback data: %s", data)
        return JsonResponse({"ResultCode": 1, "ResultDesc": "Timeout received"})

    return JsonResponse({"error": "Invalid method"}, status=405)




# your_app/views.py
from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
import logging

logger = logging.getLogger(__name__)

def kcb_oauth_callback(request):
    """
    Handles OAuth callback from KCB with authorization code.
    """
    error = request.GET.get('error')
    code = request.GET.get('code')
    state = request.GET.get('state')

    if error:
        logger.error(f"KCB OAuth error: {error}")
        return HttpResponse(f"OAuth error: {error}", status=400)

    if not code:
        logger.error("No authorization code received from KCB OAuth.")
        return HttpResponse("No authorization code received.", status=400)

    # TODO: Exchange the authorization code for access token here
    # You may want to call your token endpoint and save token in DB or session.

    logger.info(f"Received KCB OAuth code: {code} with state: {state}")

    # For now just display code for testing
    return JsonResponse({"code": code, "state": state})



#-------------------------
# Paypal_callback
#------------------------
@csrf_exempt
def paypal_payout_webhook(request):
    """Process authenticated PayPal payout item webhooks idempotently."""
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    raw_body = request.body
    if not verify_paypal_signature(raw_body, request):
        logger.warning("Rejected PayPal payout webhook with invalid signature.")
        return JsonResponse({"error": "Invalid signature"}, status=400)

    try:
        data = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    event_id = data.get("id")
    event_type = str(data.get("event_type") or "")
    resource = data.get("resource") or {}

    logger.info(
        "Received PayPal payout webhook.",
        extra={"event_id": event_id, "event_type": event_type},
    )

    if event_type.startswith("PAYMENT.PAYOUTSBATCH"):
        # PayPal batch webhooks do not contain item-level information.
        # Item settlement is reconciled through item events or the batch API.
        return JsonResponse({"status": "accepted"}, status=200)

    if not event_type.startswith("PAYMENT.PAYOUTS-ITEM."):
        return JsonResponse({"status": "ignored"}, status=200)

    payout_item = resource.get("payout_item") or {}
    sender_item_id = payout_item.get("sender_item_id")
    payout_item_id = resource.get("payout_item_id")
    transaction_status = str(resource.get("transaction_status") or "").upper()
    transaction_id = resource.get("transaction_id")

    event_status_map = {
        "SUCCEEDED": "SUCCESS",
        "FAILED": "FAILED",
        "RETURNED": "RETURNED",
        "CANCELED": "RETURNED",
        "HELD": "ONHOLD",
        "BLOCKED": "BLOCKED",
        "REFUNDED": "REFUNDED",
        "UNCLAIMED": "UNCLAIMED",
    }
    event_suffix = event_type.rsplit(".", 1)[-1].upper()
    expected_status = event_status_map.get(event_suffix)
    if expected_status and transaction_status != expected_status:
        logger.warning(
            "PayPal payout webhook status did not match event type.",
            extra={"event_id": event_id, "event_type": event_type},
        )
        return JsonResponse({"status": "accepted"}, status=200)
    payout_batch_id = resource.get("payout_batch_id")

    amount_data = resource.get("amount") or payout_item.get("amount") or {}
    amount = amount_data.get("value")
    currency = amount_data.get("currency")

    if not sender_item_id and not payout_item_id:
        logger.warning(
            "Ignoring PayPal payout webhook without payout correlation.",
            extra={"event_id": event_id, "event_type": event_type},
        )
        return JsonResponse({"status": "ignored"}, status=200)

    try:
        with db_transaction.atomic():
            payout_qs = VendorPayout.objects.select_for_update()

            if payout_item_id:
                payout = payout_qs.filter(
                    paypal_payout_item_id=payout_item_id
                ).first()
            else:
                payout = None

            if payout is None and sender_item_id:
                payout = payout_qs.filter(reference=sender_item_id).first()

            if payout is None:
                logger.warning(
                    "PayPal payout webhook did not match a local payout.",
                    extra={
                        "event_id": event_id,
                        "event_type": event_type,
                        "sender_item_id": sender_item_id,
                        "payout_item_id": payout_item_id,
                    },
                )
                return JsonResponse({"status": "accepted"}, status=200)

            if (
                payout_item_id
                and payout.paypal_payout_item_id
                and payout.paypal_payout_item_id != payout_item_id
            ):
                logger.error(
                    "PayPal payout item correlation mismatch.",
                    extra={"payout_reference": payout.reference},
                )
                return JsonResponse({"status": "accepted"}, status=200)

            if sender_item_id and sender_item_id != payout.reference:
                logger.error(
                    "PayPal sender item correlation mismatch.",
                    extra={"payout_reference": payout.reference},
                )
                return JsonResponse({"status": "accepted"}, status=200)

            # apply_paypal_payout_status performs the authoritative locked update
            # and only sets paid=True for provider-confirmed SUCCESS.
            apply_paypal_payout_status(
                payout.id,
                transaction_status=transaction_status,
                transaction_id=transaction_id,
                payout_item_id=payout_item_id,
                payout_batch_id=payout_batch_id,
                amount=amount,
                currency=currency,
            )

    except (InvalidOperation, ValueError) as exc:
        logger.warning(
            "Rejected invalid PayPal payout webhook data.",
            extra={"event_id": event_id, "reason": str(exc)},
        )
        return JsonResponse({"status": "accepted"}, status=200)
    except Exception:
        logger.exception(
            "PayPal payout webhook processing failed.",
            extra={"event_id": event_id, "event_type": event_type},
        )
        # Let PayPal retry transient/internal failures. The handler is
        # idempotent, and reconciliation is available for missed deliveries.
        return JsonResponse({"error": "Temporary processing failure"}, status=500)

    return JsonResponse({"status": "accepted"}, status=200)

