from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Notification, ActivityLog, CalendarEvent
from .realtime import broadcast_event, model_snapshot
from ReactSerializers.models import Item, ColorVariant, SizeStock, AgeVariant, Offer, PriceChangeRequest
from order.models import Order, OrderItem, Payment, Customer, Refund
from vendorDashboard.models import Vendor, VendorPayout, VendorItemRequest, ReturnRequest


def emit(sender, instance, action, **kwargs):
    payload = {
        "model": sender.__name__,
        "object_id": instance.pk,
        "action": action,
        **kwargs,
        "data": model_snapshot(instance),
    }
    transaction.on_commit(lambda: broadcast_event(sender.__name__, **payload))


def item_vendor(instance):
    return [instance.vendor_id] if getattr(instance, "vendor_id", None) else []


def order_vendors(instance):
    return list(
        Vendor.objects.filter(items__orderitem__order=instance)
        .values_list("id", flat=True)
        .distinct()
    )


@receiver(post_save, sender=Item)
def item_save(sender, instance, created, **kwargs):
    emit(sender, instance, "created" if created else "updated",
         public=True, vendor_ids=item_vendor(instance))


@receiver(post_delete, sender=Item)
def item_delete(sender, instance, **kwargs):
    emit(sender, instance, "deleted", public=True, vendor_ids=item_vendor(instance))


@receiver(post_save, sender=ColorVariant)
@receiver(post_save, sender=SizeStock)
@receiver(post_save, sender=AgeVariant)
@receiver(post_save, sender=Offer)
def catalog_save(sender, instance, created, **kwargs):
    item = (
        getattr(instance, "item", None)
        or getattr(getattr(instance, "variant", None), "item", None)
    )
    if item:
        emit(sender, instance, "created" if created else "updated",
             public=True, vendor_ids=item_vendor(item))


@receiver(post_delete, sender=ColorVariant)
@receiver(post_delete, sender=SizeStock)
@receiver(post_delete, sender=AgeVariant)
@receiver(post_delete, sender=Offer)
def catalog_delete(sender, instance, **kwargs):
    emit(sender, instance, "deleted", public=True)


@receiver(post_save, sender=Order)
def order_save(sender, instance, created, **kwargs):
    emit(
        sender, instance, "created" if created else "updated",
        user_ids=[instance.user_id] if instance.user_id else [],
        visitor_ids=[instance.visitor_id] if getattr(instance, "visitor_id", None) else [],
        vendor_ids=order_vendors(instance),
    )


@receiver(post_save, sender=OrderItem)
def order_item_save(sender, instance, created, **kwargs):
    if instance.order_id:
        emit(
            sender, instance, "created" if created else "updated",
            user_ids=[instance.order.user_id] if instance.order.user_id else [],
            visitor_ids=[instance.order.visitor_id] if getattr(instance.order, "visitor_id", None) else [],
            vendor_ids=order_vendors(instance.order),
        )


@receiver(post_save, sender=Payment)
def payment_save(sender, instance, created, **kwargs):
    emit(
        sender, instance, "created" if created else "updated",
        user_ids=[instance.user_id] if instance.user_id else [],
        visitor_ids=[instance.visitor_id] if getattr(instance, "visitor_id", None) else [],
    )


@receiver(post_save, sender=Customer)
def customer_save(sender, instance, created, **kwargs):
    vendor_id = (
        Vendor.objects.filter(user_id=instance.vendor_id)
        .values_list("id", flat=True)
        .first()
    )
    emit(
        sender, instance, "created" if created else "updated",
        vendor_ids=[vendor_id] if vendor_id else [],
    )


@receiver(post_save, sender=Notification)
def notification_save(sender, instance, created, **kwargs):
    emit(
        sender, instance, "created" if created else "updated",
        user_ids=[instance.user_id] if instance.user_id else [],
        visitor_ids=[instance.visitor_id] if getattr(instance, "visitor_id", None) else [],
    )


@receiver(post_save, sender=ActivityLog)
def activity_save(sender, instance, created, **kwargs):
    if created:
        emit(
            sender, instance, "created",
            user_ids=[instance.user_id] if instance.user_id else [],
        )


@receiver(post_save, sender=CalendarEvent)
def calendar_save(sender, instance, created, **kwargs):
    emit(
        sender, instance, "created" if created else "updated",
        user_ids=[instance.user_id] if instance.user_id else [],
    )


@receiver(post_save, sender=VendorPayout)
def payout_save(sender, instance, created, **kwargs):
    uid = (
        Vendor.objects.filter(pk=instance.vendor_id)
        .values_list("user_id", flat=True)
        .first()
    )
    emit(
        sender, instance, "created" if created else "updated",
        user_ids=[uid] if uid else [],
        vendor_ids=[instance.vendor_id],
    )


@receiver(post_save, sender=VendorItemRequest)
def vendor_request_save(sender, instance, created, **kwargs):
    uid = (
        Vendor.objects.filter(pk=instance.vendor_id)
        .values_list("user_id", flat=True)
        .first()
    )
    emit(
        sender, instance, "created" if created else "updated",
        user_ids=[uid] if uid else [],
        vendor_ids=[instance.vendor_id],
    )


@receiver(post_save, sender=PriceChangeRequest)
def price_change_request_save(sender, instance, created, **kwargs):
    vendor_id = getattr(getattr(instance, "item", None), "vendor_id", None)
    emit(
        sender, instance, "created" if created else "updated",
        vendor_ids=[vendor_id] if vendor_id else [],
        user_ids=[instance.requested_by_id] if instance.requested_by_id else [],
    )


@receiver(post_save, sender=Refund)
def refund_save(sender, instance, created, **kwargs):
    return_request = getattr(instance, "return_request", None)
    customer_id = getattr(return_request, "customer_id", None) if return_request else None
    visitor_id = getattr(return_request, "visitor_id", None) if return_request else None

    vendor_id = None
    item = getattr(return_request, "item", None) if return_request else None
    product = getattr(item, "item", None) if item else None
    if product:
        vendor_id = (
            Vendor.objects.filter(user_id=product.created_by_id)
            .values_list("id", flat=True)
            .first()
        )

    emit(
        sender, instance, "created" if created else "updated",
        user_ids=[customer_id] if customer_id else [],
        visitor_ids=[visitor_id] if visitor_id else [],
        vendor_ids=[vendor_id] if vendor_id else [],
    )


@receiver(post_save, sender=ReturnRequest)
def return_request_save(sender, instance, created, **kwargs):
    vendor_id = None
    item = getattr(instance, "item", None)
    if item and getattr(item, "item", None):
        vendor_id = (
            Vendor.objects.filter(user_id=item.item.created_by_id)
            .values_list("id", flat=True)
            .first()
        )
    emit(
        sender, instance, "created" if created else "updated",
        user_ids=[instance.customer_id] if instance.customer_id else [],
        visitor_ids=[instance.visitor_id] if getattr(instance, "visitor_id", None) else [],
        vendor_ids=[vendor_id] if vendor_id else [],
    )
