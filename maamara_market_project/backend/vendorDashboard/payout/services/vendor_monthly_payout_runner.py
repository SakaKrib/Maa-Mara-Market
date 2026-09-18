import requests
import logging
from datetime import date
from dateutil.relativedelta import relativedelta
from django.utils import timezone

from django.conf import settings

from vendorDashboard.payout.services.payment_processors import (
    call_mpesa_b2c,
    call_paypal_payout,
    call_bank_transfer,
)

from vendorDashboard.models import Vendor, VendorPayout
from vendorDashboard.payout.services.payment_processors import payment_processors
from vendorDashboard.payout.services.paypal_payouts import reconcile_paypal_payout
from vendorDashboard.payout.services.kcb_payouts import reconcile_kcb_payout
from vendorDashboard.views import get_vendor_earnings  # assuming your current function lives here
from rest_framework.permissions import IsAdminUser
from rest_framework.decorators import permission_classes,api_view
from rest_framework.response import Response
from collections import defaultdict

logger = logging.getLogger(__name__)


# =========================
# 🚀 API Endpoint generate
# =========================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def generate_monthly_payouts(request):
    today = timezone.now().date()
    start_date = today.replace(day=1)
    end_date = (start_date + relativedelta(months=1)) - relativedelta(days=1)

    summary = {
        "period": f"{start_date} → {end_date}",
        "generated": [],
        "errors": [],
    }

    active_vendors = Vendor.objects.filter(is_active=True)
    for vendor in active_vendors:

        vendor_data = {
            "id": vendor.id,
            "company_name": vendor.company_name,
            "email": vendor.email,
            "MpesaNo": vendor.mpesa_number,
            "PaypalEmail": vendor.paypal_email,
            "BankAccountNo": vendor.bank_account_number,
            "BankAccountName": vendor.bank_account_name,
        }
        try:
            result = get_vendor_earnings(vendor, start_date, end_date)
            payout = result["payout"]
            summary["generated"].append({
                "vendor": vendor_data,  # full vendor info here
                "amount": float(payout.amount),
                "reference": payout.reference,
                "payment_method": vendor.payment_method,
                "payout_status": payout.paid,
            })

        except Exception as e:
            summary["errors"].append({
                "vendor": vendor.company_name,
                "error": str(e),
            })

    # Group payouts by payment method
    grouped = defaultdict(list)
    for item in summary["generated"]:
        grouped[item["payment_method"]].append(item)

    summary["generated"] = dict(grouped)
    summary["status"] = "generated"

    return Response(summary)



# =========================
# 🚀 API Endpoint group
# =========================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def process_payouts_by_group(request):
    today = timezone.now().date()
    start_date = today.replace(day=1)
    end_date = (start_date + relativedelta(months=1)) - relativedelta(days=1)

    payment_method = request.data.get("payment_method")

    if payment_method:
        payout_results = payment_processors(start_date, end_date, payment_method=payment_method)
        summary = {
            "results": {
                payment_method: payout_results.get("results", [])
            },
            "status": "submitted",
            "period": f"{start_date} → {end_date}"
        }
    else:
        groups = ["BANK_TRANSFER", "PAYPAL", "MOBILE_MONEY"]
        summary = {"results": {}}
        for group in groups:
            payout_results = payment_processors(start_date, end_date, payment_method=group)
            summary["results"][group] = payout_results.get("results", [])
        summary["status"] = "completed"
        summary["period"] = f"{start_date} → {end_date}"

    return Response(summary)



