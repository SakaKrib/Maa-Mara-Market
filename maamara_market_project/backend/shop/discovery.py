from django.db.models import Case, F, IntegerField, Q, Sum, Avg, Count, Value, When, OuterRef, Subquery
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
    offer = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            "id","name","image","price","discount_price","in_stock","available",
            "returnable","slug","likes","views","created_at","updated",
            "percentage_discount","in_offer","offer","final_price","final_discounted_price",
            "save_upto","average_rating","review_count","sales_count",
        ]

    def get_offer(self, obj):
        offer = getattr(obj, "offer", None)
        if not offer:
            return None
        return {
            "discount_percentage": offer.discount_percentage,
            "start_date": offer.start_date,
            "end_date": offer.end_date,
            "final_price": offer.final_price,
        }

    def get_final_price(self, obj):
        return round(obj.get_item_final_price(), 2)

    def get_final_discounted_price(self, obj):
        return round(obj.get_item_final_discounted_price(), 2)

    def get_save_upto(self, obj):
        return round(obj.get_save_upto, 2)


BEST_SELLER_WINDOW_DAYS = 30
BEST_SELLER_MIN_UNITS = 5
TRENDING_WINDOW_DAYS = 7
TRENDING_MIN_INTERACTIONS = 5


def _completed_sales_subquery(since):
    sales = (
        OrderItem.objects
        .filter(
            item_id=OuterRef("pk"),
            order__status="completed",
            refunded=False,
            is_returned=False,
            ordered_date__gte=since,
        )
        .order_by()
        .values("item")
        .annotate(total=Sum("quantity"))
        .values("total")[:1]
    )
    return Subquery(sales, output_field=IntegerField())


def _recent_view_subquery(since):
    views = (
        ItemView.objects
        .filter(
            item_id=OuterRef("pk"),
            viewed_at__gte=since,
        )
        .order_by()
        .values("item")
        .annotate(total=Count("id"))
        .values("total")[:1]
    )
    return Subquery(views, output_field=IntegerField())


