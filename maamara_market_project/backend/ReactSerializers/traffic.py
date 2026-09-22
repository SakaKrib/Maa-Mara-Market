from collections import Counter
from datetime import timedelta
from ipaddress import ip_address

import requests
from django.db.models import Count
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import TrafficEvent, ItemView


_GEO_CACHE = {}


def _client_ip(request):
    # Only trust forwarding headers when they are populated by the deployment proxy.
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or None


def _country_from_request(request, ip):
    code = (
        request.META.get("HTTP_CF_IPCOUNTRY")
        or request.META.get("HTTP_X_COUNTRY_CODE")
        or request.META.get("HTTP_X_GEO_COUNTRY")
        or ""
    ).upper()
    if code and code != "XX":
        return code, ""

    if not ip:
        return "", ""
    try:
        parsed = ip_address(ip)
        if parsed.is_private or parsed.is_loopback or parsed.is_reserved:
            return "", ""
    except ValueError:
        return "", ""

    if ip in _GEO_CACHE:
        return _GEO_CACHE[ip]

    # Best-effort fallback. Tracking must never fail because geolocation is unavailable.
    try:
        response = requests.get(
            f"https://ipapi.co/{ip}/json/",
            timeout=1.5,
            headers={"User-Agent": "Maa-Mara-Market-Traffic/1.0"},
        )
        data = response.json() if response.ok else {}
        result = ((data.get("country_code") or "").upper(), data.get("country_name") or "")
    except Exception:
        result = ("", "")

    if len(_GEO_CACHE) > 5000:
        _GEO_CACHE.clear()
    _GEO_CACHE[ip] = result
    return result


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
    visitor_id = request.COOKIES.get("visitorId") or str(request.data.get("visitor_id") or "").strip()[:255] or None
    session_id = str(request.data.get("session_id") or "").strip()[:255] or None
    user_agent = request.META.get("HTTP_USER_AGENT", "")[:2000]
    ip = _client_ip(request)
    country_code, country_name = _country_from_request(request, ip)

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

    visitor_rows = events.values("visitor_id", "user_id").distinct()
    unique_visitor_keys = set()
    for row in visitor_rows:
        key = row["visitor_id"] or (f"user:{row['user_id']}" if row["user_id"] else None)
        if key:
            unique_visitor_keys.add(key)

    sessions = events.exclude(session_id="").values("session_id").distinct().count()
    landing_events = TrafficEvent.objects.filter(event_type="session_start", created_at__gte=start)

    def grouped(field, limit=10, queryset=None):
        queryset = queryset or events
        lookup = field + "__exact"
        return list(queryset.values(field).exclude(**{lookup: ""}).annotate(count=Count("id")).order_by("-count")[:limit])

    source_data = grouped("source")
    country_data = grouped("country_code")
    device_data = grouped("device_type")
    page_data = grouped("path", queryset=landing_events)

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
    session_starts = events.filter(event_type="session_start")
    event_rows = events.filter(event_type="event")

    visitor_keys = set()
    for row in page_views.values("visitor_id", "user_id"):
        key = row["visitor_id"] or (f"user:{row['user_id']}" if row["user_id"] else None)
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
    countries = grouped("country_code", 30)
    sources = grouped("source", 20)
    devices = grouped("device_type", 10)

    # Funnel milestones are derived from actual storefront routes/events.
    # Counts are distinct visitor/session keys, so repeated refreshes do not
    # inflate the number of people reaching a milestone.
    def milestone_count(predicate):
        qs = event_rows.filter(path__icontains=predicate)
        keys = set()
        for row in qs.values("visitor_id", "user_id", "session_id"):
            key = row["session_id"] or row["visitor_id"] or (f"user:{row['user_id']}" if row["user_id"] else None)
            if key:
                keys.add(key)
        return len(keys)

    goals = [
        {"key": "product_interest", "label": "Viewed a product", "count": milestone_count("/item/")},
        {"key": "cart_intent", "label": "Reached the cart", "count": milestone_count("shopping-cart")},
        {"key": "checkout_start", "label": "Started checkout", "count": milestone_count("checkout-page")},
        {"key": "purchase_complete", "label": "Reached payment success", "count": milestone_count("payment-success")},
    ]

    recent_sessions = []
    session_ids = list(
        page_views.exclude(session_id__isnull=True)
        .exclude(session_id="")
        .values_list("session_id", flat=True)
        .distinct()
    )[:40]
    for session_id in session_ids:
        rows = list(
            page_views.filter(session_id=session_id)
            .order_by("created_at")
            .values("path", "created_at")[:50]
        )
        if rows:
            recent_sessions.append({
                "session_id": session_id,
                "started_at": rows[0]["created_at"],
                "last_seen": rows[-1]["created_at"],
                "pages": [row["path"] for row in rows],
                "page_count": len(rows),
            })

    return Response({
        "period_days": days,
        "summary": {
            "page_views": page_views.count(),
            "unique_visitors": len(visitor_keys),
            "sessions": page_views.exclude(session_id__isnull=True).exclude(session_id="").values("session_id").distinct().count(),
            "countries": countries.__len__(),
            "pages": pages.__len__(),
            "events": event_rows.count(),
        },
        "trend": trend,
        "pages": pages,
        "countries": countries,
        "sources": sources,
        "devices": devices,
        "goals": goals,
        "recent_sessions": recent_sessions,
    })
