"""Best-effort Firebase Cloud Messaging delivery for saved in-app notifications.

Set FIREBASE_SERVICE_ACCOUNT_JSON to the service-account JSON string, or
FIREBASE_SERVICE_ACCOUNT_FILE to a protected file path in the deployment
environment. Never commit Firebase credentials to the repository.
"""
import json
import logging
import os
from functools import lru_cache

from django.apps import apps
from django.conf import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _firebase_messaging():
    """Return Firebase messaging module, or None when push is not configured."""
    raw_credentials = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    credentials_file = os.environ.get("FIREBASE_SERVICE_ACCOUNT_FILE", "").strip()
    if not raw_credentials and not credentials_file:
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials, messaging

        if not firebase_admin._apps:
            if raw_credentials:
                credential_data = json.loads(raw_credentials)
                credential = credentials.Certificate(credential_data)
            else:
                credential = credentials.Certificate(credentials_file)
            firebase_admin.initialize_app(credential)
        return messaging
    except Exception:
        logger.exception("Firebase push is configured but could not initialize.")
        return None


def send_notification_push(notification_id):
    """Send a push to every active device registered to the notification recipient.

    The in-app Notification row remains the source of truth. A Firebase failure
    must never roll back an order, approval, message, or notification record.
    """
    try:
        Notification = apps.get_model("core", "Notification")
        PushDevice = apps.get_model("core", "PushDevice")
        notification = (
            Notification.objects.select_related("user")
            .filter(pk=notification_id, user__isnull=False)
            .first()
        )
        if notification is None:
            return

        devices = list(PushDevice.objects.filter(user_id=notification.user_id, active=True))
        if not devices:
            return

        messaging = _firebase_messaging()
        if messaging is None:
            logger.info(
                "Push delivery skipped for notification %s: Firebase credentials are not configured.",
                notification_id,
            )
            return

        title = (notification.title or "Maa Mara Market update").strip()[:255]
        body = (notification.message or "You have a new update.").strip()[:1000]
        target_url = notification.url or "/"
        for device in devices:
            try:
                messaging.send(
                    messaging.Message(
                        notification=messaging.Notification(title=title, body=body),
                        data={
                            "notification_id": str(notification.pk),
                            "url": str(target_url)[:500],
                            "title": title,
                            "message": body,
                        },
                        token=device.token,
                    )
                )
            except Exception as error:
                error_code = getattr(error, "code", "")
                error_text = str(error).lower()
                if error_code in {"UNREGISTERED", "INVALID_ARGUMENT"} or (
                    "registration-token-not-registered" in error_text
                ):
                    device.delete()
                    continue
                logger.warning(
                    "Push delivery failed for notification %s and device %s: %s",
                    notification_id,
                    device.pk,
                    error,
                )
    except Exception:
        logger.exception("Unable to deliver push for notification %s.", notification_id)
