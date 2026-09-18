"""
Visitor-data consolidation service.

A visitor is identified by the server-issued visitor_id cookie/token. When that
visitor becomes an authenticated user, this service atomically moves every
visitor-owned record that can safely belong to the user.
"""
from __future__ import annotations

import logging
from typing import Any

from django.db import transaction

from core.models import ActivityLog, Notification, Profile, Referral, Voucher, Wallet
from order.models import BillingAddress, Customer, Order, OrderItem, Payment, Transaction, Card
from ReactSerializers.models import ItemView
from shop.models import CommentBlog, ReactionBlog, VendorRating, Wishlist
from vendorDashboard.models import ReturnRequest

logger = logging.getLogger(__name__)


def _copy_missing_fields(source: Any, target: Any, fields: tuple[str, ...]) -> None:
    changed = []
    for field in fields:
        value = getattr(source, field, None)
        if value not in (None, "") and getattr(target, field, None) in (None, ""):
            setattr(target, field, value)
            changed.append(field)
    if changed:
        target.save(update_fields=changed)


def _merge_customer(user, visitor_id):
    visitor_customer = (
        Customer.objects.select_for_update()
        .filter(visitor_id=visitor_id, user__isnull=True)
        .first()
    )
    customer = Customer.objects.select_for_update().filter(user=user).first()

    if visitor_customer and customer and visitor_customer.pk != customer.pk:
        _copy_missing_fields(
            visitor_customer,
            customer,
            (
                "full_name", "first_name", "last_name", "email",
                "phone_number", "address", "city", "country",
            ),
        )
        Order.objects.filter(customer=visitor_customer).update(customer=customer)
        visitor_customer.delete()
        return customer

    if visitor_customer:
        visitor_customer.user = user
        visitor_customer.visitor_id = None
        visitor_customer.save(update_fields=["user", "visitor_id", "updated_at"])
        return visitor_customer

    return customer or Customer.objects.create(user=user)


def _merge_pending_cart(user, visitor_id):
    cart_status = getattr(Order, "CART_STATUS", "pending")
    visitor_carts = list(
        Order.objects.select_for_update()
        .filter(visitor_id=visitor_id, user__isnull=True, status=cart_status)
        .order_by("created_at", "id")
    )
    user_cart = (
        Order.objects.select_for_update()
        .filter(user=user, status=cart_status)
        .order_by("created_at", "id")
        .first()
    )

    for visitor_cart in visitor_carts:
        if user_cart is None:
            visitor_cart.user = user
            visitor_cart.visitor_id = None
            visitor_cart.save(update_fields=["user", "visitor_id"])
            user_cart = visitor_cart
            continue

        for line in visitor_cart.order_items.select_for_update().all():
            duplicate = user_cart.order_items.filter(
                item_id=line.item_id,
                color_variant_id=line.color_variant_id,
                size_stock_id=line.size_stock_id,
                age_variant_id=line.age_variant_id,
                shoe_size=line.shoe_size,
                selected_weight=line.selected_weight,
                selected_length=line.selected_length,
            ).first()
            if duplicate:
                duplicate.quantity += line.quantity
                duplicate.save(update_fields=["quantity"])
                line.delete()
            else:
                line.order = user_cart
                line.user = user
                line.visitor_id = None
                line.save(update_fields=["order", "user", "visitor_id"])
        visitor_cart.delete()

    return user_cart


