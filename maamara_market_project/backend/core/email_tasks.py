"""Idempotent campaign delivery and scheduled draft preparation."""
import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from .models import EmailCampaign, EmailCampaignRecipient, NewsletterSubscriber

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def send_email_campaign(self, campaign_id):
    campaign = EmailCampaign.objects.filter(pk=campaign_id).first()
    if not campaign or campaign.status not in {"approved", "scheduled", "sending"}:
        return {"status": "skipped", "reason": "Campaign is not approved for sending."}
    if campaign.scheduled_at and campaign.scheduled_at > timezone.now():
        return {"status": "skipped", "reason": "Campaign is scheduled for the future."}
    # Lock status transition so concurrent beat/manual requests do not start duplicate sends.
    with transaction.atomic():
        locked = EmailCampaign.objects.select_for_update().filter(pk=campaign_id).first()
        if not locked or locked.status not in {"approved", "scheduled"}:
            return {"status": "skipped", "reason": "Campaign has already started or is no longer approved."}
        locked.status = "sending"
        locked.save(update_fields=["status", "updated_at"])
    subscribers = NewsletterSubscriber.objects.filter(consent_given=True, unsubscribed_at__isnull=True).order_by("id")
    total = 0
    sent = 0
    failed = 0
    for subscriber in subscribers.iterator():
        total += 1
        recipient, _ = EmailCampaignRecipient.objects.get_or_create(
            campaign=campaign, email=subscriber.email,
            defaults={"subscriber": subscriber, "status": "pending"},
        )
        # Never retry a successful recipient; re-check live subscription before each attempt.
        if recipient.status == "sent":
            sent += 1
            continue
        if not NewsletterSubscriber.objects.filter(pk=subscriber.pk, consent_given=True, unsubscribed_at__isnull=True).exists():
            recipient.status = "suppressed"
            recipient.save(update_fields=["status"])
            continue
        unsubscribe_url = f"{getattr(settings, 'BACKEND_PUBLIC_URL', settings.FRONTEND_URL).rstrip('/')}/api/newsletter/unsubscribe/{subscriber.unsubscribe_token}/"
        context = {
            "campaign": campaign, "frontend_url": settings.FRONTEND_URL.rstrip("/"),
            "company_address": getattr(settings, "COMPANY_ADDRESS", ""),
            "unsubscribe_url": unsubscribe_url,
        }
        html_body = render_to_string("emails/marketing_campaign.html", context)
        text_body = (campaign.body_text or campaign.subject) + "\n\nVisit: " + (campaign.cta_url or settings.FRONTEND_URL)
        text_body += "\n\nUnsubscribe: " + unsubscribe_url
        try:
            email = EmailMultiAlternatives(
                subject=campaign.subject, body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL, to=[subscriber.email],
            )
            email.attach_alternative(html_body, "text/html")
            recipient.attempts += 1
            recipient.attempted_at = timezone.now()
            recipient.subscriber = subscriber
            if email.send(fail_silently=False) == 1:
                recipient.status, recipient.error = "sent", ""
                sent += 1
            else:
                recipient.status, recipient.error = "failed", "Email backend did not accept the message."
                failed += 1
            recipient.save()
        except Exception as exc:
            recipient.status, recipient.error = "failed", str(exc)[:2000]
            recipient.attempts += 1
            recipient.attempted_at = timezone.now()
            recipient.save()
            failed += 1
            logger.exception("Campaign %s failed for recipient %s", campaign_id, subscriber.email)
    campaign.refresh_from_db()
    campaign.recipient_count = total
    campaign.sent_count = sent
    campaign.failed_count = failed
    campaign.sent_at = timezone.now() if sent else None
    campaign.status = "sent" if failed == 0 else ("failed" if sent == 0 else "sent")
    campaign.save(update_fields=["recipient_count", "sent_count", "failed_count", "sent_at", "status", "updated_at"])
    return {"status": campaign.status, "recipients": total, "sent": sent, "failed": failed}


@shared_task
def prepare_daily_banner_campaigns():
    """Prepare one reviewable draft per active approved banner; never send automatically."""
    from shop.models import Banner
    today = timezone.localdate()
    now = timezone.now()
    banners = Banner.objects.filter(is_active=True, start_date__lte=now, end_date__gte=now)
    # Handle schema variants conservatively: if approval field exists, require approval.
    field_names = {field.name for field in Banner._meta.get_fields()}
    if "is_approved" in field_names:
        banners = banners.filter(is_approved=True)
    elif "status" in field_names:
        banners = banners.filter(status__in=["approved", "active"])
    created = 0
    for banner in banners.iterator():
        source = f"banner:{banner.pk}"
        title = getattr(banner, "title", "") or f"Banner promotion {banner.pk}"
        image = getattr(banner, "image", None)
        image_url = ""
        try:
            image_url = image.url if image else ""
            if image_url and image_url.startswith("/"):
                image_url = settings.FRONTEND_URL.rstrip("/") + image_url
        except Exception:
            image_url = ""
        cta_url = getattr(banner, "cta_url", "") or ""
        if not cta_url and getattr(banner, "cta_item_id", None):
            cta_url = settings.FRONTEND_URL.rstrip("/") + "/item/" + str(banner.cta_item_id)
        campaign, was_created = EmailCampaign.objects.get_or_create(
            campaign_type="banner", source_key=source, prepared_for_date=today,
            defaults={
                "title": f"Banner promotion: {title}"[:200], "subject": title[:255],
                "preheader": getattr(banner, "subtitle", "")[:255],
                "hero_image_url": image_url,
                "body_text": getattr(banner, "subtitle", "") or title,
                "body_html": "<h2>" + title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") + "</h2>",
                "cta_label": "Shop now", "cta_url": cta_url or settings.FRONTEND_URL.rstrip("/") + "/",
                "status": "draft",
            },
        )
        created += int(was_created)
    return {"drafts_created": created}


