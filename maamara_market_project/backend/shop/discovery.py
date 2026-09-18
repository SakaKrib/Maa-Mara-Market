from django.db.models import F, Sum, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ReactSerializers.models import Item
from vendorDashboard.models import SoldItem
from .Serializers import ProductSerializer


def _catalog_queryset():
    return (
        Item.objects.filter(available=True, in_stock__gt=0)
        .select_related("section", "department", "category", "subcategory", "brand")
        .prefetch_related("variants", "reviews")
        .annotate(
            sales_count=Sum(
                "solditem__quantity",
                filter=Q(solditem__order_item__order__status="completed"),
            )
        )
    )


def _serialize_items(items, request):
    data = ProductSerializer(items, many=True, context={"request": request}).data
    for item, row in zip(items, data):
        row["sales_count"] = int(item.sales_count or 0)
        row["performance_score"] = (
            int(item.sales_count or 0) * 5
            + int(item.likes or 0) * 3
            + int(item.views or 0)
        )
    return data


@api_view(["GET"])
@permission_classes([AllowAny])
def discovery_feed(request):
    """
    Marketplace discovery feeds driven by real catalog activity.

    The ranking deliberately lives on the server so every client sees the
    same products and the browser cannot manufacture popularity numbers.
    """
    limit = min(max(int(request.query_params.get("limit", 8)), 1), 24)
    base = _catalog_queryset()

    popular = base.order_by(
        F("views").desc(nulls_last=True),
        F("likes").desc(nulls_last=True),
        "-updated",
    )[:limit]

    wanted = base.order_by(
        F("likes").desc(nulls_last=True),
        F("views").desc(nulls_last=True),
        "-updated",
    )[:limit]

    best_selling = base.order_by(
        F("sales_count").desc(nulls_last=True),
        F("likes").desc(nulls_last=True),
        "-updated",
    )[:limit]

    featured = base.filter(featured_items__isnull=False).order_by(
        "featured_items__priority", "-views", "-likes"
    ).distinct()[:limit]

    return Response({
        "popular": _serialize_items(popular, request),
        "most_wanted": _serialize_items(wanted, request),
        "best_selling": _serialize_items(best_selling, request),
        "featured": _serialize_items(featured, request),
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def multi_collections(request):
    """
    Build homepage collections from real departments/categories.
    No product imagery or collection names are hardcoded in React.
    """
    from ReactSerializers.models import Department

    departments = (
        Department.objects.filter(items__available=True, items__in_stock__gt=0)
        .prefetch_related("items")
        .distinct()
        .order_by("name")
    )

    limit = min(max(int(request.query_params.get("items", 6)), 1), 12)
    collections = []

    for department in departments:
        items = list(
            department.items.filter(available=True, in_stock__gt=0)
            .select_related("category", "subcategory", "brand")
            .order_by("-views", "-likes", "-updated")[:limit]
        )
        if not items:
            continue

        collections.append({
            "id": department.id,
            "name": department.name,
            "section": department.section.name if department.section else None,
            "items": _serialize_items(items, request),
        })

    return Response(collections)
