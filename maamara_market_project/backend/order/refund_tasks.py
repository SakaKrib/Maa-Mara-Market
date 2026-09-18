import logging

from celery import shared_task

from .models import Refund
from .services.refunds import RefundProcessingError, process_paypal_refund

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5)
def process_refund_task(self, refund_id):
    try:
        refund = process_paypal_refund(refund_id)
    except RefundProcessingError:
        refund = Refund.objects.get(pk=refund_id)
        if refund.status == "failed":
            logger.warning("Refund failed permanently for refund_id=%s", refund_id)
            return {"refund_id": refund_id, "status": "failed"}
        raise self.retry(
            countdown=min(300, 30 * (2 ** self.request.retries)),
            exc=RefundProcessingError("Refund processing requires another attempt."),
        )

    if refund.status == "processing":
        raise self.retry(
            countdown=min(300, 30 * (2 ** self.request.retries)),
            exc=RefundProcessingError("Refund remains pending at the provider."),
        )

    logger.info(
        "Refund processing task completed for refund_id=%s status=%s",
        refund_id,
        refund.status,
    )
    return {"refund_id": refund.id, "status": refund.status}
