from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Order

@shared_task
def cleanup_old_visitor_orders():
    cutoff_date = timezone.now() - timedelta(days=29)
    old_orders = Order.objects.filter(
        user__isnull=True,
        visitor_id__isnull=False,
        status="pending",
        ordered_date__lte=cutoff_date
    )

    for order in old_orders:
        order.items.all().delete()  # delete cart items
        order.delete()
