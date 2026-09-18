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
from core.realtime import broadcast_event
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
    """Handle a Daraja B2C result callback without trusting the callback as payment proof."""
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"ResultCode": 1, "ResultDesc": "Invalid JSON"}, status=400)

    result = data.get("Result") or {}
    conversation_id = result.get("ConversationID")
    originator_conversation_id = result.get("OriginatorConversationID")
    result_code = result.get("ResultCode")
    result_desc = str(result.get("ResultDesc") or "")[:255]
    transaction_id = result.get("TransactionID")

    if not conversation_id and not originator_conversation_id:
        logger.warning("M-Pesa B2C callback missing correlation identifiers.")
        return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

    try:
        with db_transaction.atomic():
            payout_qs = VendorPayout.objects.select_for_update()
            payout = None

            if conversation_id:
                payout = payout_qs.filter(mpesa_conversation_id=conversation_id).first()

            if payout is None and originator_conversation_id:
                payout = payout_qs.filter(
                    mpesa_originator_conversation_id=originator_conversation_id
                ).first()

            if payout is None:
                logger.warning(
                    "M-Pesa B2C callback did not match a payout.",
                    extra={"conversation_id": conversation_id},
                )
                return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

            if (
                conversation_id
                and payout.mpesa_conversation_id
                and payout.mpesa_conversation_id != conversation_id
            ):
                logger.error(
                    "M-Pesa conversation correlation mismatch.",
                    extra={"payout_reference": payout.reference},
                )
                return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

            if (
                originator_conversation_id
                and payout.mpesa_originator_conversation_id
                and payout.mpesa_originator_conversation_id != originator_conversation_id
            ):
                logger.error(
                    "M-Pesa originator correlation mismatch.",
                    extra={"payout_reference": payout.reference},
                )
                return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

            if result_code == 0 and not transaction_id:
                logger.error(
                    "M-Pesa B2C success callback missing transaction identifier.",
                    extra={"payout_reference": payout.reference},
                )
                return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

            if transaction_id:
                existing = Transaction.objects.filter(
                    mpesa_receipt_number=transaction_id
                ).exclude(payout=payout).first()
                if existing:
                    logger.error(
                        "M-Pesa transaction identifier already belongs to another payout.",
                        extra={"payout_reference": payout.reference},
                    )
                    return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

            previous_paid = payout.paid
            payout.mpesa_conversation_id = conversation_id or payout.mpesa_conversation_id
            payout.mpesa_originator_conversation_id = (
                originator_conversation_id or payout.mpesa_originator_conversation_id
            )
            payout.mpesa_transaction_id = transaction_id or payout.mpesa_transaction_id
            payout.mpesa_result_code = result_code
            payout.mpesa_result_desc = result_desc

            if result_code == 0:
                if not payout.paid:
                    payout.paid = True
                    payout.paid_at = timezone.now()
            elif not payout.paid:
                payout.paid = False

            payout.save(update_fields=[
                "mpesa_conversation_id",
                "mpesa_originator_conversation_id",
                "mpesa_transaction_id",
                "mpesa_result_code",
                "mpesa_result_desc",
                "paid",
                "paid_at",
            ])

            if transaction_id:
                Transaction.objects.update_or_create(
                    mpesa_receipt_number=transaction_id,
                    defaults={
                        "transaction_type": "B2C",
                        "amount": payout.amount,
                        "account_reference": payout.reference,
                        "status": "Completed" if result_code == 0 else "Failed",
                        "payout": payout,
                        "vendor": payout.vendor,
                        "phone_number": getattr(payout.vendor, "mpesa_number", None),
                        "raw_data": {},
                    },
                )

            if result_code == 0 and not previous_paid:
                vendor_user = getattr(payout.vendor, "user", None)
                if vendor_user:
                    Notification.objects.create(
                        user=vendor_user,
                        title="Vendor Payout Successful",
                        message=f"Payout {payout.reference} has been confirmed by M-Pesa.",
                        url=f"/vendor/payouts/{payout.reference}/",
                    )

            transaction_id_for_event = payout.mpesa_transaction_id
            transaction.on_commit(
                lambda: broadcast_event(
                    "payout.updated",
                    model="VendorPayout",
                    object_id=payout.id,
                    action="updated",
                    vendor_ids=[payout.vendor_id],
                    data={
                        "reference": payout.reference,
                        "status": "SUCCESS" if payout.paid else "FAILED",
                        "paid": payout.paid,
                        "paid_at": payout.paid_at.isoformat() if payout.paid_at else None,
                        "transaction_id": transaction_id_for_event,
                    },
                )
            )

    except Exception:
        logger.exception(
            "M-Pesa B2C callback processing failed.",
            extra={"conversation_id": conversation_id},
        )
        return JsonResponse({"ResultCode": 1, "ResultDesc": "Temporary processing failure"}, status=500)

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

