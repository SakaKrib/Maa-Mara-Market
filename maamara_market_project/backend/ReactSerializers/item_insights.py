"""Sales insights for one catalogue item, with optional Gemini suggestions.

``item_insights`` returns the item's own numbers (daily views and sales, stock,
price, offer state, wishlist, reviews) plus plain, rule-based observations, so
the vendor always gets a useful report even if the AI service is unavailable.

``item_ai_suggestions`` gives those same numbers to Gemini, which may use Google
Search to compare against other shops, and returns a structured list of
suggestions. Nothing here changes a price or an offer: the vendor decides, and
every change still goes through the existing item editing rules.
"""
import json
import logging
import re
from datetime import timedelta

import requests
from django.conf import settings
from django.core.cache import cache
from django.db.models import DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from order.fulfillment import _resolve_item_vendor
from order.models import OrderItem
from shop.models import Review, Wishlist

from .item_insights_ai_schema import SUGGESTION_SCHEMA
from .models import Item, ItemView

logger = logging.getLogger(__name__)

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"
ALLOWED_RANGES = (7, 30, 90)
AI_CACHE_SECONDS = 30 * 60
AI_COOLDOWN_SECONDS = 20

PAID_ORDER = Q(order__payment__status__iexact="paid") | Q(order__payment__status__iexact="completed")


def _dec(value):
    return float(value or 0)


def _can_access(user, item):
    if user.is_staff:
        return True
    vendor = getattr(user, "vendor", None)
    owner = _resolve_item_vendor(item)
    return bool(vendor and owner is not None and owner.pk == vendor.pk)


def _range_days(request):
    try:
        days = int(request.query_params.get("days") or request.data.get("days") or 30)
    except (TypeError, ValueError):
        days = 30
    return days if days in ALLOWED_RANGES else 30


def _series(item, start_day, days):
    """Per-day views, units sold and revenue, with zero-filled gaps."""
    views = {}
    for day in ItemView.objects.filter(item=item, view_date__gte=start_day).values_list("view_date", flat=True):
        views[day] = views.get(day, 0) + 1

    sales = {}
    rows = (
        OrderItem.objects.filter(PAID_ORDER, item=item, ordered_date__date__gte=start_day, refunded=False)
        .annotate(day=TruncDate("ordered_date"))
        .values("day")
        .annotate(
            units=Sum("quantity"),
            revenue=Sum(ExpressionWrapper(F("price_at_purchase") * F("quantity"),
                                          output_field=DecimalField(max_digits=14, decimal_places=2))),
        )
    )
    for row in rows:
        sales[row["day"]] = (int(row["units"] or 0), _dec(row["revenue"]))

    points = []
    for offset in range(days):
        day = start_day + timedelta(days=offset)
        units, revenue = sales.get(day, (0, 0.0))
        points.append({"date": day.isoformat(), "views": views.get(day, 0), "units": units, "revenue": revenue})
    return points


def _rule_based_observations(m):
    """Plain-language findings from the numbers alone (no AI, no guessing)."""
    notes = []
    views, units, days = m["views"], m["units_sold"], m["range_days"]
    conv = m["conversion_rate"]
    if m["status"] == "not_moving":
        notes.append({"level": "warning", "text": f"No sales in the last {days} days."})
    if views < 10 * (days / 30):
        notes.append({"level": "warning", "text": "Very few people are viewing this item. Better photos, a clearer name, or a short offer can bring more visitors."})
    elif units == 0:
        notes.append({"level": "warning", "text": f"{views} people looked at this item but nobody bought. Price, delivery cost or the description may be putting buyers off."})
    elif conv is not None and conv < 1:
        notes.append({"level": "info", "text": f"Only {conv}% of views turn into a sale. A small discount or clearer details often lifts this."})
    if m["stock"] is not None and m["stock"] == 0:
        notes.append({"level": "critical", "text": "This item is out of stock, so it cannot sell."})
    elif m["stock"] is not None and m["stock"] <= 3 and units > 0:
        notes.append({"level": "info", "text": f"Only {m['stock']} left in stock while it is selling. Restock soon."})
    if m["review_count"] == 0 and units > 0:
        notes.append({"level": "info", "text": "Buyers have not left reviews yet. Reviews build trust for new shoppers."})
    elif m["review_average"] and m["review_average"] < 3.5:
        notes.append({"level": "warning", "text": f"Average rating is {m['review_average']}/5, which can slow sales. Read the low reviews and fix what they mention."})
    if m["wishlist_count"] >= 3 and units == 0:
        notes.append({"level": "info", "text": f"{m['wishlist_count']} people saved this item. A time-limited offer could turn those saves into orders."})
    if m["offer"] and m["offer"]["seconds_remaining"] < 2 * 86400:
        notes.append({"level": "info", "text": "The offer ends soon. Decide now whether to extend it or let the price return to normal."})
    if not notes:
        notes.append({"level": "good", "text": "This item is performing steadily. Keep stock available and watch the trend."})
    return notes


