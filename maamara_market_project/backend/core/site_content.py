"""Admin-editable footer contact details and the storefront "Collections" menu."""
import re
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import SiteContactSettings
from ReactSerializers.models import Category, Department, Item, Section, SubCategory

PHONE_RE = re.compile(r"^\+?[0-9][0-9 ()\-]{5,28}$")


def _contact():
    obj, _ = SiteContactSettings.objects.get_or_create(pk=1)
    return obj


def _contact_payload(obj):
    return {
        "email": obj.contact_email,
        "phone": obj.contact_phone,
        "location": obj.location,
        "updated_at": obj.updated_at,
    }


class SiteContactView(APIView):
    """GET is public (footer); PATCH is for administrators only."""

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsAdminUser()]

    def get_authenticators(self):
        # Public GET needs no credentials; PATCH still authenticates normally.
        if self.request.method == "GET":
            return []
        return super().get_authenticators()

    def get(self, request):
        response = Response(_contact_payload(_contact()))
        response["Cache-Control"] = "public, max-age=60"
        return response

    def patch(self, request):
        obj = _contact()
        email = request.data.get("email", obj.contact_email)
        phone = request.data.get("phone", obj.contact_phone)
        location = request.data.get("location", obj.location)
        for name, value in (("email", email), ("phone", phone), ("location", location)):
            if not isinstance(value, str):
                return Response({"detail": f"The {name} must be text."}, status=status.HTTP_400_BAD_REQUEST)
        email, phone, location = email.strip(), phone.strip(), " ".join(location.split())
        if email:
            try:
                validate_email(email)
            except ValidationError:
                return Response({"detail": "Enter a valid contact email address."}, status=status.HTTP_400_BAD_REQUEST)
        if phone and not PHONE_RE.match(phone):
            return Response(
                {"detail": "Enter a valid phone number, for example +254 712 345 678."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(location) > 120:
            return Response({"detail": "The location must be 120 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)
        obj.contact_email, obj.contact_phone, obj.location = email, phone, location
        obj.save()
        return Response(_contact_payload(obj))


# --- Collections -----------------------------------------------------------
# Same rules the desktop mega menus use: a collection is a handful of categories
# picked by name from the Fashion department (or the first three from Sports).
FASHION = re.compile(r"fashion|apparel", re.I)
SPORTS = re.compile(r"sport|outdoor", re.I)
COLLECTIONS = [
    ("women", "Women", FASHION, [r"women", r"accessor", r"shoes"]),
    ("men", "Men", FASHION, [r"^men", r"shoes"]),
    ("sports", "Sports", SPORTS, None),
    ("children", "Children", FASHION, [r"children|kids", r"children.*shoes|kids.*shoes"]),
    ("unisex", "Unisex", FASHION, [r"unisex"]),
]


def new_window_days():
    try:
        return max(1, int(getattr(settings, "COLLECTION_NEW_DAYS", 14)))
    except (TypeError, ValueError):
        return 14


def _pick(categories, patterns):
    picked = []
    for pattern in patterns:
        rx = re.compile(pattern, re.I)
        match = next((c for c in categories if rx.search(c.name or "")), None)
        if match and match not in picked:
            picked.append(match)
    return picked


class CollectionsView(APIView):
    """Menu data for Women/Men/Sports/Children/Unisex with real "new" flags.

    A collection, category or subcategory is "new" when at least one item that
    customers can buy (available and in stock) was added in the last
    COLLECTION_NEW_DAYS days (default 14).
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        since = timezone.now() - timedelta(days=new_window_days())
        recent = Item.objects.filter(available=True, in_stock__gt=0, created_at__gte=since)
        by_category = {r["category_id"]: r["n"] for r in recent.values("category_id").annotate(n=Count("id"))}
        by_sub = {r["subcategory_id"]: r["n"] for r in recent.values("subcategory_id").annotate(n=Count("id"))}

        section = (
            Section.objects.filter(name__iregex=r"^(inorganic|departmental|general)$").first()
            or Section.objects.first()
        )
        departments = list(Department.objects.filter(section=section)) if section else []
        out = []
        for key, label, dept_rx, patterns in COLLECTIONS:
            dept = next((d for d in departments if dept_rx.search(d.name or "")), None)
            if not dept:
                continue
            cats = list(Category.objects.filter(department=dept).order_by("id"))
            chosen = cats[:3] if patterns is None else _pick(cats, patterns)
            categories = []
            for cat in chosen:
                subs = SubCategory.objects.filter(category=cat).order_by("name")
                categories.append({
                    "id": cat.id,
                    "name": cat.name,
                    "new_count": by_category.get(cat.id, 0),
                    "subcategories": [
                        {"id": s.id, "name": s.name, "new_count": by_sub.get(s.id, 0)} for s in subs
                    ],
                })
            if not categories:
                continue
            total = sum(c["new_count"] for c in categories)
            out.append({"key": key, "label": label, "is_new": total > 0, "new_count": total, "categories": categories})
        response = Response({"new_window_days": new_window_days(), "collections": out})
        response["Cache-Control"] = "public, max-age=120"
        return response
