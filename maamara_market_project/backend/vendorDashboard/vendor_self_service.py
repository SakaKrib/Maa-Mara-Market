"""Vendor self-service: profile edits and payout (payment) details.

Profile edits can never touch payment details, the vendor code or login
identity. Payment details live in their own endpoint; saving a changed payout
destination goes through ``Vendor.save()`` which starts the cooling-off hold.
"""
import json
import logging
import re

from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from order.Base import IsVendor
from rest_framework.permissions import IsAuthenticated
from ReactSerializers.models import Brand
from ReactSerializers.Serializers import VendorSerializer
from vendorDashboard.models import Vendor
from vendorDashboard.payout.services import payout_guard

logger = logging.getLogger(__name__)

PROFILE_TEXT_FIELDS = (
    "first_name", "middle_name", "surname_name", "email", "phone_number",
    "id_number", "address", "address_2", "city", "country", "company_name",
    "workshop_location", "product_type", "product_description", "website_url",
)
PROFILE_BOOL_FIELDS = ("is_food", "Are_You_KEBS_certified")
REQUIRED_PROFILE_FIELDS = ("first_name", "surname_name", "email", "phone_number")

PAYMENT_FIELDS = (
    "payment_method", "bank_name", "bank_branch", "bank_account_name",
    "bank_account_number", "bank_swift_code", "bank_iban", "bank_country",
    "bank_currency", "intermediary_bank_name", "intermediary_swift_code",
    "mpesa_type", "mpesa_number", "mpesa_till", "mpesa_paybill",
    "mpesa_paybill_account", "paypal_email", "tax_number",
)
METHODS = {"BANK_TRANSFER", "MOBILE_MONEY", "PAYPAL"}
MPESA_TYPES = {"PHONE", "TILL", "LIPA_NA_MPESA"}


def _truthy(value):
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _own_vendor(request):
    return Vendor.objects.select_related("brand").get(user=request.user)


def _bad(detail=None, errors=None):
    body = {"detail": detail or "Please correct the highlighted details."}
    if errors:
        body["errors"] = errors
    return Response(body, status=status.HTTP_400_BAD_REQUEST)


