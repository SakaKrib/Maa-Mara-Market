"""Admin newsletter and campaign API. Marketing mail is sent only to opted-in subscribers."""
import html
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from .models import EmailCampaign, EmailCampaignRecipient, NewsletterSubscriber

logger = logging.getLogger(__name__)


def _subscriber_payload(row):
    return {
        "id": row.id, "email": row.email, "first_name": row.first_name,
        "is_subscribed": row.is_subscribed, "consent_source": row.consent_source,
        "consented_at": row.consented_at, "unsubscribed_at": row.unsubscribed_at,
        "created_at": row.created_at,
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def newsletter_subscribe(request):
    email = str(request.data.get("email", "")).strip().lower()
    consent = request.data.get("consent")
    if not email or consent is not True:
        return Response({"detail": "A valid email and explicit newsletter consent are required."}, status=status.HTTP_400_BAD_REQUEST)
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    try:
        validate_email(email)
    except ValidationError:
        return Response({"detail": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
    row = NewsletterSubscriber.objects.filter(email__iexact=email).first()
    if row and row.is_subscribed:
        return Response({"detail": "This email is already subscribed."}, status=status.HTTP_200_OK)
    now = timezone.now()
    if row:
        row.first_name = str(request.data.get("first_name", row.first_name))[:150]
        row.consent_given = True
        row.consent_source = str(request.data.get("source", "website"))[:100]
        row.consented_at = now
        row.unsubscribed_at = None
        row.save(update_fields=["first_name", "consent_given", "consent_source", "consented_at", "unsubscribed_at", "updated_at"])
    else:
        row = NewsletterSubscriber.objects.create(
            email=email, first_name=str(request.data.get("first_name", ""))[:150],
            consent_given=True, consent_source=str(request.data.get("source", "website"))[:100],
            consented_at=now,
        )
    return Response({"detail": "Subscription recorded.", "subscribed": True}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def newsletter_unsubscribe(request, token):
    subscriber = NewsletterSubscriber.objects.filter(unsubscribe_token=token).first()
    if not subscriber:
        return HttpResponse("This unsubscribe link is invalid or has expired.", status=404, content_type="text/plain")
    if request.method == "GET":
        page = """<!doctype html><html><meta name="viewport" content="width=device-width"><title>Unsubscribe</title>
        <body style="font-family:Arial,sans-serif;max-width:520px;margin:48px auto;padding:20px;color:#222">
        <h1>Unsubscribe from Maa Mara Market</h1><p>Confirm that you no longer want to receive marketing emails.</p>
        <form method="post"><button style="background:#255d3a;color:white;border:0;border-radius:6px;padding:12px 20px">Confirm unsubscribe</button></form></body></html>"""
        return HttpResponse(page, content_type="text/html")
    subscriber.consent_given = False
    subscriber.unsubscribed_at = timezone.now()
    subscriber.save(update_fields=["consent_given", "unsubscribed_at", "updated_at"])
    return HttpResponse("You have been unsubscribed from Maa Mara Market marketing emails.", content_type="text/plain")


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def newsletter_subscribers(request):
    if request.method == "GET":
        rows = NewsletterSubscriber.objects.all()
        subscribed = request.query_params.get("subscribed")
        if subscribed == "true":
            rows = rows.filter(consent_given=True, unsubscribed_at__isnull=True)
        elif subscribed == "false":
            from django.db.models import Q
            rows = rows.filter(Q(consent_given=False) | Q(unsubscribed_at__isnull=False))
        return Response([_subscriber_payload(row) for row in rows[:1000]])
    email = str(request.data.get("email", "")).strip().lower()
    if not email:
        return Response({"detail": "Email is required."}, status=400)
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    try:
        validate_email(email)
    except ValidationError:
        return Response({"detail": "Enter a valid email address."}, status=400)
    row = NewsletterSubscriber.objects.filter(email__iexact=email).first()
    if not row or not row.is_subscribed:
        return Response({"detail": "Subscribers can only be added by recording explicit consent through the public subscription form."}, status=400)
    return Response(_subscriber_payload(row))


def _frontend_item_url(item_id):
    """Build a public item page URL using the configured frontend origin."""
    if item_id in (None, ""):
        return ""
    frontend_url = str(settings.FRONTEND_URL).strip().rstrip("/")
    return f"{frontend_url}/item/{item_id}"


def _campaign_content(data, existing=None):
    """Normalize featured content and persist durable item destinations."""
    existing_payload = existing.content_payload if existing else {}
    payload = data.get("content_payload", existing_payload)
    payload = dict(payload) if isinstance(payload, dict) else {}
    items = payload.get("items", [])
    items = items if isinstance(items, list) else []
    normalized_items = []
    for item in items:
        if not isinstance(item, dict):
            continue
        snapshot = dict(item)
        item_id = snapshot.get("id")
        if item_id not in (None, ""):
            snapshot["product_url"] = _frontend_item_url(item_id)
        normalized_items.append(snapshot)
    payload["items"] = normalized_items

    banner = payload.get("banner")
    banner_item_id = banner.get("cta_item") if isinstance(banner, dict) else None
    # A featured product is the primary destination; otherwise honour a selected
    # banner's item destination. Keep a manually entered URL only when neither exists.
    primary_item_id = normalized_items[0].get("id") if normalized_items else banner_item_id
    cta_url = data.get("cta_url", existing.cta_url if existing else "")
    if primary_item_id not in (None, ""):
        cta_url = _frontend_item_url(primary_item_id)
    return payload, cta_url


def _campaign_payload(campaign):
    return {
        "id": campaign.id, "title": campaign.title, "campaign_type": campaign.campaign_type,
        "subject": campaign.subject, "preheader": campaign.preheader, "body_html": campaign.body_html,
        "body_text": campaign.body_text, "hero_image_url": campaign.hero_image_url,
        "cta_label": campaign.cta_label, "cta_url": campaign.cta_url, "content_payload": campaign.content_payload, "recurrence": (campaign.content_payload or {}).get("recurrence", {"frequency": "none", "interval": 1, "until": ""}),
        "status": campaign.status, "scheduled_at": campaign.scheduled_at,
        "recipient_count": campaign.recipient_count, "sent_count": campaign.sent_count,
        "failed_count": campaign.failed_count, "created_at": campaign.created_at,
        "updated_at": campaign.updated_at, "sent_at": campaign.sent_at,
        "approved_by": campaign.approved_by_id,
    }


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def email_campaigns(request):
    if request.method == "GET":
        qs = EmailCampaign.objects.all()
        campaign_status = request.query_params.get("status")
        if campaign_status:
            qs = qs.filter(status=campaign_status)
        return Response([_campaign_payload(c) for c in qs[:200]])
    data = request.data
    title, subject = str(data.get("title", "")).strip(), str(data.get("subject", "")).strip()
    if not title or not subject:
        return Response({"detail": "Campaign title and subject are required."}, status=400)
    campaign_type = data.get("campaign_type", "custom")
    if campaign_type not in dict(EmailCampaign.TYPE_CHOICES):
        return Response({"detail": "Unsupported campaign type."}, status=400)
    from django.utils.html import strip_tags
    import bleach
    body_html = bleach.clean(str(data.get("body_html", "")), tags=["p","br","strong","b","em","i","ul","ol","li","a","h2","h3","img","div","span"], attributes={"a":["href","title"],"img":["src","alt","width","height"],"div":["style"],"span":["style"]}, protocols=["http","https","mailto"], strip=True)
    content_payload, cta_url = _campaign_content(data)
    campaign = EmailCampaign.objects.create(
        title=title[:200], subject=subject[:255], campaign_type=campaign_type,
        preheader=str(data.get("preheader", ""))[:255], body_html=body_html,
        body_text=str(data.get("body_text", "") or strip_tags(body_html)),
        hero_image_url=str(data.get("hero_image_url", "")), cta_label=str(data.get("cta_label", "Shop now"))[:80],
        cta_url=str(cta_url or ""), content_payload=content_payload,
        status="draft", created_by=request.user,
    )
    return Response(_campaign_payload(campaign), status=201)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAdminUser])
def email_campaign_detail(request, campaign_id):
    campaign = EmailCampaign.objects.filter(pk=campaign_id).first()
    if not campaign:
        return Response({"detail": "Campaign not found."}, status=404)
    if request.method == "GET":
        return Response(_campaign_payload(campaign))
    if request.method == "DELETE":
        if campaign.status in {"sending", "sent"}:
            return Response({"detail": "A sending or sent campaign cannot be deleted."}, status=409)
        campaign.delete()
        return Response(status=204)
    if campaign.status in {"sending", "sent"}:
        return Response({"detail": "A sending or sent campaign cannot be edited."}, status=409)
    allowed = ["title", "subject", "preheader", "body_html", "body_text", "hero_image_url", "cta_label", "cta_url", "content_payload", "campaign_type", "scheduled_at"]
    for key in allowed:
        if key in request.data:
            value = request.data[key]
            if key == "campaign_type" and value not in dict(EmailCampaign.TYPE_CHOICES):
                return Response({"detail": "Unsupported campaign type."}, status=400)
            if key == "body_html":
                import bleach
                value = bleach.clean(str(value), tags=["p","br","strong","b","em","i","ul","ol","li","a","h2","h3","img","div","span"], attributes={"a":["href","title"],"img":["src","alt","width","height"],"div":["style"],"span":["style"]}, protocols=["http","https","mailto"], strip=True)
            setattr(campaign, key, value)
    if "content_payload" in request.data or "cta_url" in request.data:
        content_payload, cta_url = _campaign_content(request.data, existing=campaign)
        campaign.content_payload = content_payload
        campaign.cta_url = str(cta_url or "")
    if not campaign.title.strip() or not campaign.subject.strip():
        return Response({"detail": "Campaign title and subject are required."}, status=400)
    campaign.status = "draft"
    campaign.save()
    return Response(_campaign_payload(campaign))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def email_campaign_action(request, campaign_id, action):
    campaign = EmailCampaign.objects.filter(pk=campaign_id).first()
    if not campaign:
        return Response({"detail": "Campaign not found."}, status=404)
    if action == "submit":
        if campaign.status != "draft":
            return Response({"detail": "Only drafts can be submitted for approval."}, status=409)
        campaign.status = "pending_approval"
        campaign.save(update_fields=["status", "updated_at"])
    elif action == "approve":
        if campaign.status not in {"pending_approval", "draft"}:
            return Response({"detail": "Only draft or pending campaigns can be approved."}, status=409)
        campaign.status = "approved"
        campaign.approved_by = request.user
        campaign.save(update_fields=["status", "approved_by", "updated_at"])
    elif action == "schedule":
        scheduled_at = request.data.get("scheduled_at")
        if not scheduled_at:
            return Response({"detail": "scheduled_at is required."}, status=400)
        from django.utils.dateparse import parse_datetime
        dt = parse_datetime(str(scheduled_at))
        if not dt or not timezone.is_aware(dt) or dt <= timezone.now():
            return Response({"detail": "Provide a future timezone-aware scheduled_at timestamp."}, status=400)
        if campaign.status != "approved":
            return Response({"detail": "Approve the campaign before scheduling it."}, status=409)
        recurrence = request.data.get("recurrence") or {}
        frequency = str(recurrence.get("frequency", "none")).lower()
        if frequency not in {"none", "daily", "weekly", "monthly", "periodic"}:
            return Response({"detail": "Choose a valid repeat frequency."}, status=400)
        try:
            interval = int(recurrence.get("interval", 1))
        except (TypeError, ValueError):
            return Response({"detail": "Repeat interval must be a whole number."}, status=400)
        if interval < 1 or interval > 365:
            return Response({"detail": "Repeat interval must be between 1 and 365."}, status=400)
        until = str(recurrence.get("until", "") or "").strip()
        if until:
            from datetime import date
            try:
                until_date = date.fromisoformat(until)
            except ValueError:
                return Response({"detail": "Repeat-until date must use YYYY-MM-DD."}, status=400)
            if until_date < dt.date():
                return Response({"detail": "Repeat-until date must be on or after the first send date."}, status=400)
        payload = dict(campaign.content_payload or {})
        payload["recurrence"] = {"frequency": frequency, "interval": interval, "until": until}
        campaign.content_payload = payload
        campaign.scheduled_at = dt
        campaign.status = "scheduled"
        campaign.save(update_fields=["content_payload", "scheduled_at", "status", "updated_at"])
    elif action == "send":
        if campaign.status not in {"approved", "scheduled"}:
            return Response({"detail": "Campaign must be approved before sending."}, status=409)
        if campaign.scheduled_at and campaign.scheduled_at > timezone.now():
            return Response({"detail": "This campaign is scheduled for a future time."}, status=409)
        from .email_tasks import send_email_campaign
        send_email_campaign.delay(campaign.id)
    elif action == "cancel":
        if campaign.status not in {"draft", "pending_approval", "approved", "scheduled", "failed"}:
            return Response({"detail": "This campaign can no longer be cancelled."}, status=409)
        campaign.status = "cancelled"
        campaign.save(update_fields=["status", "updated_at"])
    elif action == "preview":
        preview_html = render_to_string("emails/marketing_campaign.html", {
            "campaign": campaign, "frontend_url": settings.FRONTEND_URL.rstrip("/"),
            "company_address": getattr(settings, "COMPANY_ADDRESS", ""),
            "unsubscribe_url": "#unsubscribe-preview",
        })
        return HttpResponse(preview_html, content_type="text/html")
    else:
        return Response({"detail": "Unknown campaign action."}, status=400)
    campaign.refresh_from_db()
    return Response(_campaign_payload(campaign))


@api_view(["GET"])
@permission_classes([IsAdminUser])
def email_campaign_report(request, campaign_id):
    campaign = EmailCampaign.objects.filter(pk=campaign_id).first()
    if not campaign:
        return Response({"detail": "Campaign not found."}, status=404)
    from django.db.models import Count, Q
    counts = campaign.recipients.aggregate(
        total=Count("id"), sent=Count("id", filter=Q(status="sent")),
        failed=Count("id", filter=Q(status="failed")), pending=Count("id", filter=Q(status="pending")),
        suppressed=Count("id", filter=Q(status="suppressed")),
    )
    return Response({"campaign": _campaign_payload(campaign), "recipients": counts,
                     "delivery_note": "Sent means accepted by the configured email backend; it does not prove inbox delivery or opens."})
