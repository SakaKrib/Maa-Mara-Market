"""End offers whose duration has run out so items return to their normal price."""
import logging

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .models import Offer

logger = logging.getLogger(__name__)


def expire_finished_offers(now=None):
    """Switch off every offer whose end date has passed. Safe to run repeatedly."""
    now = now or timezone.now()
    ended = 0
    for offer_id in list(Offer.objects.filter(end_date__lt=now).values_list("pk", flat=True)):
        with transaction.atomic():
            offer = (
                Offer.objects.select_for_update()
                .select_related("item")
                .filter(pk=offer_id, end_date__lt=now)
                .first()
            )
            if offer is None:
                continue
            offer.end_offer()
            ended += 1
    if ended:
        logger.info("Ended %s expired item offer(s).", ended)
    return ended


@shared_task
def end_expired_offers():
    return {"ended": expire_finished_offers()}
