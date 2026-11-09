"""Scheduled moderation jobs: SLA reminder and 12-month record retention."""
import logging
from datetime import timedelta

from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone

from . import moderation as svc
from .models import ContentReport, Notification

logger = logging.getLogger(__name__)
RETENTION_DAYS = 365


@shared_task
def remind_overdue_reports():
    """Tell every superuser when reports are past the 24-hour review target."""
    overdue = svc.overdue_count()
    if not overdue:
        return 0
    for admin in get_user_model().objects.filter(is_superuser=True, is_active=True):
        Notification.objects.create(
            user=admin,
            title="Reports need review",
            message=f"{overdue} reported item(s) are past the {svc.SLA_HOURS}-hour review target.",
            url="/admin-dashboard/moderation",
        )
    return overdue


@shared_task
def purge_old_reports():
    """Delete resolved reports older than the retention period (see privacy policy)."""
    cutoff = timezone.now() - timedelta(days=RETENTION_DAYS)
    deleted, _ = ContentReport.objects.exclude(status=ContentReport.STATUS_OPEN).filter(resolved_at__lt=cutoff).delete()
    logger.info("Purged %s moderation reports older than %s days", deleted, RETENTION_DAYS)
    return deleted