@transaction.atomic
def merge_visitor_data_to_user(user, visitor_id: str | None) -> dict[str, int]:
    """
    Atomically consolidate anonymous data into the authenticated user.
    The operation is idempotent.
    """
    if not visitor_id or not user or not user.is_authenticated:
        return {"moved": 0, "deduplicated": 0}

    moved = 0
    deduplicated = 0

    _merge_pending_cart(user, visitor_id)

    for qs in (
        Order.objects.filter(visitor_id=visitor_id, user__isnull=True),
        OrderItem.objects.filter(visitor_id=visitor_id, user__isnull=True),
        Payment.objects.filter(visitor_id=visitor_id, user__isnull=True),
        Transaction.objects.filter(visitor_id=visitor_id, user__isnull=True),
        BillingAddress.objects.filter(visitor_id=visitor_id, user__isnull=True),
    ):
        moved += qs.update(user=user, visitor_id=None)

    customer = _merge_customer(user, visitor_id)

    moved += ReturnRequest.objects.filter(
        visitor_id=visitor_id, customer__isnull=True
    ).update(customer=user, visitor_id=None)

    visitor_profile = (
        Profile.objects.select_for_update()
        .filter(visitor_id=visitor_id)
        .first()
    )
    user_profile = Profile.objects.select_for_update().filter(user=user).first()
    if visitor_profile and visitor_profile.pk != getattr(user_profile, "pk", None):
        if user_profile:
            _copy_missing_fields(
                visitor_profile,
                user_profile,
                ("phone_number", "address", "city", "country", "location", "date_of_birth"),
            )
            visitor_profile.delete()
            deduplicated += 1
        else:
            visitor_profile.user = user
            visitor_profile.visitor_id = None
            visitor_profile.customer = customer
            visitor_profile.save(update_fields=["user", "visitor_id", "customer"])
            moved += 1

    visitor_wallet = Wallet.objects.filter(visitor_id=visitor_id).first()
    user_wallet = Wallet.objects.filter(user=user).first()
    if visitor_wallet and user_wallet and visitor_wallet.pk != user_wallet.pk:
        user_wallet.balance += visitor_wallet.balance
        user_wallet.earned_coins += visitor_wallet.earned_coins
        user_wallet.save(update_fields=["balance", "earned_coins"])
        visitor_wallet.delete()
        deduplicated += 1
    elif visitor_wallet:
        visitor_wallet.user = user
        visitor_wallet.visitor_id = None
        visitor_wallet.save(update_fields=["user", "visitor_id"])
        moved += 1
    else:
        Wallet.objects.get_or_create(user=user)

    moved += Voucher.objects.filter(
        visitor_id=visitor_id, user__isnull=True
    ).update(user=user, visitor_id=None)

    moved += Notification.objects.filter(
        visitor_id=visitor_id, user__isnull=True
    ).update(user=user, visitor_id=None)

    moved += ActivityLog.objects.filter(
        visitor_id=visitor_id, user__isnull=True
    ).update(user=user, visitor_id=None)

    moved += Referral.objects.filter(visitor_id=visitor_id).update(
        invited_user=user, visitor_id=None
    )

    for visitor_row in Wishlist.objects.select_for_update().filter(visitor_id=visitor_id):
        if Wishlist.objects.filter(
            user=user, item_id=visitor_row.item_id
        ).exclude(pk=visitor_row.pk).exists():
            visitor_row.delete()
            deduplicated += 1
        else:
            visitor_row.user = user
            visitor_row.visitor_id = None
            visitor_row.save(update_fields=["user", "visitor_id"])
            moved += 1

    for visitor_row in VendorRating.objects.select_for_update().filter(visitor_id=visitor_id):
        if VendorRating.objects.filter(
            vendor_id=visitor_row.vendor_id, user=user
        ).exclude(pk=visitor_row.pk).exists():
            visitor_row.delete()
            deduplicated += 1
        else:
            visitor_row.user = user
            visitor_row.visitor_id = None
            visitor_row.save(update_fields=["user", "visitor_id"])
            moved += 1

    moved += CommentBlog.objects.filter(
        visitor_id=visitor_id, user__isnull=True
    ).update(user=user, visitor_id=None)

    for visitor_row in ReactionBlog.objects.select_for_update().filter(visitor_id=visitor_id):
        if ReactionBlog.objects.filter(
            post_id=visitor_row.post_id, user=user
        ).exclude(pk=visitor_row.pk).exists():
            visitor_row.delete()
            deduplicated += 1
        else:
            visitor_row.user = user
            visitor_row.visitor_id = None
            visitor_row.save(update_fields=["user", "visitor_id"])
            moved += 1

    for visitor_row in ItemView.objects.select_for_update().filter(visitor_id=visitor_id):
        if ItemView.objects.filter(
            item_id=visitor_row.item_id, user=user
        ).exclude(pk=visitor_row.pk).exists():
            visitor_row.delete()
            deduplicated += 1
        else:
            visitor_row.user = user
            visitor_row.visitor_id = None
            visitor_row.save(update_fields=["user", "visitor_id"])
            moved += 1

    card_fields = {f.name for f in Card._meta.fields}
    if "user" in card_fields:
        moved += Card.objects.filter(
            visitor_id=visitor_id
        ).update(user=user, visitor_id=None)

    logger.info(
        "Visitor account merge completed",
        extra={
            "visitor_id": visitor_id,
            "user_id": user.pk,
            "moved": moved,
            "deduplicated": deduplicated,
        },
    )
    return {"moved": moved, "deduplicated": deduplicated}