class VendorProfileUpdateView(APIView):
    """PATCH /api/vendor-update-profile/<pk>/ — a vendor edits only their own profile."""

    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @transaction.atomic
    def patch(self, request, pk):
        vendor = _own_vendor(request)
        if vendor.pk != int(pk):
            return Response({"detail": "You can only edit your own profile."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        errors = {}
        updates = {}
        for field in PROFILE_TEXT_FIELDS:
            if field in data:
                updates[field] = str(data.get(field) or "").strip()
        for field in REQUIRED_PROFILE_FIELDS:
            if field in updates and not updates[field]:
                errors[field] = "This field is required."
        if updates.get("email"):
            try:
                validate_email(updates["email"])
            except DjangoValidationError:
                errors["email"] = "Enter a valid email address."
            else:
                if Vendor.objects.filter(email__iexact=updates["email"]).exclude(pk=vendor.pk).exists():
                    errors["email"] = "That email is already used by another vendor."
        if updates.get("id_number") and Vendor.objects.filter(id_number=updates["id_number"]).exclude(pk=vendor.pk).exists():
            errors["id_number"] = "That ID number is already registered."
        if errors:
            return _bad(errors=errors)

        for field, value in updates.items():
            setattr(vendor, field, value)
        for field in PROFILE_BOOL_FIELDS:
            if field in data:
                setattr(vendor, field, _truthy(data.get(field)))
        if request.FILES.get("profile_picture"):
            vendor.profile_picture = request.FILES["profile_picture"]
        company_logo = request.FILES.get("company_logo") or request.FILES.get("vendor_company_logo")
        if company_logo:
            vendor.vendor_company_logo = company_logo

        brand_payload = data.get("brand")
        if isinstance(brand_payload, str):
            try:
                brand_payload = json.loads(brand_payload)
            except ValueError:
                brand_payload = None
        if not isinstance(brand_payload, dict):
            brand_payload = {}
        brand_name = str(data.get("brand_name") or brand_payload.get("name") or "").strip()
        brand_description = data.get("brand_description", brand_payload.get("description"))
        brand_logo = request.FILES.get("brand_logo")
        if vendor.brand_id is None and (brand_name or brand_logo):
            if not brand_name:
                return _bad(errors={"brand_name": "Enter a brand name before adding a brand logo."})
            brand = Brand.objects.filter(name__iexact=brand_name).first()
            if brand and Vendor.objects.filter(brand=brand).exclude(pk=vendor.pk).exists():
                return _bad(errors={"brand_name": "That brand name is already taken."})
            vendor.brand = brand or Brand.objects.create(name=brand_name)
        if vendor.brand_id is not None:
            brand = vendor.brand
            if brand_name and brand_name != brand.name:
                if Brand.objects.filter(name__iexact=brand_name).exclude(pk=brand.pk).exists():
                    return _bad(errors={"brand_name": "That brand name is already taken."})
                brand.name = brand_name
            if brand_description is not None:
                brand.description = str(brand_description).strip()
            if brand_logo:
                brand.logo = brand_logo
            brand.save()

        vendor.save()
        vendor.refresh_from_db()
        return Response(VendorSerializer(vendor, context={"request": request}).data)


def _payment_snapshot(vendor):
    until = payout_guard.destination_hold_until(vendor)
    snapshot = {field: getattr(vendor, field) or "" for field in PAYMENT_FIELDS}
    snapshot.update({
        "hold_hours": payout_guard.hold_hours(),
        "hold_until": until.isoformat() if until else None,
    })
    return snapshot


def validate_payment_details(merged):
    """Return {field: message} for the merged (current + submitted) values."""
    errors = {}
    method = str(merged.get("payment_method") or "").upper()
    if method not in METHODS:
        errors["payment_method"] = "Choose a payment method."
        return errors

    def need(field, label):
        if not str(merged.get(field) or "").strip():
            errors[field] = f"{label} is required."

    if method == "BANK_TRANSFER":
        need("bank_name", "Bank name")
        need("bank_account_name", "Account name")
        need("bank_account_number", "Account number")
        iban = re.sub(r"\s+", "", str(merged.get("bank_iban") or ""))
        if iban and not re.fullmatch(r"[A-Za-z]{2}\d{2}[A-Za-z0-9]{8,30}", iban):
            errors["bank_iban"] = "Enter a valid IBAN."
        swift = str(merged.get("bank_swift_code") or "").strip()
        if swift and not re.fullmatch(r"[A-Za-z0-9]{8}|[A-Za-z0-9]{11}", swift):
            errors["bank_swift_code"] = "SWIFT/BIC must be 8 or 11 characters."
    elif method == "MOBILE_MONEY":
        mtype = str(merged.get("mpesa_type") or "").upper()
        if mtype not in MPESA_TYPES:
            errors["mpesa_type"] = "Choose an M-Pesa type."
        elif mtype == "PHONE":
            digits = re.sub(r"\D", "", str(merged.get("mpesa_number") or ""))
            if not re.fullmatch(r"(?:254|0)?[17]\d{8}", digits):
                errors["mpesa_number"] = "Enter a valid Safaricom number, e.g. 0712345678."
        elif mtype == "TILL":
            if not re.fullmatch(r"\d{5,8}", str(merged.get("mpesa_till") or "").strip()):
                errors["mpesa_till"] = "Enter a valid Till number (digits only)."
        else:
            if not re.fullmatch(r"\d{5,8}", str(merged.get("mpesa_paybill") or "").strip()):
                errors["mpesa_paybill"] = "Enter a valid Paybill number (digits only)."
            account = str(merged.get("mpesa_paybill_account") or "").strip()
            if not account:
                errors["mpesa_paybill_account"] = "Paybill account number is required."
            elif len(account) > 13:
                errors["mpesa_paybill_account"] = "Account number can be at most 13 characters."
    else:
        email = str(merged.get("paypal_email") or "").strip()
        try:
            validate_email(email)
        except DjangoValidationError:
            errors["paypal_email"] = "Enter a valid PayPal email address."
    return errors


def _mask(value):
    value = str(value or "").strip()
    return value if len(value) <= 4 else "*" * (len(value) - 4) + value[-4:]


def _destination_label(vendor):
    method = (vendor.payment_method or "").upper()
    if method == "BANK_TRANSFER":
        return f"Bank transfer - {vendor.bank_name or 'bank'} account {_mask(vendor.bank_account_number)}"
    if method == "PAYPAL":
        return "PayPal"
    mtype = (vendor.mpesa_type or "").upper()
    if mtype == "TILL":
        return f"M-Pesa Till {_mask(vendor.mpesa_till)}"
    if mtype == "LIPA_NA_MPESA":
        return f"M-Pesa Paybill {_mask(vendor.mpesa_paybill)}"
    return f"M-Pesa {_mask(vendor.mpesa_number)}"


def notify_destination_changed(vendor, hold_hours, hold_until):
    """Email the vendor (and their login address) that payout details changed.

    Never raises: a mail failure must not undo a saved change.
    """
    recipients = {addr for addr in (vendor.email, getattr(vendor.user, "email", "")) if addr}
    if not recipients:
        return False
    until = hold_until.strftime("%d %b %Y, %H:%M UTC") if hold_until else f"{hold_hours} hours"
    name = vendor.first_name or vendor.company_name or "vendor"
    body = (
        f"Hello {name},\n\n"
        f"The payout details on your Maa Mara Market vendor account were just changed.\n\n"
        f"New destination: {_destination_label(vendor)}\n"
        f"For your security, payouts to new details are held until {until}. "
        f"If a payout date arrives before then, it will be postponed.\n\n"
        f"If you did not make this change, sign in and change your password immediately, "
        f"then contact Maa Mara support.\n\n"
        f"Maa Mara Market"
    )
    try:
        send_mail(
            "Your payout details were changed",
            body,
            getattr(settings, "DEFAULT_FROM_EMAIL", None),
            sorted(recipients),
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Could not send payout-destination change email for vendor %s", vendor.pk)
        return False


class VendorPaymentDetailsView(APIView):
    """GET/PATCH /api/vendor/payment-details/ — payout destination + tax number."""

    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        return Response(_payment_snapshot(_own_vendor(request)))

    @transaction.atomic
    def patch(self, request):
        vendor = Vendor.objects.select_for_update().get(user=request.user)
        merged = {field: getattr(vendor, field) or "" for field in PAYMENT_FIELDS}
        for field in PAYMENT_FIELDS:
            if field in request.data:
                merged[field] = str(request.data.get(field) or "").strip()
        merged["payment_method"] = str(merged["payment_method"]).upper()
        merged["mpesa_type"] = str(merged["mpesa_type"]).upper()

        errors = validate_payment_details(merged)
        if errors:
            return _bad(errors=errors)

        before = payout_guard.destination_fingerprint(vendor)
        for field in PAYMENT_FIELDS:
            setattr(vendor, field, merged[field] or None)
        vendor.save()
        changed = payout_guard.destination_fingerprint(vendor) != before
        vendor.refresh_from_db()
        body = _payment_snapshot(vendor)
        body["destination_changed"] = changed
        if changed:
            until = payout_guard.destination_hold_until(vendor)
            transaction.on_commit(lambda: notify_destination_changed(vendor, body["hold_hours"], until))
        body["detail"] = (
            f"Payment details saved. Payouts to the new destination are held for {body['hold_hours']} hours."
            if changed else "Payment details saved."
        )
        return Response(body)
