"""Safeguards around sending vendor money.

* Every send, approval request, block and reconciliation is written to
  ``PayoutAuditLog`` together with who did it and from which address.
* Large payouts need two different admins (one requests, one approves and sends).
* A changed payout destination is held for a cooling-off period.
* The provider is never called inside a database transaction: ``gate_send``
  commits an "in progress" marker first, and ``release_send`` clears it once the
  provider has given a definite answer. If the process dies mid-call the marker
  stays set, which blocks a blind second send until the payout is reconciled.

Nothing here trusts the browser: amounts and destinations are read from the
database, and the acting admin comes from the authenticated request.
"""
import hashlib
import logging
import re
from dataclasses import dataclass, field
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

# Machine-readable reasons returned to the admin screens.
SEND_IN_PROGRESS = "SEND_IN_PROGRESS"
DESTINATION_HOLD = "DESTINATION_HOLD"
APPROVAL_REQUESTED = "APPROVAL_REQUESTED"
SECOND_ADMIN_REQUIRED = "SECOND_ADMIN_REQUIRED"


@dataclass
class Gate:
    ok: bool
    status: int = 200
    code: str = ""
    message: str = ""
    extra: dict = field(default_factory=dict)

    def body(self):
        data = {"error" if not self.extra.get("awaiting_approval") else "message": self.message, "code": self.code}
        data.update(self.extra)
        return data


# --------------------------------------------------------------------------
# Destination fingerprint and hold
# --------------------------------------------------------------------------
def _clean(value):
    return str(value).strip() if value not in (None, "") else ""


def _msisdn(value):
    digits = re.sub(r"\D", "", _clean(value))
    if digits.startswith("0") and len(digits) == 10:
        return "254" + digits[1:]
    if len(digits) == 9 and digits[0] in "17":
        return "254" + digits
    return digits


def destination_fingerprint(vendor):
    """Stable hash of everything that decides where this vendor's money goes."""
    method = _clean(vendor.payment_method).upper()
    parts = [method]
    if method == "MOBILE_MONEY":
        mpesa_type = _clean(vendor.mpesa_type).upper()
        parts.append(mpesa_type)
        if mpesa_type == "PHONE":
            parts.append(_msisdn(vendor.mpesa_number))
        elif mpesa_type == "TILL":
            parts.append(_clean(vendor.mpesa_till))
        elif mpesa_type == "LIPA_NA_MPESA":
            parts += [_clean(vendor.mpesa_paybill), _clean(vendor.mpesa_paybill_account)]
    elif method == "PAYPAL":
        parts.append(_clean(vendor.paypal_email).lower())
    elif method == "BANK_TRANSFER":
        parts += [
            _clean(vendor.bank_name),
            _clean(vendor.bank_branch),
            _clean(vendor.bank_account_name),
            re.sub(r"\s+", "", _clean(vendor.bank_account_number)),
            _clean(vendor.bank_swift_code).upper(),
            re.sub(r"\s+", "", _clean(vendor.bank_iban)).upper(),
            _clean(vendor.bank_country),
        ]
    return hashlib.sha256("\x1f".join(parts).encode()).hexdigest()


def refresh_destination_state(vendor):
    """Update the in-memory hash/change time. Returns True if anything changed.

    The first fingerprint of a vendor (including existing vendors that predate
    this feature) is recorded without a hold; only later changes start one.
    """
    fingerprint = destination_fingerprint(vendor)
    if vendor.payout_destination_hash == fingerprint:
        return False
    first_time = not vendor.payout_destination_hash
    vendor.payout_destination_hash = fingerprint
    if not first_time:
        vendor.payout_destination_changed_at = timezone.now()
    return True


def sync_destination_state(vendor):
    """Like refresh_destination_state but also persists, for edits that bypassed save()."""
    if refresh_destination_state(vendor):
        type(vendor).objects.filter(pk=vendor.pk).update(
            payout_destination_hash=vendor.payout_destination_hash,
            payout_destination_changed_at=vendor.payout_destination_changed_at,
        )
        return True
    return False


def hold_hours():
    return int(getattr(settings, "PAYOUT_DESTINATION_HOLD_HOURS", 48))


def destination_hold_until(vendor, now=None):
    now = now or timezone.now()
    changed = vendor.payout_destination_changed_at
    if not changed:
        return None
    until = changed + timedelta(hours=hold_hours())
    return until if until > now else None


