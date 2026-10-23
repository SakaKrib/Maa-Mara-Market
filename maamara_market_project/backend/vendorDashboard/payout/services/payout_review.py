"""Read-only, server-authoritative payout review for the admin payment screens.

Every value shown on the Review & pay / bulk payment pages comes from here, from
the database (VendorPayout + Vendor). Nothing is taken from the browser, and the
payment endpoints themselves already re-read the same records, so an admin can
neither see nor submit a destination or amount that differs from what is saved.
"""
import re
from collections import defaultdict
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from vendorDashboard.models import Vendor, VendorPayout
from vendorDashboard.payout.services.payment_processors import get_vendor_mpesa_type
from vendorDashboard.payout.services.payout_guard import describe_security, sync_destination_state

METHOD_LABELS = {
    "MOBILE_MONEY": "M-Pesa",
    "PAYPAL": "PayPal",
    "BANK_TRANSFER": "Bank transfer",
}
MPESA_TYPE_LABELS = {
    "PHONE": "Phone number",
    "TILL": "Buy Goods / Till number",
    "LIPA_NA_MPESA": "Paybill number",
}

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _clean(value):
    return str(value).strip() if value not in (None, "") else ""


def _normalize_msisdn(value):
    digits = re.sub(r"\D", "", _clean(value))
    if digits.startswith("0") and len(digits) == 10:
        return "254" + digits[1:]
    if len(digits) == 9 and digits[0] in "17":
        return "254" + digits
    return digits


MPESA_ROUTES = {
    "PHONE": "Send money to a phone number (Daraja B2C, BusinessPayment)",
    "TILL": "Pay to a Buy Goods Till (Daraja B2B, BusinessBuyGoods)",
    "LIPA_NA_MPESA": "Pay to a Paybill and account (Daraja B2B, BusinessPayBill)",
}


def _mpesa_config_problems(mpesa_type):
    """Tell the admin up front if the server cannot yet make this kind of M-Pesa payment."""
    mpesa = settings.PAYMENT_GATEWAYS.get("mpesa", {})
    b2c = mpesa.get("b2c", {})
    if mpesa_type == "PHONE":
        keys = ["url", "initiator_name", "short_code", "initiator_password", "certificate_path", "result_url", "timeout_url"]
        missing = [k for k in keys if not b2c.get(k)]
        product = "B2C (phone number)"
    else:
        b2b = mpesa.get("b2b", {})
        missing = []
        for key in ["url", "initiator_name", "short_code", "initiator_password", "certificate_path", "result_url", "timeout_url"]:
            value = b2b.get(key)
            if not value and key in {"initiator_name", "short_code", "initiator_password", "certificate_path"}:
                value = b2c.get(key)
            if not value:
                missing.append(key)
        product = "B2B (Till / Paybill)"
    if missing:
        env_names = {
            "url": "MPESA_B2B_URL" if mpesa_type != "PHONE" else "MPESA_URL",
            "initiator_name": "MPESA_B2B_INITIATOR_NAME" if mpesa_type != "PHONE" else "MPESA_INITIATOR_NAME",
            "short_code": "MPESA_B2B_SHORT_CODE" if mpesa_type != "PHONE" else "MPESA_SHORT_CODE",
            "initiator_password": "MPESA_B2B_INITIATOR_PASSWORD" if mpesa_type != "PHONE" else "MPESA_INITIATOR_PASSWORD",
            "certificate_path": "MPESA_B2B_CERTIFICATE_PATH" if mpesa_type != "PHONE" else "MPESA_CERTIFICATE_PATH",
            "result_url": "MPESA_B2B_RESULT_URL" if mpesa_type != "PHONE" else "MPESA_B2C_RESULT_URL",
            "timeout_url": "MPESA_B2B_TIMEOUT_URL" if mpesa_type != "PHONE" else "MPESA_B2C_TIMEOUT_URL",
        }
        names = ", ".join(f"{k} ({env_names[k]})" for k in missing)
        return [f"M-Pesa {product} is not configured on the server (missing: {names})."]
    return []


