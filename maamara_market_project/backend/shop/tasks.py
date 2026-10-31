from celery import shared_task
from django.utils import timezone

from .models import Banner


@shared_task
def delete_expired_banners():
    """Delete banners whose end date has passed, including their image files."""
    now = timezone.now()
    deleted = 0
    for banner in Banner.objects.filter(end_date__lte=now).iterator():
        if banner.image:
            banner.image.delete(save=False)
        banner.delete()
        deleted += 1
    return f"Deleted {deleted} expired banners."