# --------------------------------------------------------------------------
# Two-person rule
# --------------------------------------------------------------------------
def two_person_threshold():
    try:
        return Decimal(str(getattr(settings, "PAYOUT_TWO_PERSON_THRESHOLD", 50000)))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def requires_two_person(amount):
    try:
        return Decimal(str(amount)) >= two_person_threshold()
    except (InvalidOperation, ValueError):
        return True


def approval_valid_hours():
    return int(getattr(settings, "PAYOUT_APPROVAL_VALID_HOURS", 24))


def pending_approval_is_valid(payout, now=None):
    now = now or timezone.now()
    if not payout.approval_requested_by_id or not payout.approval_requested_at:
        return False
    if now - payout.approval_requested_at > timedelta(hours=approval_valid_hours()):
        return False
    if payout.approval_amount is None or payout.approval_amount != payout.amount:
        return False
    return payout.approval_destination_hash == payout.vendor.payout_destination_hash


# --------------------------------------------------------------------------
# Audit log
# --------------------------------------------------------------------------
def client_ip(request):
    """Best-effort caller address for the audit trail.

    The *last* X-Forwarded-For entry is the one our own reverse proxy appended;
    earlier entries are client-supplied and can be forged, so they are not used.
    """
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        candidate = forwarded.split(",")[-1].strip()
        if candidate:
            return candidate
    return request.META.get("REMOTE_ADDR") or None


def _valid_ip(value):
    if not value:
        return None
    try:
        import ipaddress
        ipaddress.ip_address(value)
        return value
    except ValueError:
        return None


def log_event(payout, action, actor=None, ip=None, **detail):
    from vendorDashboard.models import PayoutAuditLog

    return PayoutAuditLog.objects.create(
        payout=payout,
        action=action,
        actor=actor if getattr(actor, "pk", None) else None,
        ip_address=_valid_ip(ip),
        detail={key: (str(value) if isinstance(value, Decimal) else value) for key, value in detail.items()},
    )


def log_event_safely(payout, action, actor=None, ip=None, **detail):
    """For after-the-fact entries where a logging failure must not hide the outcome."""
    try:
        return log_event(payout, action, actor=actor, ip=ip, **detail)
    except Exception:
        logger.exception("Could not write payout audit entry", extra={"payout_id": getattr(payout, "pk", None), "action": action})
        return None


# --------------------------------------------------------------------------
# The gate
# --------------------------------------------------------------------------
def gate_send(payout, actor, ip=None):
    """Decide whether ``actor`` may send ``payout`` now.

    Must be called inside ``transaction.atomic()`` with the payout row locked.
    When it returns ``ok`` the in-progress marker and initiator details have
    been written; the caller commits, *then* contacts the provider, then calls
    ``release_send``.
    """
    now = timezone.now()
    vendor = payout.vendor
    sync_destination_state(vendor)
    method = vendor.payment_method

    if payout.send_in_progress:
        log_event(payout, "send_blocked_in_progress", actor, ip, started_at=payout.send_started_at.isoformat() if payout.send_started_at else None)
        return Gate(False, 409, SEND_IN_PROGRESS,
                    "A send for this payout is already in progress, or an earlier send did not finish. "
                    "Reconcile with the provider before sending again.",
                    {"retryable": False, "reference": payout.reference})

    hold_until = destination_hold_until(vendor, now)
    if hold_until:
        log_event(payout, "send_blocked_destination_hold", actor, ip, hold_until=hold_until.isoformat())
        return Gate(False, 423, DESTINATION_HOLD,
                    "This vendor changed their payout details recently. Payment is held until "
                    f"{timezone.localtime(hold_until):%d %b %Y %H:%M}. Contact the vendor to confirm the change.",
                    {"hold_until": hold_until.isoformat(), "reference": payout.reference})

    requested_by_id = None
    if requires_two_person(payout.amount):
        if not pending_approval_is_valid(payout, now):
            payout.approval_requested_by = actor
            payout.approval_requested_at = now
            payout.approval_amount = payout.amount
            payout.approval_destination_hash = vendor.payout_destination_hash
            payout.save(update_fields=[
                "approval_requested_by", "approval_requested_at",
                "approval_amount", "approval_destination_hash",
            ])
            log_event(payout, "approval_requested", actor, ip, amount=payout.amount, method=method)
            return Gate(False, 202, APPROVAL_REQUESTED,
                        "Approval requested. A different admin must approve and send this payout.",
                        {"awaiting_approval": True, "reference": payout.reference,
                         "requested_by": getattr(actor, "username", "")})
        if payout.approval_requested_by_id == getattr(actor, "pk", None):
            log_event(payout, "approval_blocked_same_admin", actor, ip)
            return Gate(False, 403, SECOND_ADMIN_REQUIRED,
                        "You requested this payout. A different admin must approve and send it.",
                        {"reference": payout.reference})
        requested_by_id = payout.approval_requested_by_id
        payout.approved_by = actor
        payout.approved_at = now
        payout.approval_requested_by = None
        payout.approval_requested_at = None
        payout.approval_amount = None
        payout.approval_destination_hash = ""

    payout.initiated_by = actor
    payout.initiated_at = now
    payout.initiated_ip = _valid_ip(ip)
    payout.send_in_progress = True
    payout.send_started_at = now
    payout.save(update_fields=[
        "initiated_by", "initiated_at", "initiated_ip", "send_in_progress", "send_started_at",
        "approved_by", "approved_at", "approval_requested_by", "approval_requested_at",
        "approval_amount", "approval_destination_hash",
    ])
    log_event(payout, "send_started", actor, ip, amount=payout.amount, method=method,
              destination=vendor.payout_destination_hash[:12], requested_by=requested_by_id)
    return Gate(True)


