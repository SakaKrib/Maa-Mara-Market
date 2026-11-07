from collections import Counter
from datetime import timedelta
from ipaddress import ip_address

import requests
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import TrafficEvent, ItemView


_GEO_CACHE = {}

def _visitor_user_map(page_views):
    """Map browser IDs to an account only when that browser has one unambiguous account."""
    visitor_ids = list(
        page_views.exclude(visitor_id__isnull=True)
        .exclude(visitor_id="")
        .values_list("visitor_id", flat=True)
        .distinct()
    )
    if not visitor_ids:
        return {}

    users_by_visitor = {}
    associations = TrafficEvent.objects.filter(
        visitor_id__in=visitor_ids, user_id__isnull=False
    ).values_list("visitor_id", "user_id").distinct()
    for visitor_id, user_id in associations:
        users_by_visitor.setdefault(visitor_id, set()).add(user_id)

    return {
        visitor_id: next(iter(user_ids))
        for visitor_id, user_ids in users_by_visitor.items()
        if len(user_ids) == 1
    }


def _visitor_identity_key(visitor_id=None, user_id=None, session_id=None, visitor_user_map=None):
    """Prefer an account identity; otherwise retain the anonymous browser identity."""
    resolved_user_id = user_id or (visitor_user_map or {}).get(visitor_id)
    if resolved_user_id:
        return "user:" + str(resolved_user_id)
    if visitor_id:
        return "visitor:" + str(visitor_id)
    if session_id:
        return "session:" + str(session_id)
    return None


def _landing_page_counts(page_views):
    """Count the first recorded page in each session, independent of start markers."""
    first_pages = {}
    rows = page_views.order_by("created_at", "id").values("id", "path", "session_id")
    for row in rows.iterator():
        session_key = row["session_id"] or ("event:" + str(row["id"]))
        first_pages.setdefault(session_key, row["path"])
    counts = Counter(first_pages.values())
    return [{"path": path, "count": count} for path, count in counts.most_common(20)]




def _client_ip(request):
    # Only trust forwarding headers when they are populated by the deployment proxy.
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or None


def _country_from_request(request, ip, timezone_name=""):
    from .traffic_geo import resolve_country

    return resolve_country(request.META, ip, timezone_name)


def _source_from_payload(source, referrer, path):
    source = (source or "").strip().lower()
    if source:
        return source[:120]
    if not referrer:
        return "direct"
    ref = referrer.lower()
    if "google." in ref:
        return "google"
    if "bing." in ref:
        return "bing"
    if "duckduckgo." in ref:
        return "duckduckgo"
    if any(host in ref for host in ("facebook.com", "instagram.com", "t.co", "x.com", "twitter.com", "linkedin.com", "youtube.com", "tiktok.com")):
        return "social"
    try:
        from urllib.parse import urlparse
        return (urlparse(ref).hostname or "referral")[:120]
    except Exception:
        return "referral"


def _device_type(user_agent):
    ua = (user_agent or "").lower()
    if any(token in ua for token in ("ipad", "tablet", "android 3", "android 4", "android 5", "android 6", "android 7", "android 8", "android 9", "android 10", "android 11", "android 12", "android 13", "android 14")) and "mobile" not in ua:
        return "tablet"
    if any(token in ua for token in ("mobile", "iphone", "ipod", "android")):
        return "mobile"
    if ua:
        return "desktop"
    return "unknown"