def _mpesa_destination(vendor):
    mpesa_type = get_vendor_mpesa_type(vendor)
    # Show only what identifies the destination: phone number; Till number; or
    # Paybill number with its account number. The labels already say which kind it is.
    fields = []
    if mpesa_type not in {"PHONE", "TILL", "LIPA_NA_MPESA"}:
        fields.append(("M-Pesa destination", "Not saved"))
    problems = []
    value = ""

    if mpesa_type == "PHONE":
        value = _normalize_msisdn(vendor.mpesa_number)
        fields.append(("M-Pesa phone number", value or "Not saved"))
        if not re.fullmatch(r"254[17]\d{8}", value or ""):
            problems.append("The saved M-Pesa phone number is missing or not a valid Kenyan number.")
    elif mpesa_type == "TILL":
        value = re.sub(r"\D", "", _clean(vendor.mpesa_till))
        fields.append(("Buy Goods / Till number", value or "Not saved"))
        if not re.fullmatch(r"\d{5,20}", value or ""):
            problems.append("The saved Till number is missing or invalid.")
    elif mpesa_type == "LIPA_NA_MPESA":
        value = re.sub(r"\D", "", _clean(vendor.mpesa_paybill))
        fields.append(("Paybill number", value or "Not saved"))
        if not re.fullmatch(r"\d{5,20}", value or ""):
            problems.append("The saved Paybill number is missing or invalid.")
        account = _clean(getattr(vendor, "mpesa_paybill_account", ""))
        fields.append(("Paybill account number", account or "Not saved"))
        if not account:
            problems.append("This vendor has not saved the account number to credit at their Paybill.")
    else:
        problems.append("This vendor has no saved M-Pesa phone, Till or Paybill number.")

    if mpesa_type:
        problems.extend(_mpesa_config_problems(mpesa_type))

    return {"type": mpesa_type, "value": value, "fields": fields}, problems


def _paypal_destination(vendor):
    email = _clean(vendor.paypal_email)
    problems = [] if _EMAIL_RE.match(email) else ["This vendor has no valid saved PayPal email."]
    return {
        "type": "PAYPAL",
        "value": email,
        "fields": [
            ("PayPal email", email or "Not saved"),
            ("Paid in", "USD (converted from KES at the live rate)"),
        ],
    }, problems


def _bank_destination(vendor):
    account = _clean(vendor.bank_account_number)
    fields = [
        ("Bank name", _clean(vendor.bank_name) or "Not saved"),
        ("Bank branch", _clean(vendor.bank_branch) or "Not saved"),
        ("Account name", _clean(vendor.bank_account_name) or "Not saved"),
        ("Account number", account or "Not saved"),
    ]
    for label, attr in (
        ("SWIFT / BIC", "bank_swift_code"),
        ("IBAN", "bank_iban"),
        ("Bank country", "bank_country"),
        ("Bank currency", "bank_currency"),
        ("Intermediary bank", "intermediary_bank_name"),
        ("Intermediary SWIFT", "intermediary_swift_code"),
    ):
        value = _clean(getattr(vendor, attr, ""))
        if value:
            fields.append((label, value))
    problems = [] if len(account) >= 6 else ["This vendor has no valid saved bank account number."]
    return {"type": "BANK_TRANSFER", "value": account, "fields": fields}, problems


def _pending_problem(payout, method):
    """Mirror the duplicate-submission guards in pay_single_vendor_payout."""
    if method == "MOBILE_MONEY":
        desc = payout.mpesa_result_desc or ""
        if desc.startswith("B2B submission outcome unknown") or desc.startswith(
            "B2B submission response lacked correlation IDs"
        ):
            return "M-Pesa B2B outcome is uncertain. Reconcile with Safaricom before retrying."
        if (payout.mpesa_conversation_id or payout.mpesa_originator_conversation_id) and payout.mpesa_result_code is None:
            return "Already submitted to M-Pesa; awaiting confirmation."
    if method == "BANK_TRANSFER" and payout.kcb_transaction_reference:
        if (payout.kcb_provider_status or "").upper() in {"SUBMITTED", "PENDING", "PROCESSING", "IN_PROGRESS", ""}:
            return "Already submitted to the bank; awaiting confirmation."
    if method == "PAYPAL" and (payout.paypal_batch_id or payout.paypal_payout_item_id):
        if (payout.paypal_transaction_status or "").upper() in {"", "PENDING", "UNCLAIMED", "ONHOLD", "BLOCKED"}:
            return "Already submitted to PayPal; awaiting confirmation."
    return ""


