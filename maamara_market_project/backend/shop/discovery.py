from django.db.models import Case, F, IntegerField, Q, Sum, Avg, Count, Value, When
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ReactSerializers.models import Item, ItemView
from core.models import SearchEvent
from order.models import OrderItem
from shop.models import Wishlist


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


def _request_actor(request):
    user = request.user if request.user and request.user.is_authenticated else None
    visitor_id = None if user else request.COOKIES.get("visitorId")
    return user, visitor_id


def _search_term_query(term):
    return (
        Q(name__icontains=term)
        | Q(description__icontains=term)
        | Q(item_attribute__icontains=term)
        | Q(gender_based__icontains=term)
        | Q(children_size_based_age__icontains=term)
        | Q(roast_type__icontains=term)
        | Q(coffee_state__icontains=term)
        | Q(brand__name__icontains=term)
        | Q(category__name__icontains=term)
        | Q(subcategory__name__icontains=term)
        | Q(department__name__icontains=term)
        | Q(section__name__icontains=term)
        | Q(variants__color__icontains=term)
        | Q(shoe_input__shoe_type__icontains=term)
        | Q(shoe_input__shoe_gender__icontains=term)
    )


def _recommendation_score(base, category_ids, subcategory_ids, brand_ids, section_ids, search_terms):
    score = Value(0, output_field=IntegerField())

    if category_ids:
        score = score + Case(
            When(category_id__in=category_ids, then=Value(25)),
            default=Value(0),
            output_field=IntegerField(),
        )
    if subcategory_ids:
        score = score + Case(
            When(subcategory_id__in=subcategory_ids, then=Value(25)),
            default=Value(0),
            output_field=IntegerField(),
        )
    if brand_ids:
        score = score + Case(
            When(brand_id__in=brand_ids, then=Value(15)),
            default=Value(0),
            output_field=IntegerField(),
        )
    if section_ids:
        score = score + Case(
            When(section_id__in=section_ids, then=Value(10)),
            default=Value(0),
            output_field=IntegerField(),
        )

    for term in search_terms[:5]:
        score = score + Case(
            When(Q(name__iexact=term), then=Value(50)),
            When(_search_term_query(term), then=Value(30)),
            default=Value(0),
            output_field=IntegerField(),
        )

    return base.annotate(recommendation_score=score)


@api_view(["GET"])
@permission_classes([AllowAny])
def recommendations(request):
    """
    Return deterministic, behavior-aware customer recommendations.

    The endpoint extends the existing discovery feed and uses the existing
    ItemView, Wishlist, completed OrderItem, and SearchEvent signals.
    """
    try:
        limit = min(max(int(request.query_params.get("limit", 6)), 1), 12)
    except (TypeError, ValueError):
        limit = 6

    user, visitor_id = _request_actor(request)

    if user:
        view_qs = ItemView.objects.filter(user=user).select_related("item").order_by("-viewed_at")[:20]
        wishlist_qs = Wishlist.objects.filter(user=user).select_related("item").order_by("-created_at")[:20]
        purchase_qs = OrderItem.objects.filter(
            user=user,
            order__status="completed",
            refunded=False,
            is_returned=False,
        ).select_related("item").order_by("-ordered_date")[:30]
        search_qs = SearchEvent.objects.filter(user=user).order_by("-created_at")[:10]
    elif visitor_id:
        view_qs = ItemView.objects.filter(
            visitor_id=visitor_id, user__isnull=True
        ).select_related("item").order_by("-viewed_at")[:20]
        wishlist_qs = Wishlist.objects.filter(
            visitor_id=visitor_id, user__isnull=True
        ).select_related("item").order_by("-created_at")[:20]
        purchase_qs = OrderItem.objects.filter(
            visitor_id=visitor_id,
            order__status="completed",
            refunded=False,
            is_returned=False,
        ).select_related("item").order_by("-ordered_date")[:30]
        search_qs = SearchEvent.objects.filter(
            visitor_id=visitor_id, user__isnull=True
        ).order_by("-created_at")[:10]
    else:
        view_qs = wishlist_qs = purchase_qs = search_qs = []

    viewed_items = [row.item for row in view_qs]
    wishlist_items = [row.item for row in wishlist_qs]
    purchased_items = [row.item for row in purchase_qs]
    recent_searches = [row.query for row in search_qs]

    signal_items = viewed_items + wishlist_items + purchased_items

    category_ids = {item.category_id for item in signal_items if item.category_id}
    subcategory_ids = {item.subcategory_id for item in signal_items if item.subcategory_id}
    brand_ids = {item.brand_id for item in signal_items if item.brand_id}
    section_ids = {item.section_id for item in signal_items if item.section_id}

    search_terms = []
    for query in recent_searches:
        for token in query.lower().split():
            token = token.strip(".,!?;:()[]{}")
            if len(token) >= 2 and token not in search_terms:
                search_terms.append(token)

    viewed_ids = {item.id for item in viewed_items}
    base = _catalog_queryset().exclude(id__in=viewed_ids)

    interest_filter = Q()
    if category_ids:
        interest_filter |= Q(category_id__in=category_ids)
    if subcategory_ids:
        interest_filter |= Q(subcategory_id__in=subcategory_ids)
    if brand_ids:
        interest_filter |= Q(brand_id__in=brand_ids)
    if section_ids:
        interest_filter |= Q(section_id__in=section_ids)

    search_filter = Q()
    for term in search_terms[:5]:
        search_filter |= _search_term_query(term)

    has_personal_signals = bool(signal_items or search_terms)

    if interest_filter or search_filter:
        personalized = _recommendation_score(
            base.filter(interest_filter | search_filter).distinct(),
            category_ids,
            subcategory_ids,
            brand_ids,
            section_ids,
            search_terms,
        ).order_by("-recommendation_score", "-views", "-likes", "-updated")[:limit]
    else:
        personalized = base.order_by("-views", "-likes", "-updated")[:limit]

    search_related = []
    if search_filter:
        search_related = _recommendation_score(
            base.filter(search_filter).distinct(),
            category_ids,
            subcategory_ids,
            brand_ids,
            section_ids,
            search_terms,
        ).order_by("-recommendation_score", "-views", "-likes", "-updated")[:limit]

    popular = _catalog_queryset().order_by(
        F("views").desc(nulls_last=True),
        F("likes").desc(nulls_last=True),
        "-updated",
    )[:limit]

    best_selling = _catalog_queryset().filter(sales_count__gt=0).order_by(
        F("sales_count").desc(nulls_last=True),
        F("likes").desc(nulls_last=True),
        "-updated",
    )[:limit]

    return Response({
        "has_activity": has_personal_signals,
        "has_search_history": bool(search_terms),
        "has_purchase_history": bool(purchased_items),
        "recent_search": recent_searches[0] if recent_searches else None,
        "personalized": _serialize_discovery(personalized, request),
        "search_related": _serialize_discovery(search_related, request),
        "popular": _serialize_discovery(popular, request),
        "best_selling": _serialize_discovery(best_selling, request),
    })
