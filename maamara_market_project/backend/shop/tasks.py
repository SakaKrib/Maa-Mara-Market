# tasks.py
from celery import shared_task
from django.utils import timezone
from .models import Banner

@shared_task
def delete_expired_banners():
    now = timezone.now()
    expired = Banner.objects.filter(end_date__lte=now)
    count = expired.count()
    expired.delete()
    return f"Deleted {count} expired banners."
