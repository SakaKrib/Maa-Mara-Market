from django.db.models import F, Sum, Avg, Count
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ReactSerializers.models import Item


class DiscoveryProductSerializer(serializers.ModelSerializer):
    final_price = serializers.SerializerMethodField()
    final_discounted_price = serializers.SerializerMethodField()
    save_upto = serializers.SerializerMethodField()
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    sales_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Item
        fields = [
            "id","name","image","price","discount_price","in_stock","available",
            "returnable","slug","likes","views","created_at","updated",
            "percentage_discount","in_offer","final_price","final_discounted_price",
            "save_upto","average_rating","review_count","sales_count",
        ]

    def get_final_price(self, obj):
        return round(obj.get_item_final_price(), 2)

    def get_final_discounted_price(self, obj):
        return round(obj.get_item_final_discounted_price(), 2)

    def get_save_upto(self, obj):
        return round(obj.get_save_upto, 2)


def _catalog_queryset():
    return (
        Item.objects.filter(available=True, in_stock__gt=0)
        .select_related("section","department","category","subcategory","brand")
        .annotate(
            sales_count=Sum("sold_items__quantity"),
            average_rating=Avg("reviews__rating"),
            review_count=Count("reviews", distinct=True),
        )
    )


def _serialize_discovery(items, request):
    return DiscoveryProductSerializer(items, many=True, context={"request": request}).data


@api_view(["GET"])
@permission_classes([AllowAny])
def discovery_feed(request):
    try:
        limit = min(max(int(request.query_params.get("limit", 8)), 1), 24)
    except (TypeError, ValueError):
        limit = 8

    base = _catalog_queryset()

    popular = base.order_by(F("views").desc(nulls_last=True), F("likes").desc(nulls_last=True), "-updated")[:limit]
    wanted = base.order_by(F("likes").desc(nulls_last=True), F("views").desc(nulls_last=True), "-updated")[:limit]
    best_selling = base.order_by(F("sales_count").desc(nulls_last=True), F("likes").desc(nulls_last=True), "-updated")[:limit]
    featured = base.filter(featured_items__isnull=False).order_by("featured_items__priority", "-views", "-likes").distinct()[:limit]

    return Response({
        "popular": _serialize_discovery(popular, request),
        "most_wanted": _serialize_discovery(wanted, request),
        "best_selling": _serialize_discovery(best_selling, request),
        "featured": _serialize_discovery(featured, request),
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def multi_collections(request):
    from ReactSerializers.models import Department

    try:
        limit = min(max(int(request.query_params.get("items", 6)), 1), 12)
    except (TypeError, ValueError):
        limit = 6

    departments = (
        Department.objects.filter(items__available=True, items__in_stock__gt=0)
        .select_related("section")
        .distinct()
        .order_by("name")
    )

    collections = []
    for department in departments:
        items = (
            department.items.filter(available=True, in_stock__gt=0)
            .select_related("category","subcategory","brand")
            .annotate(
                sales_count=Sum("sold_items__quantity"),
                average_rating=Avg("reviews__rating"),
                review_count=Count("reviews", distinct=True),
            )
            .order_by("-views","-likes","-updated")[:limit]
        )
        if items:
            collections.append({
                "id": department.id,
                "name": department.name,
                "section": department.section.name if department.section else None,
                "items": _serialize_discovery(items, request),
            })

    return Response(collections)
