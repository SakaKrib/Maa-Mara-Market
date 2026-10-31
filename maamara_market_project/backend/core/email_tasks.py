"""Idempotent campaign delivery and scheduled draft preparation."""
import hashlib
import logging
from datetime import timedelta
from decimal import Decimal

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
    recurrence = (campaign.content_payload or {}).get("recurrence") or {}
    frequency = recurrence.get("frequency", "none")
    if campaign.status == "sent" and frequency in {"daily", "weekly", "monthly", "periodic"} and campaign.scheduled_at:
        from calendar import monthrange
        from datetime import date
        interval = max(1, min(int(recurrence.get("interval", 1) or 1), 365))
        current = campaign.scheduled_at
        if frequency == "weekly":
            next_at = current + timedelta(weeks=interval)
        elif frequency in {"daily", "periodic"}:
            next_at = current + timedelta(days=interval)
        else:
            month_index = current.month - 1 + interval
            year, month = current.year + month_index // 12, month_index % 12 + 1
            next_at = current.replace(year=year, month=month, day=min(current.day, monthrange(year, month)[1]))
        until = str(recurrence.get("until") or "").strip()
        if not until or next_at.date() <= date.fromisoformat(until):
            EmailCampaign.objects.create(
                title=campaign.title, campaign_type=campaign.campaign_type,
                subject=campaign.subject, preheader=campaign.preheader,
                body_html=campaign.body_html, body_text=campaign.body_text,
                hero_image_url=campaign.hero_image_url, cta_label=campaign.cta_label,
                cta_url=campaign.cta_url, content_payload=dict(campaign.content_payload or {}),
                status="scheduled", created_by=campaign.created_by,
                approved_by=campaign.approved_by, scheduled_at=next_at,
            )
    return {"status": campaign.status, "recipients": total, "sent": sent, "failed": failed}


def _auto_send_enabled():
    return bool(getattr(settings, "AUTO_SEND_PROMOTION_CAMPAIGNS", True))


def _publish_campaign(campaign):
    """Approve and queue an automatically prepared campaign when auto-send is on.

    Delivery still goes through send_email_campaign, so consent checks,
    unsubscribe handling and per-recipient idempotency all apply.
    """
    if not _auto_send_enabled() or campaign.status != "draft":
        return False
    campaign.status = "approved"
    campaign.scheduled_at = timezone.now()
    campaign.save(update_fields=["status", "scheduled_at", "updated_at"])
    send_email_campaign.delay(campaign.pk)
    return True


def _absolute_media_url(file_field):
    try:
        url = file_field.url if file_field else ""
    except Exception:
        return ""
    if url and url.startswith("/"):
        url = settings.FRONTEND_URL.rstrip("/") + url
    return url


def _money(value):
    return f"{Decimal(value):,.0f}"


def _recent_campaign_exists(campaign_type, days):
    since = timezone.now() - timedelta(days=days)
    return EmailCampaign.objects.filter(
        campaign_type=campaign_type,
        created_at__gte=since,
        status__in=["approved", "scheduled", "sending", "sent"],
    ).exists()


def discounted_items(limit=30):
    """Every available, in-stock item whose current customer price is below its normal price."""
    from ReactSerializers.models import Item

    candidates = (
        Item.objects.filter(available=True, in_stock__gt=0, discount_price__isnull=False)
        .select_related("offer")
        .order_by("-id")
    )
    rows = []
    for item in candidates.iterator():
        normal = item.get_item_final_price()
        current = item.get_checkout_price()
        if normal is None or current is None or current >= normal or normal <= 0:
            continue
        percent_off = int(((normal - current) / normal * 100).quantize(Decimal("1")))
        if percent_off < 1:
            continue
        rows.append((percent_off, item, normal, current))
    rows.sort(key=lambda r: (-r[0], -r[1].pk))
    return rows[:limit], len(rows)


@shared_task
def prepare_daily_banner_campaigns():
    """Create one campaign per live, approved banner (once per banner) and send it.

    Expired banners are never promoted; a banner that already has a campaign
    is not announced again.
    """
    from shop.models import Banner

    today = timezone.localdate()
    now = timezone.now()
    banners = Banner.objects.filter(
        is_active=True, is_approved=True, start_date__lte=now, end_date__gte=now
    ).order_by("-created_at")
    max_per_run = int(getattr(settings, "PROMO_MAX_BANNER_CAMPAIGNS_PER_RUN", 3))
    created = published = 0
    for banner in banners.iterator():
        if created >= max_per_run:
            break
        source = f"banner:{banner.pk}"
        if EmailCampaign.objects.filter(campaign_type="banner", source_key=source).exists():
            continue
        title = banner.title or f"Banner promotion {banner.pk}"
        cta_url = banner.cta_url or ""
        if not cta_url and banner.cta_item_id:
            cta_url = settings.FRONTEND_URL.rstrip("/") + "/item/" + str(banner.cta_item_id)
        safe_title = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        campaign, was_created = EmailCampaign.objects.get_or_create(
            campaign_type="banner", source_key=source, prepared_for_date=today,
            defaults={
                "title": f"Banner promotion: {title}"[:200], "subject": title[:255],
                "preheader": (banner.subtitle or "")[:255],
                "hero_image_url": _absolute_media_url(banner.image),
                "body_text": banner.subtitle or title,
                "body_html": f"<h2>{safe_title}</h2>",
                "cta_label": "Shop now", "cta_url": cta_url or settings.FRONTEND_URL.rstrip("/") + "/",
                "content_payload": {"banner": {"id": banner.pk, "ends": banner.end_date.isoformat()}},
                "status": "draft",
            },
        )
        if was_created:
            created += 1
            published += int(_publish_campaign(campaign))
    return {"drafts_created": created, "published": published}


