"""Exchange credit: issue, quote, and spend (server-side only)."""
import logging
import math
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from order.models import ExchangeCredit

logger = logging.getLogger(__name__)
ZERO = Decimal("0.00")


def credit_days():
    try:
        return max(1, int(getattr(settings, "EXCHANGE_CREDIT_DAYS", 30)))
    except (TypeError, ValueError):
        return 30


def issue_exchange_credit(return_request):
    """Create the credit for an approved exchange (idempotent: one per return)."""
    adjustment = return_request.vendor_adjustment
    amount = Decimal(str(adjustment.amount)) if adjustment else ZERO
    if amount <= 0:
        return None
    credit, _ = ExchangeCredit.objects.get_or_create(
        return_request=return_request,
        defaults={
            "user": return_request.customer,
            "visitor_id": None if return_request.customer_id else return_request.visitor_id,
            "amount": amount,
            "expires_at": timezone.now() + timedelta(days=credit_days()),
        },
    )
    return credit


def _owner_filter(user, visitor_id):
    if user is not None and getattr(user, "is_authenticated", False):
        return Q(user=user)
    if visitor_id:
        return Q(user__isnull=True, visitor_id=visitor_id)
    return None


def active_credits(user, visitor_id, *, lock=False):
    owner = _owner_filter(user, visitor_id)
    if owner is None:
        return ExchangeCredit.objects.none()
    qs = ExchangeCredit.objects.filter(owner, voided=False, expires_at__gt=timezone.now()).order_by("created_at")
    if lock:
        qs = qs.select_for_update()
    return [c for c in qs if c.remaining > 0] if lock else qs


def credit_balance(user, visitor_id):
    return sum((c.remaining for c in active_credits(user, visitor_id)), ZERO)


@dataclass
class CreditQuote:
    total: Decimal       # items + shipping
    applied: Decimal     # paid with credit
    charge: Decimal      # charged to the payment provider

    @property
    def covers_all(self):
        return self.charge <= 0 and self.applied > 0


def quote_credit(user, visitor_id, total, payment_method=None):
    """How much of ``total`` the customer's credit covers, and what is left to charge."""
    total = Decimal(str(total)).quantize(Decimal("0.01"))
    balance = credit_balance(user, visitor_id)
    applied = min(balance, total)
    if applied <= 0:
        return CreditQuote(total, ZERO, total)
    charge = total - applied
    if payment_method == "M-Pesa" and charge > 0 and charge != charge.to_integral_value():
        # M-Pesa only takes whole shillings: round the charge up, use slightly less credit.
        charge = Decimal(math.ceil(charge))
        applied = total - charge
    return CreditQuote(total, max(applied, ZERO), max(charge, ZERO))


def another_credit_checkout_in_flight(user, visitor_id, exclude_id=None):
    """True if the customer has another unexpired payment that already uses credit."""
    from order.models import CheckoutSession

    qs = CheckoutSession.objects.filter(status="payment_pending", expires_at__gt=timezone.now())
    qs = qs.filter(user=user) if user is not None and getattr(user, "is_authenticated", False) else qs.filter(
        user__isnull=True, visitor_id=visitor_id
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return any(Decimal(str((s.payload or {}).get("credit_applied", "0"))) > 0 for s in qs)


def consume_credit(user, visitor_id, amount):
    """Spend ``amount`` (oldest credit first). Returns what was actually spent.

    Must run inside a transaction. If less is available than requested (a rare
    race), the shortfall is logged for the admin instead of failing a paid order.
    """
    remaining = Decimal(str(amount))
    spent = ZERO
    if remaining <= 0:
        return spent
    for credit in active_credits(user, visitor_id, lock=True):
        if remaining <= 0:
            break
        take = min(credit.remaining, remaining)
        credit.used_amount = credit.used_amount + take
        credit.save(update_fields=["used_amount"])
        spent += take
        remaining -= take
    if remaining > 0:
        logger.error("Exchange credit shortfall of %s for user=%s visitor=%s", remaining, user, visitor_id)
    return spent