@api_view(["POST"])
@permission_classes([AllowAny])
def record_traffic_event(request):
    """Record a storefront route/event without changing the customer UI."""
    path = str(request.data.get("path") or "/").strip()[:1000]
    event_type = str(request.data.get("event_type") or "page_view").strip()
    if event_type not in {"page_view", "session_start", "event"}:
        event_type = "event"

    referrer = str(request.data.get("referrer") or "").strip()[:2000]
    source = _source_from_payload(request.data.get("source"), referrer, path)
    medium = str(request.data.get("medium") or "").strip()[:120]
    campaign = str(request.data.get("campaign") or "").strip()[:255]
    visitor_id = str(request.data.get("visitor_id") or request.COOKIES.get("visitorId") or "").strip()[:255] or None
    session_id = str(request.data.get("session_id") or "").strip()[:255] or None
    user_agent = request.META.get("HTTP_USER_AGENT", "")[:2000]
    ip = _client_ip(request)
    timezone_name = str(request.data.get("timezone") or "").strip()[:64]
    country_code, country_name = _country_from_request(request, ip, timezone_name)

    # A browser session has one start marker. Replayed effects or parallel
    # bootstrap requests must not create duplicate session-start activities.
    if event_type == "session_start" and session_id and TrafficEvent.objects.filter(
        session_id=session_id, event_type="session_start"
    ).exists():
        return Response({"recorded": False, "duplicate": True}, status=status.HTTP_200_OK)

    TrafficEvent.objects.create(
        user=request.user if getattr(request.user, "is_authenticated", False) else None,
        visitor_id=visitor_id,
        session_id=session_id,
        event_type=event_type,
        path=path,
        referrer=referrer,
        source=source,
        medium=medium,
        campaign=campaign,
        ip_address=ip,
        country_code=country_code,
        country_name=country_name,
        device_type=_device_type(user_agent),
        user_agent=user_agent,
    )
    return Response({"recorded": True}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def traffic_analytics(request):
    try:
        days = max(1, min(int(request.GET.get("days", 30)), 90))
    except (TypeError, ValueError):
        days = 30

    now = timezone.now()
    start = now - timedelta(days=days)
    previous_start = start - timedelta(days=days)
    events = TrafficEvent.objects.filter(event_type="page_view", created_at__gte=start)
    previous_events = TrafficEvent.objects.filter(event_type="page_view", created_at__gte=previous_start, created_at__lt=start)

    current_count = events.count()
    previous_count = previous_events.count()
    growth = round(((current_count - previous_count) / previous_count) * 100, 1) if previous_count else (100.0 if current_count else 0.0)

    visitor_user_map = _visitor_user_map(events)
    visitor_rows = events.values("visitor_id", "user_id", "session_id").distinct()
    unique_visitor_keys = set()
    for row in visitor_rows:
        key = _visitor_identity_key(row["visitor_id"], row["user_id"], row["session_id"], visitor_user_map)
        if key:
            unique_visitor_keys.add(key)

    sessions = events.exclude(session_id="").values("session_id").distinct().count()

    def grouped(field, limit=10, queryset=None):
        queryset = queryset or events
        lookup = field + "__exact"
        return list(queryset.values(field).exclude(**{lookup: ""}).annotate(count=Count("id")).order_by("-count")[:limit])

    source_data = grouped("source")
    country_data = grouped("country_code")
    device_data = grouped("device_type")
    page_data = _landing_page_counts(events)

    trend_counter = Counter()
    for value in events.values_list("created_at", flat=True):
        trend_counter[timezone.localtime(value).date().isoformat()] += 1
    trend = [{"date": key, "visits": trend_counter[key]} for key in sorted(trend_counter)]

    item_views = ItemView.objects.filter(viewed_at__gte=start).count()

    return Response({
        "period_days": days,
        "total_visits": current_count,
        "page_views": current_count,
        "unique_visitors": len(unique_visitor_keys),
        "sessions": sessions,
        "growth_percent": growth,
        "item_views": item_views,
        "trend": trend,
        "sources": source_data,
        "countries": country_data,
        "devices": device_data,
        "landing_pages": page_data,
    })


@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def clear_inbound_traffic(request):
    """Reset first-party inbound and product-view analytics without touching commerce data."""
    if request.data.get("confirmation") != "CLEAR INBOUND TRAFFIC":
        return Response(
            {"error": "Confirmation phrase did not match. No analytics were deleted."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        traffic_deleted, _ = TrafficEvent.objects.all().delete()
        item_views_deleted, _ = ItemView.objects.all().delete()

    return Response({
        "cleared": True,
        "traffic_events_deleted": traffic_deleted,
        "product_views_deleted": item_views_deleted,
        "message": "Inbound traffic analytics have been reset.",
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def inbound_traffic_analytics(request):
    """Detailed first-party storefront journey analytics for the admin inbound dashboard."""
    try:
        days = max(1, min(int(request.GET.get("days", 30)), 90))
    except (TypeError, ValueError):
        days = 30

    now = timezone.now()
    start = now - timedelta(days=days)
    events = TrafficEvent.objects.filter(created_at__gte=start)

    page_views = events.filter(event_type="page_view")
    event_rows = events.filter(event_type="event")

    visitor_user_map = _visitor_user_map(page_views)
    visitor_keys = set()
    for row in page_views.values("visitor_id", "user_id", "session_id"):
        key = _visitor_identity_key(row["visitor_id"], row["user_id"], row["session_id"], visitor_user_map)
        if key:
            visitor_keys.add(key)

    sessions = list(
        page_views.exclude(session_id__isnull=True)
        .exclude(session_id="")
        .values("session_id")
        .annotate(first_seen=Count("id"))
    )

    trend_counter = Counter()
    for value in page_views.values_list("created_at", flat=True):
        trend_counter[timezone.localtime(value).date().isoformat()] += 1

    trend = [
        {"date": key, "page_views": trend_counter[key]}
        for key in sorted(trend_counter)
    ]

    def grouped(field, limit=20, queryset=page_views):
        return list(
            queryset.exclude(**{f"{field}__exact": ""})
            .values(field)
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )

    pages = grouped("path", 50)
    countries = list(
        page_views.exclude(country_code="")
        .values("country_code", "country_name")
        .annotate(count=Count("id"))
        .order_by("-count")[:30]
    )
    # Keep the geography card useful even when the provider only gives a
    # country code. The browser should never have to display a blank country.
    from .traffic_geo import country_name_for

    for row in countries:
        row["country_name"] = row["country_name"] or country_name_for(row["country_code"]) or "Unknown"
    sources = grouped("source", 20)
    devices = grouped("device_type", 10)
    top_items = list(
        ItemView.objects.filter(viewed_at__gte=start)
        .values("item_id", "item__name")
        .annotate(count=Count("id"))
        .order_by("-count")[:20]
    )

    # Funnel milestones are derived from actual storefront routes/events.
    # Counts are distinct visitor/session keys, so repeated refreshes do not
    # inflate the number of people reaching a milestone.
    def milestone_count(predicate):
        qs = page_views.filter(path__icontains=predicate)
        keys = set()
        for row in qs.values("visitor_id", "user_id", "session_id"):
            key = _visitor_identity_key(row["visitor_id"], row["user_id"], row["session_id"], visitor_user_map)
            if key:
                keys.add(key)
        return len(keys)

    goals = [
        {"key": "product_interest", "label": "Viewed a product", "count": milestone_count("/item/")},
        {"key": "cart_intent", "label": "Reached the cart", "count": milestone_count("shopping-cart")},
        {"key": "checkout_start", "label": "Started checkout", "count": milestone_count("checkout-page")},
        {"key": "purchase_complete", "label": "Reached payment success", "count": milestone_count("payment-success")},
    ]

    # Build one row per visitor identity, not one row per browser session.
    # A visitor may open several sessions; their pages remain in one journey.
    recent_visitor_groups = {}
    visitor_rows = page_views.order_by("-created_at").values(
        "visitor_id", "session_id", "user_id", "user__username", "user__email",
    )
    for row in visitor_rows.iterator():
        visitor_id = row["visitor_id"] or ""
        user_id = row["user_id"]
        session_id = row["session_id"] or ""
        resolved_user_id = user_id or visitor_user_map.get(visitor_id)
        visitor_key = _visitor_identity_key(visitor_id, resolved_user_id, session_id, visitor_user_map)
        if not visitor_key:
            continue
        if visitor_key not in recent_visitor_groups:
            recent_visitor_groups[visitor_key] = {
                "visitor_key": visitor_key,
                "visitor_id": visitor_id,
                "user_id": resolved_user_id,
                "latest_session_id": session_id,
            }
        if len(recent_visitor_groups) >= 40:
            break

    recent_visitors = []
    for visitor_key, identity in recent_visitor_groups.items():
        if identity["user_id"]:
            linked_visitor_ids = [
                visitor_id for visitor_id, mapped_user_id in visitor_user_map.items()
                if mapped_user_id == identity["user_id"]
            ]
            visitor_events = events.filter(
                Q(user_id=identity["user_id"]) | Q(visitor_id__in=linked_visitor_ids)
            )
        elif identity["visitor_id"]:
            visitor_events = events.filter(visitor_id=identity["visitor_id"])
        else:
            visitor_events = events.filter(session_id=identity["latest_session_id"])

        rows = list(
            visitor_events.order_by("created_at").values(
                "path", "created_at", "event_type", "source", "medium", "campaign",
                "referrer", "country_code", "country_name", "device_type", "session_id",
                "user_id", "user__username", "user__email",
            )[:500]
        )
        if not rows:
            continue

        page_rows = [row for row in rows if row["event_type"] == "page_view"]
        first = rows[0]
        last = rows[-1]
        visitor_user_id = next((row["user_id"] for row in reversed(rows) if row["user_id"]), None)
        visitor_username = next((row["user__username"] for row in reversed(rows) if row["user__username"]), "")
        visitor_email = next((row["user__email"] for row in reversed(rows) if row["user__email"]), "")

        recent_visitors.append({
            "visitor_key": visitor_key,
            "visitor_id": identity["visitor_id"],
            "visitor_label": visitor_username or visitor_email or (
                f"Visitor {identity['visitor_id'][:8]}" if identity["visitor_id"] else "Unidentified visitor"
            ),
            "started_at": first["created_at"],
            "last_seen": last["created_at"],
            "page_count": visitor_events.filter(event_type="page_view").count(),
            "event_count": visitor_events.exclude(event_type="session_start").count(),
            "session_count": visitor_events.exclude(session_id__isnull=True).exclude(session_id="").values("session_id").distinct().count(),
            "country_code": last["country_code"] or first["country_code"] or "",
            "country_name": last["country_name"] or first["country_name"] or last["country_code"] or "Unknown",
            "source": first["source"] or "direct",
            "device_type": last["device_type"] or first["device_type"] or "unknown",
            "referrer": first["referrer"] or "",
            "user": {
                "id": visitor_user_id,
                "username": visitor_username,
                "email": visitor_email,
            } if visitor_user_id else None,
            "pages": [
                {
                    "path": row["path"],
                    "event_type": row["event_type"],
                    "created_at": row["created_at"],
                    "session_id": row["session_id"] or "",
                    "source": row["source"] or "direct",
                }
                for row in page_rows
            ],
        })

    recent_visitors.sort(key=lambda item: item["last_seen"], reverse=True)
    # Keep the legacy key during rollout, with the new visitor-level semantics.
    recent_sessions = recent_visitors

    return Response({
        "period_days": days,
        "summary": {
            "page_views": page_views.count(),
            "unique_visitors": len(visitor_keys),
            "sessions": page_views.exclude(session_id__isnull=True).exclude(session_id="").values("session_id").distinct().count(),
            "countries": len(countries),
            "pages": pages.__len__(),
            # Session-start markers are summarized separately; don't present them
            # as customer activity in the visitor counts.
            "events": page_views.count() + event_rows.count(),
            "custom_events": event_rows.count(),
            "unlocated_views": page_views.filter(country_code="").count(),
        },
        "trend": trend,
        "pages": pages,
        "countries": countries,
        "sources": sources,
        "devices": devices,
        "top_items": top_items,
        "goals": goals,
        "recent_visitors": recent_visitors,
        "recent_sessions": recent_sessions,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def inbound_traffic_visitor_detail(request, visitor_key):
    """Return one visitor's chronological activity across all their sessions."""
    prefix, separator, identity = visitor_key.partition(":")
    if not separator or not identity:
        return Response({"error": "Visitor not found."}, status=status.HTTP_404_NOT_FOUND)

    if prefix == "visitor":
        events = TrafficEvent.objects.filter(visitor_id=identity)
    elif prefix == "user" and identity.isdigit():
        events = TrafficEvent.objects.filter(user_id=int(identity))
    elif prefix == "session":
        events = TrafficEvent.objects.filter(session_id=identity)
    else:
        return Response({"error": "Visitor not found."}, status=status.HTTP_404_NOT_FOUND)

    rows = list(
        events.select_related("user").order_by("created_at").values(
            "id", "event_type", "path", "created_at", "referrer", "source",
            "medium", "campaign", "country_code", "country_name", "device_type",
            "session_id", "user_id", "user__username", "user__email",
        )
    )
    if not rows:
        return Response({"error": "Visitor not found."}, status=status.HTTP_404_NOT_FOUND)

    activity_rows = [row for row in rows if row["event_type"] != "session_start"]
    page_rows = [row for row in rows if row["event_type"] == "page_view"]
    first, last = rows[0], rows[-1]
    user_id = next((row["user_id"] for row in reversed(rows) if row["user_id"]), None)
    username = next((row["user__username"] for row in reversed(rows) if row["user__username"]), "")
    email = next((row["user__email"] for row in reversed(rows) if row["user__email"]), "")

    return Response({
        "visitor_key": visitor_key,
        "visitor_id": identity if prefix == "visitor" else "",
        "started_at": first["created_at"],
        "last_seen": last["created_at"],
        "session_count": len({row["session_id"] for row in rows if row["session_id"]}),
        "page_count": len(page_rows),
        "country_code": last["country_code"] or first["country_code"] or "",
        "country_name": last["country_name"] or first["country_name"] or last["country_code"] or "Unknown",
        "device_type": last["device_type"] or first["device_type"] or "unknown",
        "source": first["source"] or "direct",
        "referrer": first["referrer"] or "",
        "user": {"id": user_id, "username": username, "email": email} if user_id else None,
        "activity": [
            {
                "id": row["id"],
                "event_type": row["event_type"],
                "path": row["path"],
                "created_at": row["created_at"],
                "referrer": row["referrer"] or "",
                "source": row["source"] or "direct",
                "medium": row["medium"] or "",
                "campaign": row["campaign"] or "",
                "session_id": row["session_id"] or "",
            }
            for row in activity_rows
        ],
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def inbound_traffic_session_detail(request, session_id):
    """Return the complete first-party activity timeline for one tracked session."""
    events = (
        TrafficEvent.objects.filter(session_id=session_id)
        .select_related("user")
        .order_by("created_at")
    )
    if not events.exists():
        return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

    rows = list(
        events.values(
            "id", "event_type", "path", "created_at", "referrer", "source",
            "medium", "campaign", "country_code", "country_name", "device_type",
            "user_id", "user__username", "user__email",
        )
    )
    first = rows[0]
    return Response({
        "session_id": session_id,
        "visitor_id": events.values_list("visitor_id", flat=True).first() or "",
        "country_code": first["country_code"] or "",
        "country_name": first["country_name"] or first["country_code"] or "Unknown",
        "device_type": first["device_type"] or "unknown",
        "source": first["source"] or "direct",
        "referrer": first["referrer"] or "",
        "user": {
            "id": first["user_id"],
            "username": first["user__username"] or "",
            "email": first["user__email"] or "",
        } if first["user_id"] else None,
        "activity": [
            {
                "id": row["id"],
                "event_type": row["event_type"],
                "path": row["path"],
                "created_at": row["created_at"],
                "referrer": row["referrer"] or "",
                "source": row["source"] or "direct",
                "medium": row["medium"] or "",
                "campaign": row["campaign"] or "",
            }
            for row in rows
        ],
    })