@shared_task
def prepare_daily_sale_campaigns():
    """Announce every discounted item in one campaign, when something changed.

    The selection is fingerprinted (items and prices). The same selection is
    never sent twice, and sale campaigns are spaced by
    PROMO_MIN_DAYS_BETWEEN_SALE_CAMPAIGNS days.
    """
    today = timezone.localdate()
    rows, total = discounted_items()
    if not rows:
        return {"drafts_created": 0, "reason": "No discounted items."}
    fingerprint = hashlib.sha256(
        "|".join(f"{item.pk}:{current}" for _, item, _, current in sorted(rows, key=lambda r: r[1].pk)).encode()
    ).hexdigest()
    last = EmailCampaign.objects.filter(campaign_type="sale").exclude(status="cancelled").order_by("-created_at").first()
    if last and (last.content_payload or {}).get("fingerprint") == fingerprint:
        return {"drafts_created": 0, "reason": "Same selection already announced."}
    gap = int(getattr(settings, "PROMO_MIN_DAYS_BETWEEN_SALE_CAMPAIGNS", 3))
    if _recent_campaign_exists("sale", gap):
        return {"drafts_created": 0, "reason": "A sale campaign was sent recently."}
    top = rows[0][0]
    payload = {
        "fingerprint": fingerprint,
        "total_discounted": total,
        "items": [
            {
                "id": item.pk, "name": item.name, "percent_off": percent_off,
                "price": _money(normal), "discount_price": _money(current),
                "image_url": _absolute_media_url(item.image),
            }
            for percent_off, item, normal, current in rows
        ],
    }
    more = total - len(rows)
    body = f"{total} items are on sale right now, with savings of up to {top}%."
    if more > 0:
        body += f" Showing the {len(rows)} biggest discounts."
    campaign, created = EmailCampaign.objects.get_or_create(
        campaign_type="sale", source_key="daily-sale-selection", prepared_for_date=today,
        defaults={
            "title": "Items on sale", "subject": f"Up to {top}% off: {total} items on sale at Maa Mara Market",
            "preheader": "Discounted prices on items you'll love", "content_payload": payload,
            "body_text": body, "body_html": f"<p>{body}</p>", "cta_label": "Shop deals",
            "cta_url": settings.FRONTEND_URL.rstrip("/") + "/", "status": "draft",
        },
    )
    published = _publish_campaign(campaign) if created else False
    return {"drafts_created": int(created), "published": int(published), "items": len(rows)}


@shared_task
def prepare_daily_new_arrivals_campaigns():
    """Announce items listed today; spaced by PROMO_MIN_DAYS_BETWEEN_ARRIVAL_CAMPAIGNS days."""
    from ReactSerializers.models import Item

    today = timezone.localdate()
    items = list(Item.objects.filter(created_at__date=today, available=True).order_by("-id")[:8])
    if not items:
        return {"drafts_created": 0}
    if _recent_campaign_exists("new_arrivals", int(getattr(settings, "PROMO_MIN_DAYS_BETWEEN_ARRIVAL_CAMPAIGNS", 3))):
        return {"drafts_created": 0, "reason": "A new-arrivals campaign was sent recently."}
    payload = {"items": [
        {"id": item.pk, "name": item.name, "price": _money(item.get_item_final_price()),
         "image_url": _absolute_media_url(item.image)}
        for item in items
    ]}
    campaign, created = EmailCampaign.objects.get_or_create(
        campaign_type="new_arrivals", source_key="daily-new-arrivals", prepared_for_date=today,
        defaults={"title": "New arrivals", "subject": "Meet the latest arrivals at Maa Mara Market",
                  "preheader": "Fresh finds from our marketplace", "content_payload": payload,
                  "body_text": "Discover newly listed items.", "cta_label": "Explore arrivals",
                  "cta_url": settings.FRONTEND_URL.rstrip("/") + "/", "status": "draft"}
    )
    published = _publish_campaign(campaign) if created else False
    return {"drafts_created": int(created), "published": int(published)}


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