@shared_task
def prepare_daily_sale_campaigns():
    """Prepare a reviewable sale draft only when actual discounted items exist."""
    from ReactSerializers.models import Item
    today = timezone.localdate()
    fields = {field.name for field in Item._meta.get_fields()}
    if not {"price", "discount_price"}.issubset(fields):
        return {"drafts_created": 0, "reason": "Item price fields are unavailable."}
    qs = Item.objects.filter(discount_price__isnull=False).exclude(discount_price__gte=__import__("django.db.models", fromlist=["F"]).F("price"))
    if "available" in fields:
        qs = qs.filter(available=True)
    items = list(qs.order_by("-id")[:8])
    if not items:
        return {"drafts_created": 0}
    from django.db.models import F
    # Keep the selection snapshot in payload for admin preview; don't invent a sale campaign from no data.
    payload = {"items": [{"id": item.pk, "name": item.name, "price": str(item.price), "discount_price": str(item.discount_price), "image_url": (settings.FRONTEND_URL.rstrip("/") + item.image.url if item.image and item.image.url.startswith("/") else (item.image.url if item.image else ""))} for item in items]}
    campaign, created = EmailCampaign.objects.get_or_create(
        campaign_type="sale", source_key="daily-sale-selection", prepared_for_date=today,
        defaults={"title": "Daily sale items", "subject": "Discover today's deals at Maa Mara Market",
                  "preheader": "Selected items with current discounted prices", "content_payload": payload,
                  "body_text": "Explore selected items and their current prices.", "cta_label": "Shop deals",
                  "cta_url": settings.FRONTEND_URL.rstrip("/") + "/", "status": "draft"}
    )
    return {"drafts_created": int(created)}


@shared_task
def prepare_daily_new_arrivals_campaigns():
    """Prepare a reviewable new-arrivals draft based on recently created items."""
    from ReactSerializers.models import Item
    today = timezone.localdate()
    fields = {field.name for field in Item._meta.get_fields()}
    date_field = next((name for name in ("created_at", "date_added", "created") if name in fields), None)
    if not date_field:
        return {"drafts_created": 0, "reason": "No supported item creation timestamp."}
    items = list(Item.objects.filter(**{date_field + "__date": today}).order_by("-id")[:8])
    if not items:
        return {"drafts_created": 0}
    payload = {"items": [{"id": item.pk, "name": item.name, "price": str(getattr(item, "price", "")), "image_url": (settings.FRONTEND_URL.rstrip("/") + item.image.url if item.image and item.image.url.startswith("/") else (item.image.url if item.image else ""))} for item in items]}
    _, created = EmailCampaign.objects.get_or_create(
        campaign_type="new_arrivals", source_key="daily-new-arrivals", prepared_for_date=today,
        defaults={"title": "New arrivals", "subject": "Meet the latest arrivals at Maa Mara Market",
                  "preheader": "Fresh finds from our marketplace", "content_payload": payload,
                  "body_text": "Discover newly listed items.", "cta_label": "Explore arrivals",
                  "cta_url": settings.FRONTEND_URL.rstrip("/") + "/", "status": "draft"}
    )
    return {"drafts_created": int(created)}


@shared_task
def process_approved_scheduled_campaigns():
    due = EmailCampaign.objects.filter(status="scheduled", scheduled_at__lte=timezone.now()).values_list("id", flat=True)[:100]
    ids = list(due)
    for campaign_id in ids:
        send_email_campaign.delay(campaign_id)
    return {"queued": len(ids)}


@shared_task
def reconcile_campaign_delivery_results():
    """Refresh campaign counters from local SMTP submission results; no open tracking is implied."""
    for campaign in EmailCampaign.objects.filter(status__in=["sent", "failed"]).iterator():
        rows = campaign.recipients
        campaign.sent_count = rows.filter(status="sent").count()
        campaign.failed_count = rows.filter(status="failed").count()
        campaign.recipient_count = rows.count()
        campaign.save(update_fields=["sent_count", "failed_count", "recipient_count", "updated_at"])
    return {"reconciled": EmailCampaign.objects.filter(status__in=["sent", "failed"]).count()}
