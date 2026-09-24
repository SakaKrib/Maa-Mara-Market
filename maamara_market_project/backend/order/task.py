from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import CheckoutSession, Order

@shared_task
def cleanup_old_visitor_orders():
    cutoff_date = timezone.now() - timedelta(days=29)
    old_orders = Order.objects.filter(
        user__isnull=True,
        visitor_id__isnull=False,
        status__in=["PENDING_PAYMENT", "pending"],
        ordered_date__lte=cutoff_date
    )

    for order in old_orders:
        order.items.all().delete()  # delete cart items
        order.delete()


@shared_task
def cleanup_expired_checkout_sessions():
    CheckoutSession.objects.filter(
        expires_at__lt=timezone.now(),
        status="draft",
    ).update(status="expired")
    CheckoutSession.objects.filter(
        expires_at__lt=timezone.now() - timedelta(days=1),
        status="payment_pending",
    ).update(status="expired")
    CheckoutSession.objects.filter(
        expires_at__lt=timezone.now() - timedelta(days=1),
        status__in=["expired", "failed", "completed"],
    ).delete()