def _status(units, views, days):
    if units == 0:
        return "not_moving"
    per_month = units * (30 / days)
    if per_month >= 8:
        return "fast_moving"
    if per_month >= 2:
        return "moving"
    return "slow"


def build_metrics(item, days):
    today = timezone.localdate()
    start_day = today - timedelta(days=days - 1)
    series = _series(item, start_day, days)

    views = sum(p["views"] for p in series)
    units = sum(p["units"] for p in series)
    revenue = round(sum(p["revenue"] for p in series), 2)
    half = days // 2
    recent_units = sum(p["units"] for p in series[half:])
    earlier_units = sum(p["units"] for p in series[:half])
    recent_views = sum(p["views"] for p in series[half:])
    earlier_views = sum(p["views"] for p in series[:half])

    reviews = Review.objects.filter(item=item)
    review_count = reviews.count()
    review_average = round(sum(r.rating for r in reviews) / review_count, 1) if review_count else None

    offer = None
    try:
        offer_obj = item.offer
    except Exception:
        offer_obj = None
    if offer_obj is not None:
        offer = {
            "discount_percentage": _dec(offer_obj.discount_percentage),
            "start_date": offer_obj.start_date.isoformat(),
            "end_date": offer_obj.end_date.isoformat(),
            "duration_days": offer_obj.duration_days,
            "active": offer_obj.is_active(),
            "seconds_remaining": offer_obj.seconds_remaining(),
        }

    metrics = {
        "range_days": days,
        "price": _dec(item.price),
        "discount_price": _dec(item.discount_price) if item.discount_price is not None else None,
        "current_price": _dec(item.get_current_price()),
        "stock": item.in_stock,
        "available": item.available,
        "lifetime_views": item.views,
        "views": views,
        "units_sold": units,
        "revenue": revenue,
        "conversion_rate": round(units / views * 100, 2) if views else None,
        "trend": {
            "units_recent": recent_units, "units_earlier": earlier_units,
            "views_recent": recent_views, "views_earlier": earlier_views,
        },
        "wishlist_count": Wishlist.objects.filter(item=item).count(),
        "review_count": review_count,
        "review_average": review_average,
        "days_listed": max((timezone.now() - item.created_at).days, 0),
        "offer": offer,
    }
    metrics["status"] = _status(units, views, days)
    return metrics, series


def _item_context(item):
    return {
        "name": item.name,
        "description": (item.description or "")[:600],
        "department": getattr(item.department, "name", None),
        "category": getattr(item.category, "name", None),
        "subcategory": getattr(item.subcategory, "name", None),
        "brand": getattr(item.brand, "name", None),
        "attribute": item.item_attribute,
        "is_organic": item.is_organic,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def item_insights(request, item_id):
    item = (
        Item.objects.select_related("vendor", "created_by", "department", "category", "subcategory", "brand")
        .filter(pk=item_id).first()
    )
    if item is None:
        return Response({"detail": "Item not found."}, status=404)
    if not _can_access(request.user, item):
        return Response({"detail": "You do not have access to this item."}, status=403)

    days = _range_days(request)
    metrics, series = build_metrics(item, days)
    return Response({
        "item": {"id": item.pk, "name": item.name, **_item_context(item)},
        "metrics": metrics,
        "series": series,
        "observations": _rule_based_observations(metrics),
        "ai_available": bool(getattr(settings, "GEMINI_API_KEY", "")),
    })


# --------------------------------------------------------------------------
# Gemini
# --------------------------------------------------------------------------

def _parse_json_text(text):
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start:end + 1])
        raise


