"""Self-service account deletion (Apple 5.1.1(v), Google Play account deletion policy).

The user row is *anonymised in place* instead of deleted. Orders, payments, refunds
and payouts reference users with CASCADE, so a hard delete would erase financial
records we are legally required to keep. After deletion the row holds no personal
data, cannot sign in and cannot be matched to the person.

Deleted: profile and picture, wallet and coins, vouchers, referrals, wishlist,
reviews, comments, reactions, notifications, direct messages, drafts, sign-in
links (Google/Apple), email addresses and one-time codes.
Anonymised: support tickets, the saved customer record, view logs.
Kept (anonymised owner): orders, payments, refunds, invoices.
"""
import hashlib
import logging
import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()

CODE_TTL_SECONDS = 15 * 60
MAX_CODE_ATTEMPTS = 5
# Orders still in progress: the customer, vendor or a payment depends on them.
OPEN_ORDER_STATUSES = (
    "PAID", "PROCESSING", "PACKING", "READY_TO_SHIP", "SHIPPED", "IN_TRANSIT",
    "OUT_FOR_DELIVERY", "AWAITING_CONFIRMATION", "RETURN_REQUESTED", "RETURN_APPROVED", "DISPUTED",
)


def email_hash(email):
    return hashlib.sha256((email or "").strip().lower().encode()).hexdigest()


def deletion_blockers(user):
    """Reasons the account cannot be deleted right now (empty list = allowed)."""
    from order.models import Order

    reasons = []
    if user.is_staff or user.is_superuser:
        reasons.append("Administrator accounts must be removed by another administrator.")
    if hasattr(user, "vendor"):
        reasons.append(
            "Vendor accounts have payouts, listings and bank details that must be settled first. "
            "Use the deletion request form on our website and we will complete it within 30 days."
        )
    if Order.objects.filter(user=user, status__in=OPEN_ORDER_STATUSES).exists():
        reasons.append(
            "You have orders that are still being processed, delivered or returned. "
            "You can delete your account once they are completed."
        )
    return reasons


# ---------------------------------------------------------------- confirmation
def _code_key(user_id):
    return f"acct-delete-code:{user_id}"


def send_confirmation_code(user):
    code = f"{secrets.randbelow(10**6):06d}"
    cache.set(_code_key(user.pk), {"hash": hashlib.sha256(code.encode()).hexdigest(), "tries": 0}, CODE_TTL_SECONDS)
    if not user.email:
        return False
    send_mail(
        "Confirm deletion of your Maa Mara Market account",
        f"Your confirmation code is {code}. It expires in 15 minutes.\n\n"
        "If you did not ask to delete your account, ignore this email and your account stays as it is.",
        getattr(settings, "DEFAULT_FROM_EMAIL", None), [user.email], fail_silently=False,
    )
    return True


def verify_confirmation_code(user, code):
    state = cache.get(_code_key(user.pk))
    if not state or not isinstance(code, str):
        return False
    if state["tries"] >= MAX_CODE_ATTEMPTS:
        cache.delete(_code_key(user.pk))
        return False
    state["tries"] += 1
    cache.set(_code_key(user.pk), state, CODE_TTL_SECONDS)
    if secrets.compare_digest(state["hash"], hashlib.sha256(code.strip().encode()).hexdigest()):
        cache.delete(_code_key(user.pk))
        return True
    return False


# -------------------------------------------------------------------- deletion
def _delete_files(instances, *fields):
    for obj in instances:
        for name in fields:
            f = getattr(obj, name, None)
            if f:
                try:
                    f.delete(save=False)
                except Exception:  # file already gone
                    logger.warning("Could not remove file for %s", obj.__class__.__name__)


@transaction.atomic
def anonymise_user(user, channel="app"):
    from allauth.account.models import EmailAddress
    from allauth.socialaccount.models import SocialAccount
    from core.models import (AccountDeletionRecord, DirectMessage, EmailOTP, Notification, Profile,
                             Referral, SupportMessage, Voucher, Wallet)
    from order.models import Customer
    from ReactSerializers.models import ItemView
    from shop.models import CommentBlog, Reaction, ReactionBlog, Review, VendorRating, Wishlist
    from vendorDashboard.models import VendorDraft

    blockers = deletion_blockers(user)
    if blockers:
        raise PermissionError(blockers[0])

    original_email = user.email
    user_pk = user.pk

    _delete_files(Profile.objects.filter(user=user), "profile_picture")
    _delete_files(DirectMessage.objects.filter(sender=user), "image")
    for model, field in (
        (Profile, "user"), (Wallet, "user"), (Voucher, "user"), (Notification, "user"), (Wishlist, "user"),
        (Review, "user"), (Reaction, "user"), (CommentBlog, "user"), (ReactionBlog, "user"),
        (DirectMessage, "sender"), (EmailOTP, "user"), (VendorDraft, "user"),
        (SocialAccount, "user"), (EmailAddress, "user"),
    ):
        model.objects.filter(**{field: user}).delete()
    Referral.objects.filter(referrer=user).delete()
    Referral.objects.filter(invited_user=user).update(invited_user=None)

    # Keep the ticket text for support history, drop who it came from.
    SupportMessage.objects.filter(user=user).update(user=None, name="", email="deleted@invalid.local")
    ItemView.objects.filter(user=user).update(user=None)
    VendorRating.objects.filter(user=user).update(user=None)
    Customer.objects.filter(user=user).update(
        full_name=None, first_name=None, last_name=None, email=None, phone_number=None,
        address=None, city=None,
    )

    user.username = f"deleted-{user_pk}-{secrets.token_hex(4)}"
    user.email = f"deleted-{user_pk}@deleted.invalid"
    user.first_name = ""
    user.last_name = ""
    user.is_active = False
    user.set_unusable_password()
    user.save()

    AccountDeletionRecord.objects.create(
        user_id=user_pk, email_hash=email_hash(original_email), channel=channel,
        status="completed", completed_at=timezone.now(),
    )
    return original_email


def send_completion_email(email):
    if not email:
        return
    try:
        send_mail(
            "Your Maa Mara Market account has been deleted",
            "Your account and personal data have been deleted. Order, payment and refund records are kept "
            "without your personal details, as required by tax and accounting law.\n\n"
            "If you did not request this, contact support immediately.",
            getattr(settings, "DEFAULT_FROM_EMAIL", None), [email], fail_silently=True,
        )
    except Exception:
        logger.warning("Deletion confirmation email failed")