def _destination_summary(method, destination, vendor):
    value = destination.get("value") or ""
    mpesa_type = destination.get("type")
    if method == "MOBILE_MONEY":
        if mpesa_type == "LIPA_NA_MPESA":
            account = _clean(getattr(vendor, "mpesa_paybill_account", "")) or "no account saved"
            return f"Paybill {value or 'not saved'} · Account {account}"
        if mpesa_type == "TILL":
            return f"Buy Goods Till {value or 'not saved'}"
        if mpesa_type == "PHONE":
            return f"Phone {value or 'not saved'}"
        return "No M-Pesa destination saved"
    if method == "PAYPAL":
        return f"PayPal {value or 'not saved'}"
    if method == "BANK_TRANSFER":
        bank = _clean(vendor.bank_name)
        return f"{bank + ' · ' if bank else ''}Account {value or 'not saved'}"
    return "No payment destination saved"


def _other_vendors_with_same_destination(vendor, method, destination):
    """Names of other vendors that saved the very same payout destination (a fraud signal)."""
    value = destination.get("value") or ""
    if not value:
        return []
    others = Vendor.objects.exclude(pk=vendor.pk)
    if method == "MOBILE_MONEY":
        mpesa_type = destination.get("type")
        if mpesa_type == "PHONE":
            others = others.filter(mpesa_number__endswith=value[-9:])
        elif mpesa_type == "TILL":
            others = others.filter(mpesa_till=value)
        elif mpesa_type == "LIPA_NA_MPESA":
            others = others.filter(
                mpesa_paybill=value,
                mpesa_paybill_account=_clean(getattr(vendor, "mpesa_paybill_account", "")),
            )
        else:
            return []
    elif method == "PAYPAL":
        others = others.filter(paypal_email__iexact=value)
    elif method == "BANK_TRANSFER":
        others = others.filter(bank_account_number=value)
    else:
        return []
    return list(others.values_list("company_name", flat=True)[:3])


def _unusual_signals(payout, vendor, method, destination, amount):
    """Non-blocking things an admin should look at before paying."""
    warnings = []
    shared = _other_vendors_with_same_destination(vendor, method, destination)
    if shared:
        warnings.append(
            "The same payout destination is also saved for: " + ", ".join(shared) + "."
        )
    previous = list(
        VendorPayout.objects.filter(vendor=vendor, paid=True)
        .exclude(pk=payout.pk)
        .order_by("-payout_period_end")
        .values_list("amount", flat=True)[:6]
    )
    if previous:
        average = sum(previous, Decimal("0")) / len(previous)
        if average > 0 and amount > average * 3:
            warnings.append(
                f"This amount is {amount / average:.1f}× this vendor's recent average payout (KES {average:,.2f})."
            )
    return warnings


