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
from oder.models import Transaction
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
    """
    PayPal payout webhook handler.
    Handles payout item status updates and batch-level events.
    """

    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        logger.error("❌ Invalid JSON received from PayPal")
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    logger.info(f"📥 Incoming PayPal webhook: {data}")

    event_type = data.get("event_type")
    resource = data.get("resource", {})

    # Handle batch-level events
    if event_type and event_type.startswith("PAYMENT.PAYOUTSBATCH"):
        batch_header = resource.get("batch_header", {})
        batch_status = batch_header.get("batch_status")
        payout_batch_id = batch_header.get("payout_batch_id")

        logger.info(f"🗂 Handling batch event: Batch ID {payout_batch_id} with status {batch_status}")

        # TODO: Add any internal batch processing here if you have a Batch model
        # For example:
        # batch = PayoutBatch.objects.filter(batch_id=payout_batch_id).first()
        # if batch:
        #     batch.status = batch_status
        #     batch.completed_at = timezone.now() if batch_status in ('SUCCESS', 'FAILED') else None
        #     batch.save()

        return JsonResponse({"status": "batch event processed"}, status=200)

    # Process payout item events only
    if not event_type or not event_type.startswith("PAYMENT.PAYOUTS-ITEM"):
        logger.info(f"Ignoring non-item event type: {event_type}")
        return JsonResponse({"status": "ignored"}, status=200)

    sender_item_id = resource.get("payout_item", {}).get("sender_item_id")
    transaction_status = resource.get("transaction_status")
    transaction_id = resource.get("transaction_id")

    amount_str = (
        resource.get("amount", {}).get("value")
        or resource.get("payout_item", {}).get("amount", {}).get("value")
    )
    currency = (
        resource.get("amount", {}).get("currency")
        or resource.get("payout_item", {}).get("amount", {}).get("currency")
    )

    if not sender_item_id:
        logger.warning(f"⚠️ Webhook ignored — missing sender_item_id for event {event_type}")
        return JsonResponse({"status": "ignored"}, status=200)

    try:
        amount = Decimal(amount_str)
    except Exception:
        amount = Decimal("0.00")

    try:
        with db_transaction.atomic():
            payout = VendorPayout.objects.filter(reference=sender_item_id).first()

            if not payout:
                logger.warning(
                    f"⚠️ No VendorPayout found for reference={sender_item_id}. Webhook ignored."
                )
                return JsonResponse({"status": "ignored"}, status=200)

            if transaction_id and Transaction.objects.filter(
                paypal_transaction_id=transaction_id
            ).exists():
                logger.info(f"🟡 Duplicate PayPal webhook ignored (transaction {transaction_id})")
                return JsonResponse({"status": "ok"}, status=200)

            success = (transaction_status == "SUCCESS")

            payout.paypal_transaction_id = transaction_id or payout.paypal_transaction_id
            payout.paypal_transaction_status = transaction_status or payout.paypal_transaction_status
            payout.paypal_amount = amount or payout.paypal_amount
            payout.paypal_currency = currency or payout.paypal_currency

            if success:
                payout.paid = True
                payout.paid_at = timezone.now()
            payout.save()

            # ---- WEBSOCKET BROADCAST ----
            try:
                channel_layer = get_channel_layer()

                async_to_sync(channel_layer.group_send)(
                    f"payout_{sender_item_id}",
                    {
                        "type": "payout.update",
                        "event": "paypal_payout_update",
                        "reference": sender_item_id,
                        "status": transaction_status,
                        "success": success,
                        "amount": str(amount),
                        "currency": currency,
                        "transaction_id": transaction_id,
                    }
                )
                logger.info(f"📡 WebSocket event broadcasted for payout {sender_item_id}")

            except Exception as e:
                logger.error(f"❌ WebSocket broadcast failed: {e}")


            Transaction.objects.create(
                transaction_type="PayPal",
                paypal_transaction_id=transaction_id,
                amount=amount,
                status="Completed" if success else "Failed",
                account_reference=sender_item_id,
                raw_data=data,
                payout=payout,
                vendor=payout.vendor,
                payment_method="paypal",
            )

            logger.info(f"💾 Updated payout {payout.reference} | Status: {transaction_status}")

            # Format month name from payout date
            month_name = payout.created_at.strftime("%B %Y") if payout.created_at else "this month"

            Notification.objects.create(
                user=payout.vendor.user if hasattr(payout.vendor, 'user') else None,
                title="PayPal Payout Update",
                message=(
                    f"Your PayPal payout of {amount} {currency} "
                    f"for {month_name} is now {transaction_status}."
                ),
            )

            admins = User.objects.filter(is_superuser=True)
            for admin in admins:
                Notification.objects.create(
                    user=admin,
                    title=f"PayPal Payout {transaction_status}",
                    message=(
                        f"Payout {payout.reference} for vendor {payout.vendor.company_name} "
                        f"has status: {transaction_status}. Transaction ID: {transaction_id}."
                    ),
                )

            ActivityLog.objects.create(
                user=payout.vendor.user if hasattr(payout.vendor, 'user') else None,
                actor_type="vendor",
                action="payout_completed" if success else "payout_failed",
                description=(
                    f"PayPal payout {payout.reference} updated: "
                    f"{transaction_status} (Transaction ID: {transaction_id})"
                ),
                timestamp=timezone.now(),
            )

    except Exception as e:
        logger.error(f"🔥 Webhook processing error: {e}", exc_info=True)
        return JsonResponse({"status": "ok"}, status=200)

    return JsonResponse({"status": "ok"}, status=200)

