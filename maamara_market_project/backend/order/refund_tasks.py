import logging

from celery import shared_task

from .services.refunds import RefundProcessingError, process_paypal_refund

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(RefundProcessingError,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 5},
)
def process_refund_task(self, refund_id):
    refund = process_paypal_refund(refund_id)
    logger.info("Refund processing task completed for refund_id=%s status=%s", refund_id, refund.status)
    return {"refund_id": refund.id, "status": refund.status}