def _call_gemini(prompt, use_search):
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    model = getattr(settings, "GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    if use_search:
        # Google Search grounding cannot be combined with a response schema, so
        # the JSON shape is requested in the prompt and validated afterwards.
        payload["tools"] = [{"google_search": {}}]
        payload["generationConfig"] = {"temperature": 0.3}
    else:
        payload["generationConfig"] = {
            "temperature": 0.3,
            "responseMimeType": "application/json",
            "responseSchema": SUGGESTION_SCHEMA,
        }
    response = requests.post(
        GEMINI_ENDPOINT.format(model=model),
        headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
        json=payload,
        timeout=60,
    )
    if not response.ok:
        logger.error("Gemini item insights failed: %s", response.text[:800])
        raise RuntimeError("Gemini request failed.")
    data = response.json()
    candidates = data.get("candidates") or []
    text = "".join(
        part.get("text", "")
        for candidate in candidates
        for part in (candidate.get("content") or {}).get("parts", [])
    )
    if not text.strip():
        raise RuntimeError("Gemini returned no content.")
    sources = []
    for candidate in candidates:
        for chunk in (candidate.get("groundingMetadata") or {}).get("groundingChunks", []):
            web = chunk.get("web") or {}
            if web.get("uri"):
                sources.append({"title": web.get("title") or web["uri"], "url": web["uri"]})
    return _parse_json_text(text), sources


def _clean_suggestions(raw, current_price):
    """Keep only well-formed, sane suggestions; never trust model numbers blindly."""
    allowed_types = {"offer", "price", "content", "stock", "promotion", "other"}
    cleaned = []
    for entry in (raw.get("recommendations") or [])[:8]:
        if not isinstance(entry, dict) or not str(entry.get("title") or "").strip():
            continue
        kind = str(entry.get("type") or "other").lower()
        item = {
            "type": kind if kind in allowed_types else "other",
            "title": str(entry["title"]).strip()[:140],
            "detail": str(entry.get("detail") or "").strip()[:700],
            "impact": str(entry.get("impact") or "medium").lower() if str(entry.get("impact") or "").lower() in {"low", "medium", "high"} else "medium",
        }
        pct = entry.get("suggested_discount_percent")
        if isinstance(pct, (int, float)) and 1 <= pct <= 70:
            item["suggested_discount_percent"] = round(float(pct), 1)
        days = entry.get("suggested_offer_days")
        if isinstance(days, (int, float)) and 1 <= days <= 90:
            item["suggested_offer_days"] = int(days)
        price = entry.get("suggested_price")
        if isinstance(price, (int, float)) and price > 0 and (not current_price or 0.3 * current_price <= price <= 3 * current_price):
            item["suggested_price"] = round(float(price), 2)
        cleaned.append(item)
    return {
        "verdict": str(raw.get("verdict") or "").strip()[:400],
        "why": [str(x).strip()[:300] for x in (raw.get("why") or []) if str(x).strip()][:6],
        "recommendations": cleaned,
        "market_notes": [str(x).strip()[:300] for x in (raw.get("market_notes") or []) if str(x).strip()][:6],
    }


def _prompt(item, metrics):
    return (
        "You are a retail growth advisor for a Kenyan online marketplace (prices in KES). "
        "A vendor wants to know how to sell more of one product. Use ONLY the figures below for the "
        "shop's own numbers; do not invent sales, views or reviews. If Google Search is available, compare "
        "with similar products on other e-commerce sites and general websites and mention what you found "
        "in market_notes, without inventing prices you did not see. Explain why the item is or is not "
        "moving, then give practical, ranked recommendations (discount, price change, better content, "
        "stock, promotion). For a discount give suggested_discount_percent (1-70) and suggested_offer_days "
        "(1-90). Be concrete and honest, and say when the data is too thin to be sure.\n\n"
        f"Product:\n{json.dumps(_item_context(item), ensure_ascii=False)}\n\n"
        f"Shop's numbers for the last {metrics['range_days']} days:\n{json.dumps(metrics, ensure_ascii=False)}\n\n"
        "Reply with ONLY one JSON object of this shape: "
        '{"verdict": string, "why": [string], "recommendations": [{"type": "offer|price|content|stock|promotion|other", '
        '"title": string, "detail": string, "impact": "low|medium|high", '
        '"suggested_discount_percent": number?, "suggested_offer_days": number?, "suggested_price": number?}], '
        '"market_notes": [string]}'
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def item_ai_suggestions(request, item_id):
    item = (
        Item.objects.select_related("vendor", "created_by", "department", "category", "subcategory", "brand")
        .filter(pk=item_id).first()
    )
    if item is None:
        return Response({"detail": "Item not found."}, status=404)
    if not _can_access(request.user, item):
        return Response({"detail": "You do not have access to this item."}, status=403)
    if not getattr(settings, "GEMINI_API_KEY", ""):
        return Response({"detail": "AI suggestions are not set up on the server yet."}, status=503)

    days = _range_days(request)
    refresh = str(request.data.get("refresh") or "").lower() in {"1", "true", "yes"}
    cache_key = f"item-ai-suggestions:{item.pk}:{days}"
    cooldown_key = f"item-ai-cooldown:{request.user.pk}"

    if not refresh:
        cached = cache.get(cache_key)
        if cached:
            return Response({**cached, "cached": True})
    if not cache.add(cooldown_key, 1, AI_COOLDOWN_SECONDS):
        return Response({"detail": "Please wait a few seconds before asking again."}, status=429)

    metrics, _series_unused = build_metrics(item, days)
    prompt = _prompt(item, metrics)
    try:
        try:
            raw, sources = _call_gemini(prompt, use_search=True)
        except Exception:
            logger.warning("Grounded Gemini call failed for item %s; retrying without search.", item.pk, exc_info=True)
            raw, sources = _call_gemini(prompt, use_search=False)
        result = _clean_suggestions(raw, metrics["current_price"])
        if not result["recommendations"]:
            raise ValueError("No usable recommendations.")
    except Exception:
        logger.exception("AI item suggestions failed for item %s", item.pk)
        cache.delete(cooldown_key)
        return Response({"detail": "Could not get AI suggestions right now. Please try again shortly."}, status=502)

    seen, unique_sources = set(), []
    for source in sources:
        if source["url"] not in seen:
            seen.add(source["url"])
            unique_sources.append(source)
    payload = {
        **result,
        "sources": unique_sources[:8],
        "generated_at": timezone.now().isoformat(),
        "range_days": days,
        "cached": False,
    }
    cache.set(cache_key, payload, AI_CACHE_SECONDS)
    return Response(payload)