def gate_bulk_send(payout_id, actor, ip=None):
    """Lock one payout, re-check basic eligibility, and run the gate (own transaction)."""
    from vendorDashboard.models import VendorPayout

    with transaction.atomic():
        payout = (
            VendorPayout.objects.select_for_update(of=("self",))
            .select_related("vendor").filter(pk=payout_id).first()
        )
        if payout is None:
            return None, Gate(False, 404, "NOT_FOUND", "Payout not found.")
        if payout.paid:
            return payout, Gate(False, 200, "ALREADY_PAID", "Payout already paid.")
        if payout.amount is None or payout.amount <= 0:
            return payout, Gate(False, 400, "BAD_AMOUNT", "Payout amount must be greater than zero.")
        if not payout.vendor.is_active:
            return payout, Gate(False, 400, "VENDOR_INACTIVE", "Vendor is inactive.")
        return payout, gate_send(payout, actor, ip)


def release_send(payout_id, outcome, actor=None, ip=None, **detail):
    """Clear the in-progress marker after a *definite* provider answer."""
    from vendorDashboard.models import VendorPayout

    VendorPayout.objects.filter(pk=payout_id).update(send_in_progress=False)
    payout = VendorPayout.objects.filter(pk=payout_id).first()
    if payout is not None:
        log_event_safely(payout, "send_finished", actor, ip, outcome=outcome, **detail)


def mark_uncertain(payout_id, actor=None, ip=None, reason=""):
    """Leave the marker set: we do not know whether the provider acted."""
    from vendorDashboard.models import VendorPayout

    payout = VendorPayout.objects.filter(pk=payout_id).first()
    if payout is not None:
        log_event_safely(payout, "send_uncertain", actor, ip, reason=str(reason)[:200])


# --------------------------------------------------------------------------
# Read-only summary for the admin screens
# --------------------------------------------------------------------------
def describe_security(payout, viewer=None, now=None):
    now = now or timezone.now()
    vendor = payout.vendor
    hold_until = destination_hold_until(vendor, now)
    needs_two = requires_two_person(payout.amount)
    pending = needs_two and pending_approval_is_valid(payout, now)
    viewer_id = getattr(viewer, "pk", None)

    def name(user):
        return (user.get_username() if user else "") or ""

    approval = {"required": needs_two, "state": "not_required"}
    if needs_two:
        if pending:
            expires = payout.approval_requested_at + timedelta(hours=approval_valid_hours())
            approval = {
                "required": True,
                "state": "awaiting_second_admin",
                "requested_by": name(payout.approval_requested_by),
                "requested_at": payout.approval_requested_at.isoformat(),
                "expires_at": expires.isoformat(),
                "requested_by_you": payout.approval_requested_by_id == viewer_id,
            }
        else:
            approval = {"required": True, "state": "not_requested"}
    return {
        "destination_hold": {
            "active": bool(hold_until),
            "until": hold_until.isoformat() if hold_until else None,
            "changed_at": vendor.payout_destination_changed_at.isoformat() if vendor.payout_destination_changed_at else None,
            "hours": hold_hours(),
        },
        "approval": approval,
        "two_person_threshold": str(two_person_threshold()),
        "send_in_progress": bool(payout.send_in_progress),
        "initiated_by": name(payout.initiated_by),
        "initiated_at": payout.initiated_at.isoformat() if payout.initiated_at else None,
        "approved_by": name(payout.approved_by),
        "approved_at": payout.approved_at.isoformat() if payout.approved_at else None,
    }