# =========================
# 🚀 API Endpoint single
# =========================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def pay_single_vendor_payout(request, reference):
    try:
        payout = VendorPayout.objects.get(reference=reference)
    except VendorPayout.DoesNotExist:
        return Response({"error": "Payout reference not found."}, status=404)

    if payout.paid:
        return Response({"message": "Payout already paid.", "reference": payout.reference}, status=200)

    vendor = payout.vendor
    amount = payout.amount
    method = vendor.payment_method

    # Load gateway configs
    mpesa_config = settings.PAYMENT_GATEWAYS.get("mpesa", {})
    paypal_config = settings.PAYMENT_GATEWAYS.get("paypal", {})

    try:
        # Do not submit a second provider request while an earlier submission
        # has a provider correlation that is still awaiting settlement.
        if method == "MOBILE_MONEY" and (
            payout.mpesa_conversation_id or payout.mpesa_originator_conversation_id
        ) and not payout.mpesa_transaction_id:
            return Response(
                {
                    "error": "M-Pesa payout is already submitted and awaiting provider confirmation.",
                    "reference": payout.reference,
                    "retryable": False,
                },
                status=409,
            )

        if method == "BANK_TRANSFER" and payout.kcb_transaction_reference:
            kcb_status = (payout.kcb_provider_status or "").upper()
            if kcb_status in {"SUBMITTED", "PENDING", "PROCESSING", "IN_PROGRESS", ""}:
                return Response(
                    {
                        "error": "Bank payout is already submitted and awaiting bank confirmation.",
                        "reference": payout.reference,
                        "retryable": False,
                    },
                    status=409,
                )

        if method == "PAYPAL" and (
            payout.paypal_batch_id or payout.paypal_payout_item_id
        ) and not payout.paid:
            return Response(
                {
                    "error": "PayPal payout is already submitted and awaiting provider confirmation.",
                    "reference": payout.reference,
                    "retryable": False,
                },
                status=409,
            )

        if method == "MOBILE_MONEY":
            response = call_mpesa_b2c(vendor, amount, mpesa_config, payout=payout)
        elif method == "PAYPAL":
            response = call_paypal_payout(payout, vendor.paypal_email, amount, paypal_config)
        elif method == "BANK_TRANSFER":
            response = call_bank_transfer(vendor.bank_account_number, amount, payout=payout)
        else:
            return Response({"error": f"Unknown payment method: {method}"}, status=400)

        if response.get("success"):
            
            return Response({
                "message": (
                    "Payout submitted to PayPal; awaiting provider confirmation."
                    if method == "PAYPAL"
                    else ("Payout submitted to M-Pesa; awaiting provider confirmation." if method == "MOBILE_MONEY" else "Bank payout submitted; awaiting bank confirmation.")
                ),
                "reference": payout.reference,
                "amount": float(amount),
                "response": response,
            }, status=202)

        else:
            if method == "PAYPAL" and response.get("retryable"):
                return Response({
                    "error": response.get(
                        "error",
                        "PayPal payout status is ambiguous; reconcile before retrying.",
                    ),
                    "retryable": True,
                    "reference": payout.reference,
                }, status=202)

            return Response({
                "error": response.get("error", "Payment failed."),
                "response": response,
            }, status=400)

    except Exception as e:
        return Response({
            "error": f"Exception during payment: {str(e)}"
        }, status=500)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def reconcile_bank_vendor_payout(request, reference):
    """Reconcile one bank payout from the configured KCB status API."""
    payout = VendorPayout.objects.filter(reference=reference).first()
    if not payout:
        return Response({"error": "Payout reference not found."}, status=404)

    if payout.vendor.payment_method != "BANK_TRANSFER":
        return Response({"error": "Payout is not configured for bank transfer."}, status=400)

    try:
        payout = reconcile_kcb_payout(payout.id)
    except requests.RequestException:
        return Response({"error": "KCB reconciliation request failed."}, status=502)
    except ValueError:
        return Response({"error": "KCB payout reconciliation is not configured or correlated."}, status=409)
    except Exception:
        logger.exception(
            "Unexpected KCB payout reconciliation failure.",
            extra={"payout_reference": reference},
        )
        return Response({"error": "KCB payout reconciliation failed."}, status=500)

    return Response({
        "reference": payout.reference,
        "paid": payout.paid,
        "paid_at": payout.paid_at,
        "kcb_status": payout.kcb_provider_status,
        "kcb_transaction_reference": payout.kcb_transaction_reference,
        "kcb_provider_reference": payout.kcb_provider_reference,
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def reconcile_single_vendor_payout(request, reference):
    """Reconcile one PayPal payout from PayPal's authoritative batch state."""
    payout = VendorPayout.objects.filter(reference=reference).first()
    if not payout:
        return Response({"error": "Payout reference not found."}, status=404)

    if payout.vendor.payment_method != "PAYPAL":
        return Response(
            {"error": "Payout is not configured for PayPal."},
            status=400,
        )

    try:
        payout = reconcile_paypal_payout(payout.id)
    except requests.RequestException:
        return Response(
            {"error": "PayPal reconciliation request failed."},
            status=502,
        )
    except (ValueError, VendorPayout.DoesNotExist):
        return Response(
            {"error": "PayPal payout could not be reconciled."},
            status=409,
        )
    except Exception:
        logger.exception(
            "Unexpected PayPal payout reconciliation failure.",
            extra={"payout_reference": reference},
        )
        return Response(
            {"error": "PayPal payout reconciliation failed."},
            status=500,
        )

    return Response({
        "reference": payout.reference,
        "paid": payout.paid,
        "paid_at": payout.paid_at,
        "paypal_status": payout.paypal_transaction_status,
        "paypal_transaction_id": payout.paypal_transaction_id,
        "paypal_payout_item_id": payout.paypal_payout_item_id,
        "paypal_batch_id": payout.paypal_batch_id,
    })
