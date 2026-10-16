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
    """Send a saved notification to active devices owned by its user or visitor."""
    try:
        Notification = apps.get_model("core", "Notification")
        PushDevice = apps.get_model("core", "PushDevice")
        notification = (
            Notification.objects.select_related("user")
            .filter(pk=notification_id)
            .first()
        )
        if notification is None:
            return

        if notification.user_id:
            devices_query = PushDevice.objects.filter(
                user_id=notification.user_id,
                active=True,
            )
        elif notification.visitor_id:
            devices_query = PushDevice.objects.filter(
                visitor_id=notification.visitor_id,
                user__isnull=True,
                active=True,
            )
        else:
            return

        devices = list(devices_query)
        if not devices:
            logger.debug(
                "Push delivery skipped for notification %s: no active device for recipient.",
                notification_id,
            )
            return

        messaging = _firebase_messaging()
        if messaging is None:
            logger.warning(
                "Push delivery skipped for notification %s: Firebase credentials are not configured.",
                notification_id,
            )
            return

        title = (notification.title or "Maa Mara Market update").strip()[:255]
        body = (notification.message or "You have a new update.").strip()[:1000]
        target_url = notification.url or "/"
        for device in devices:
            try:
                message = messaging.Message(
                    notification=messaging.Notification(title=title, body=body),
                    data={
                        "notification_id": str(notification.pk),
                        "url": str(target_url)[:500],
                        "title": title,
                        "message": body,
                    },
                    android=messaging.AndroidConfig(
                        priority="high",
                        notification=messaging.AndroidNotification(
                            channel_id="maamara_updates",
                            sound="default",
                        ),
                    ),
                    apns=messaging.APNSConfig(
                        payload=messaging.APNSPayload(
                            aps=messaging.Aps(sound="default"),
                        ),
                    ),
                    token=device.token,
                )
                messaging.send(message)
            except Exception as error:
                # Firebase SDKs/providers do not always expose the same spelling:
                # examples include "NotRegistered", "UNREGISTERED", and
                # "messaging/registration-token-not-registered". Normalize the
                # code and message, and retire a device only for an explicit
                # unregistered-token response (not generic INVALID_ARGUMENT,
                # which can also indicate a malformed message payload).
                error_code = str(getattr(error, "code", "") or "").lower()
                normalized_code = error_code.replace("_", "-").replace("/", "-")
                error_text = str(error).lower().replace("_", "-")
                unregistered_token = (
                    "notregistered" in normalized_code
                    or "unregistered" in normalized_code
                    or "registration-token-not-registered" in normalized_code
                    or "notregistered" in error_text
                    or "registration-token-not-registered" in error_text
                    or "requested entity was not found" in error_text
                )
                if unregistered_token:
                    logger.info(
                        "Removing stale push device %s after Firebase reported an unregistered token.",
                        device.pk,
                    )
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