def _catalog_queryset():
    """
    Shared available catalog queryset.

    Sales are deliberately calculated from completed, non-refunded and
    non-returned order items. A correlated subquery keeps sales totals
    independent from review/view joins, so one review cannot multiply a
    product's sales count.
    """
    sales_since = timezone.now() - timedelta(days=BEST_SELLER_WINDOW_DAYS)

    return (
        Item.objects.filter(available=True, in_stock__gt=0)
        .select_related("section", "department", "category", "subcategory", "brand")
        .annotate(
            sales_count=_completed_sales_subquery(sales_since),
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

    now = timezone.now()
    trend_since = now - timedelta(days=TRENDING_WINDOW_DAYS)
    sales_since = now - timedelta(days=BEST_SELLER_WINDOW_DAYS)

    base = _catalog_queryset().annotate(
        recent_views=_recent_view_subquery(trend_since),
        recent_sales=_completed_sales_subquery(sales_since),
    )

    # "Trending" is recent, measurable shopper activity rather than lifetime
    # views. An item needs at least five recent interactions (views + units
    # sold) before it can enter this section.
    trending = (
        base
        .annotate(
            trend_interactions=F("recent_views") + F("recent_sales"),
        )
        .filter(trend_interactions__gte=TRENDING_MIN_INTERACTIONS)
        .order_by(
            F("trend_interactions").desc(nulls_last=True),
            F("recent_sales").desc(nulls_last=True),
            F("recent_views").desc(nulls_last=True),
            "-updated",
        )[:limit]
    )

    # A product is a Best Seller only after at least five completed units
    # have actually been sold in the trailing 30 days.
    best_selling = (
        base
        .filter(sales_count__gte=BEST_SELLER_MIN_UNITS)
        .order_by(
            F("sales_count").desc(nulls_last=True),
            F("recent_sales").desc(nulls_last=True),
            "-updated",
        )[:limit]
    )

    wanted = (
        base
        .annotate(recent_wishlist_count=Count("wishlist_items", distinct=True))
        .order_by(
            F("recent_wishlist_count").desc(nulls_last=True),
            F("recent_views").desc(nulls_last=True),
            "-updated",
        )[:limit]
    )

    # Featured is an explicit FeaturedItem relationship. It is not inferred
    # from views, likes, sales, or product age.
    featured = (
        base
        .filter(featured_items__isnull=False)
        .order_by("featured_items__priority", "-updated")
        .distinct()[:limit]
    )

    return Response({
        "trending": _serialize_discovery(trending, request),
        "popular": _serialize_discovery(trending, request),
        "most_wanted": _serialize_discovery(wanted, request),
        "best_selling": _serialize_discovery(best_selling, request),
        "featured": _serialize_discovery(featured, request),
        "rules": {
            "best_seller_window_days": BEST_SELLER_WINDOW_DAYS,
            "best_seller_min_units": BEST_SELLER_MIN_UNITS,
            "trending_window_days": TRENDING_WINDOW_DAYS,
            "trending_min_interactions": TRENDING_MIN_INTERACTIONS,
        },
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
                sales_count=_completed_sales_subquery(
                    timezone.now() - timedelta(days=BEST_SELLER_WINDOW_DAYS)
                ),
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


@api_view(["GET"])
@permission_classes([AllowAny])
def homepage_collections(request):
    """
    Build real marketplace sections from the existing product taxonomy.

    Categories are used as the customer-facing collection titles so sections
    such as "Journals", "DIY Gifts", or "Wedding Gifts" appear automatically
    when the catalog actually contains available products for them.

    Within each section, products are ranked using the customer's existing
    behavior: recent searches, viewed items, wishlist items, and purchases.
    Global views/likes remain the fallback so anonymous/new customers still
    get useful discovery results.
    """
    try:
        limit = min(max(int(request.query_params.get("items", 6)), 2), 10)
        max_sections = min(max(int(request.query_params.get("sections", 8)), 1), 16)
    except (TypeError, ValueError):
        limit, max_sections = 6, 8

    from ReactSerializers.models import Category

    user, visitor_id = _request_actor(request)

    if user:
        view_rows = list(
            ItemView.objects.filter(user=user)
            .select_related("item")
            .order_by("-viewed_at")[:30]
        )
        wishlist_rows = list(
            Wishlist.objects.filter(user=user)
            .select_related("item")
            .order_by("-created_at")[:30]
        )
        purchase_rows = list(
            OrderItem.objects.filter(
                user=user,
                order__status="completed",
                refunded=False,
                is_returned=False,
            )
            .select_related("item")
            .order_by("-ordered_date")[:30]
        )
        search_rows = list(
            SearchEvent.objects.filter(user=user).order_by("-created_at")[:10]
        )
    elif visitor_id:
        view_rows = list(
            ItemView.objects.filter(
                visitor_id=visitor_id, user__isnull=True
            )
            .select_related("item")
            .order_by("-viewed_at")[:30]
        )
        wishlist_rows = list(
            Wishlist.objects.filter(
                visitor_id=visitor_id, user__isnull=True
            )
            .select_related("item")
            .order_by("-created_at")[:30]
        )
        purchase_rows = list(
            OrderItem.objects.filter(
                visitor_id=visitor_id,
                order__status="completed",
                refunded=False,
                is_returned=False,
            )
            .select_related("item")
            .order_by("-ordered_date")[:30]
        )
        search_rows = list(
            SearchEvent.objects.filter(
                visitor_id=visitor_id, user__isnull=True
            )
            .order_by("-created_at")[:10]
        )
    else:
        view_rows = wishlist_rows = purchase_rows = search_rows = []

    viewed_items = [row.item for row in view_rows]
    wishlist_items = [row.item for row in wishlist_rows]
    purchased_items = [row.item for row in purchase_rows]

    # Keep the strongest signals separate so a product can receive the
    # appropriate weight instead of being treated as a generic "activity".
    viewed_ids = {item.id for item in viewed_items if item.id}
    wishlist_ids = {item.id for item in wishlist_items if item.id}
    purchased_ids = {item.id for item in purchased_items if item.id}

    signal_items = viewed_items + wishlist_items + purchased_items
    category_signal_counts = {}
    category_signal_weights = {}

    for item in signal_items:
        category_id = item.category_id
        if not category_id:
            continue
        category_signal_counts[category_id] = category_signal_counts.get(category_id, 0) + 1
        weight = 1
        if item.id in wishlist_ids:
            weight += 3
        if item.id in purchased_ids:
            weight += 4
        if item.id in viewed_ids:
            weight += 1
        category_signal_weights[category_id] = (
            category_signal_weights.get(category_id, 0) + weight
        )

    # Recent searches are converted into the same product taxonomy signals
    # used by the recommendation endpoint. This lets a search such as
    # "beaded bag" influence both the section choice and the products inside it.
    search_terms = []
    for row in search_rows:
        for token in row.query.lower().split():
            token = token.strip(".,!?;:()[]{}")
            if len(token) >= 2 and token not in search_terms:
                search_terms.append(token)

    search_filter = Q()
    for term in search_terms[:5]:
        search_filter |= _search_term_query(term)

    search_interest_items = list(
        _catalog_queryset().filter(search_filter).only(
            "id", "category_id", "subcategory_id", "brand_id", "section_id"
        )[:100]
    ) if search_filter else []

    search_category_counts = {}
    for item in search_interest_items:
        if item.category_id:
            search_category_counts[item.category_id] = (
                search_category_counts.get(item.category_id, 0) + 1
            )

    category_interest_ids = set(category_signal_counts) | set(search_category_counts)

    categories = (
        Category.objects.filter(items__available=True, items__in_stock__gt=0)
        .annotate(
            available_count=Count(
                "items",
                filter=Q(items__available=True, items__in_stock__gt=0),
                distinct=True,
            )
        )
        .filter(available_count__gt=0)
        .order_by("name")
    )

    def category_rank(category):
        behavior_score = category_signal_weights.get(category.id, 0)
        search_score = search_category_counts.get(category.id, 0) * 2
        return (
            -(behavior_score + search_score),
            -category_signal_counts.get(category.id, 0),
            category.name.lower(),
        )

    ranked = sorted(categories, key=category_rank)

    collections = []
    used_item_ids = set()

    for category in ranked:
        category_search_items = [
            item.id for item in search_interest_items
            if item.category_id == category.id
        ]

        # Use the same behavior signals for item ranking. The score is
        # deliberately additive so several weak signals can reinforce one
        # another while wishlist/purchase/search intent remain stronger.
        item_score = Value(0, output_field=IntegerField())

        if viewed_ids:
            item_score = item_score + Case(
                When(id__in=viewed_ids, then=Value(12)),
                default=Value(0),
                output_field=IntegerField(),
            )
        if wishlist_ids:
            item_score = item_score + Case(
                When(id__in=wishlist_ids, then=Value(70)),
                default=Value(0),
                output_field=IntegerField(),
            )
        if purchased_ids:
            item_score = item_score + Case(
                When(id__in=purchased_ids, then=Value(80)),
                default=Value(0),
                output_field=IntegerField(),
            )
        if category_search_items:
            item_score = item_score + Case(
                When(id__in=category_search_items, then=Value(45)),
                default=Value(0),
                output_field=IntegerField(),
            )

        signal_category_ids = {
            item.subcategory_id for item in signal_items
            if item.category_id == category.id and item.subcategory_id
        }
        signal_brand_ids = {
            item.brand_id for item in signal_items
            if item.category_id == category.id and item.brand_id
        }
        signal_section_ids = {
            item.section_id for item in signal_items
            if item.category_id == category.id and item.section_id
        }

        if signal_category_ids:
            item_score = item_score + Case(
                When(subcategory_id__in=signal_category_ids, then=Value(30)),
                default=Value(0),
                output_field=IntegerField(),
            )
        if signal_brand_ids:
            item_score = item_score + Case(
                When(brand_id__in=signal_brand_ids, then=Value(24)),
                default=Value(0),
                output_field=IntegerField(),
            )
        if signal_section_ids:
            item_score = item_score + Case(
                When(section_id__in=signal_section_ids, then=Value(12)),
                default=Value(0),
                output_field=IntegerField(),
            )

        # Give direct name/category/search-term matches an additional boost.
        for term in search_terms[:5]:
            item_score = item_score + Case(
                When(Q(name__iexact=term), then=Value(60)),
                When(_search_term_query(term), then=Value(25)),
                default=Value(0),
                output_field=IntegerField(),
            )

        items = list(
            category.items.filter(
                available=True,
                in_stock__gt=0,
            )
            .select_related("section", "department", "category", "subcategory", "brand")
            .annotate(
                sales_count=Sum("sold_items__quantity"),
                average_rating=Avg("reviews__rating"),
                review_count=Count("reviews", distinct=True),
                behavior_score=item_score,
            )
            .order_by(
                "-behavior_score",
                "-views",
                "-likes",
                "-updated",
            )[:limit + len(used_item_ids)]
        )

        if not items:
            continue

        # Avoid turning the homepage into repeated copies of the same products,
        # while allowing the behavior score to decide which products survive.
        fresh_items = [item for item in items if item.id not in used_item_ids][:limit]
        if not fresh_items:
            continue

        for item in fresh_items:
            used_item_ids.add(item.id)

        collections.append({
            "id": category.id,
            "name": category.name,
            "department": category.department.name if category.department else None,
            "section": (
                category.department.section.name
                if category.department and category.department.section
                else None
            ),
            "personalized": (
                category.id in category_interest_ids
                or category.id in search_category_counts
            ),
            "items": _serialize_discovery(fresh_items, request),
        })

        if len(collections) >= max_sections:
            break

    return Response(collections)