def build_payout_review(payout, viewer=None):
    vendor = payout.vendor
    method = vendor.payment_method

    if method == "MOBILE_MONEY":
        destination, problems = _mpesa_destination(vendor)
    elif method == "PAYPAL":
        destination, problems = _paypal_destination(vendor)
    elif method == "BANK_TRANSFER":
        destination, problems = _bank_destination(vendor)
    else:
        destination, problems = {"type": "", "value": "", "fields": []}, [f"Unknown payment method: {method}"]

    amount = payout.amount if payout.amount is not None else Decimal("0")
    notes = []
    if method == "MOBILE_MONEY" and amount > 0 and amount != amount.to_integral_value():
        notes.append(
            f"M-Pesa pays whole shillings: KES {amount:.2f} will be sent as KES {int(amount)}."
        )
    if amount <= 0:
        problems.append("The payout amount must be greater than zero.")
    if not vendor.is_active:
        problems.append("This vendor is inactive and cannot receive a payout.")

    warnings = _unusual_signals(payout, vendor, method, destination, amount) if amount > 0 else []

    pending = _pending_problem(payout, method)
    if pending and not payout.paid:
        problems.append(pending)

    if not payout.paid:
        from vendorDashboard.payout.services.weekly_payouts import payout_blocked_by_batch

        batch_reason = payout_blocked_by_batch(payout)
        if batch_reason:
            problems.append(batch_reason)

    # Safeguards: destination cooling-off, in-flight sends and two-admin approval.
    sync_destination_state(vendor)
    security = describe_security(payout, viewer)
    action = "send"
    if not payout.paid:
        hold = security["destination_hold"]
        if hold["active"]:
            problems.append(
                "Payout details changed recently, so payment is held until "
                f"{timezone.localtime(parse_datetime(hold['until'])):%d %b %Y %H:%M}. Confirm the change with the vendor."
            )
        if security["send_in_progress"]:
            problems.append(
                "A send is in progress or did not finish. Reconcile with the provider before sending again."
            )
        approval = security["approval"]
        if approval["required"]:
            if approval["state"] == "awaiting_second_admin":
                if approval.get("requested_by_you"):
                    action = "wait_for_other_admin"
                    notes.append("You requested approval. A different admin must approve and send this payout.")
                else:
                    action = "approve_and_send"
                    notes.append(f"{approval['requested_by'] or 'Another admin'} requested this payout. You can approve and send it.")
            else:
                action = "request_approval"
                notes.append(
                    f"Payouts of KES {Decimal(security['two_person_threshold']):,.0f} or more need two admins: "
                    "you request, a different admin approves and sends."
                )

    # The provider's last definite answer, so the admin sees why a send did not go through.
    provider_failure = ""
    if not payout.paid and method == "MOBILE_MONEY" and payout.mpesa_result_code not in (None, 0):
        provider_failure = f"M-Pesa could not complete the last attempt: {payout.mpesa_result_desc or 'no reason given'}."

    receipt = ""
    if method == "MOBILE_MONEY":
        receipt = payout.mpesa_transaction_id or ""
    elif method == "PAYPAL":
        receipt = payout.paypal_transaction_id or ""
    elif method == "BANK_TRANSFER":
        receipt = payout.kcb_provider_reference or payout.kcb_transaction_reference or ""

    if payout.paid:
        state = "paid"
    elif pending:
        state = "submitted"
    elif problems:
        state = "blocked"
    else:
        state = "ready"

    return {
        "reference": payout.reference,
        "state": state,
        "paid": payout.paid,
        "paid_at": payout.paid_at,
        "amount": f"{amount:.2f}",
        "currency": "KES",
        "gross_sales": f"{payout.gross_sales:.2f}",
        "adjustment_amount": f"{payout.adjustment_amount:.2f}",
        "period_start": payout.payout_period_start,
        "period_end": payout.payout_period_end,
        "payment_method": method,
        "payment_method_label": METHOD_LABELS.get(method, method),
        "vendor": {
            "id": vendor.id,
            "company_name": vendor.company_name,
            "email": vendor.email,
            "is_active": vendor.is_active,
        },
        "destination": {
            "type": destination["type"],
            "value": destination["value"],
            "summary": _destination_summary(method, destination, vendor),
            "fields": [{"label": label, "value": value} for label, value in destination["fields"]],
        },
        "problems": problems,
        "notes": notes,
        "warnings": warnings,
        "provider_failure": provider_failure,
        "receipt": receipt,
        "submitted_at": payout.initiated_at if pending and not payout.paid else None,
        "can_pay": state == "ready" and action != "wait_for_other_admin",
        "action": action,
        "security": security,
    }


def _summary(items):
    ready = [i for i in items if i["can_pay"]]
    total = lambda rows: f"{sum((Decimal(i['amount']) for i in rows), Decimal('0')):.2f}"
    return {
        "count": len(items),
        "ready_count": len(ready),
        "total_amount": total(items),
        "ready_amount": total(ready),
    }


@api_view(["GET"])
@permission_classes([IsAdminUser])
def payout_review_single(request, reference):
    payout = VendorPayout.objects.select_related("vendor").filter(reference=reference).first()
    if not payout:
        return Response({"error": "Payout reference not found."}, status=404)
    return Response(build_payout_review(payout, request.user))


@api_view(["GET"])
@permission_classes([IsAdminUser])
def payout_review_group(request):
    """Unpaid payouts of the current period for one payment method (the exact set "Pay all" submits)."""
    method = request.query_params.get("payment_method", "")
    if method not in METHOD_LABELS:
        return Response({"error": "A valid payment_method is required."}, status=400)

    today = timezone.now().date()
    start_date = today.replace(day=1)
    end_date = (start_date + relativedelta(months=1)) - relativedelta(days=1)

    payouts = (
        VendorPayout.objects.select_related("vendor")
        .filter(
            payout_period_start=start_date,
            payout_period_end=end_date,
            paid=False,
            vendor__payment_method=method,
        )
        .order_by("vendor__company_name")
    )
    items = [build_payout_review(p, request.user) for p in payouts]
    return Response({
        "payment_method": method,
        "payment_method_label": METHOD_LABELS[method],
        "period": f"{start_date} → {end_date}",
        "items": items,
        "summary": _summary(items),
    })
