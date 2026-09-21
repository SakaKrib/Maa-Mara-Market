from functools import reduce
from operator import add

from django.core.paginator import EmptyPage, Paginator
from django.db.models import Case, IntegerField, Q, Value, When
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ReactSerializers.models import Item
from .Serializer import ItemSerializer
from order.views import IsAuthenticatedOrVisitor


SEARCH_PAGE_SIZE = 12
MAX_PAGE_SIZE = 48
SUGGESTION_LIMIT = 6


def _search_fields_for_token(token):
    """
    Search the customer marketplace across the complete public-facing item
    taxonomy and textual product metadata.
    """
    return (
        Q(name__icontains=token)
        | Q(description__icontains=token)
        | Q(item_attribute__icontains=token)
        | Q(gender_based__icontains=token)
        | Q(children_size_based_age__icontains=token)
        | Q(roast_type__icontains=token)
        | Q(coffee_state__icontains=token)
        | Q(brand__name__icontains=token)
        | Q(brand__description__icontains=token)
        | Q(section__name__icontains=token)
        | Q(department__name__icontains=token)
        | Q(category__name__icontains=token)
        | Q(subcategory__name__icontains=token)
        | Q(variants__color__icontains=token)
        | Q(shoe_input__shoe_type__icontains=token)
        | Q(shoe_input__shoe_gender__icontains=token)
        | Q(kids_sizes__age_group__icontains=token)
        | Q(weight__unit__icontains=token)
        | Q(length__unit__icontains=token)
        | Q(shipping_dimension__unit__icontains=token)
        | Q(shipping_dimension__weight_unit__icontains=token)
    )


def _relevance_expression(query, tokens):
    """
    Give strong preference to exact/name matches, then taxonomy and metadata
    matches, while still allowing broad descriptive matches.
    """
    expressions = [
        Case(
            When(name__iexact=query, then=Value(1000)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        Case(
            When(name__istartswith=query, then=Value(800)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        Case(
            When(name__icontains=query, then=Value(650)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        Case(
            When(category__name__icontains=query, then=Value(500)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        Case(
            When(subcategory__name__icontains=query, then=Value(480)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        Case(
            When(department__name__icontains=query, then=Value(440)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        Case(
            When(section__name__icontains=query, then=Value(400)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        Case(
            When(brand__name__icontains=query, then=Value(360)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        Case(
            When(item_attribute__icontains=query, then=Value(340)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        Case(
            When(description__icontains=query, then=Value(250)),
            default=Value(0),
            output_field=IntegerField(),
        ),
        Case(
            When(variants__color__icontains=query, then=Value(220)),
            default=Value(0),
            output_field=IntegerField(),
        ),
    ]

    # Add a smaller score for every individual search word. This makes
    # multi-word searches such as "billets tool" useful even when the exact
    # phrase is not stored in one field.
    for token in tokens:
        expressions.append(
            Case(
                When(name__icontains=token, then=Value(90)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        expressions.append(
            Case(
                When(
                    Q(category__name__icontains=token)
                    | Q(subcategory__name__icontains=token)
                    | Q(department__name__icontains=token)
                    | Q(section__name__icontains=token),
                    then=Value(70),
                ),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        expressions.append(
            Case(
                When(
                    Q(item_attribute__icontains=token)
                    | Q(brand__name__icontains=token)
                    | Q(variants__color__icontains=token)
                    | Q(shoe_input__shoe_type__icontains=token)
                    | Q(shoe_input__shoe_gender__icontains=token)
                    | Q(kids_sizes__age_group__icontains=token),
                    then=Value(55),
                ),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        expressions.append(
            Case(
                When(description__icontains=token, then=Value(35)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )

    return reduce(add, expressions, Value(0))


def _compact_suggestion(item):
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "image": item.image.url if item.image else None,
        "category": str(item.category) if item.category else None,
        "subcategory": str(item.subcategory) if item.subcategory else None,
        "brand": str(item.brand) if item.brand else None,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def search_items(request):
    """
    Customer marketplace search.

    Searches all customer-visible textual item metadata and the public product
    taxonomy, ranks results by relevance, and returns real pagination metadata.
    """
    query = " ".join((request.GET.get("q") or "").split())
    category_id = request.GET.get("category_id")

    # Category collection pages reuse this endpoint so the homepage's
    # "View all" action opens the complete collection rather than turning
    # the category name into a text search.
    if category_id:
        try:
            category_id = int(category_id)
        except (TypeError, ValueError):
            category_id = None

    if not query and not category_id:
        return Response(
            {
                "query": "",
                "results": [],
                "suggestions": [],
                "total": 0,
                "page": 1,
                "page_size": SEARCH_PAGE_SIZE,
                "total_pages": 0,
            }
        )

    requested_page_size = request.GET.get("page_size", SEARCH_PAGE_SIZE)
    try:
        page_size = max(1, min(int(requested_page_size), MAX_PAGE_SIZE))
    except (TypeError, ValueError):
        page_size = SEARCH_PAGE_SIZE

    try:
        page_number = max(1, int(request.GET.get("page", 1)))
    except (TypeError, ValueError):
        page_number = 1

    # Keep all words, but allow a product to match through any public-facing
    # searchable field. Ranking rewards products that match more strongly.
    tokens = list(dict.fromkeys(token.lower() for token in query.split() if token))

    queryset = Item.objects.filter(available=True)

    if category_id:
        queryset = queryset.filter(category_id=category_id)

    if tokens:
        search_filter = reduce(
            lambda current, token: current | _search_fields_for_token(token),
            tokens[1:],
            _search_fields_for_token(tokens[0]),
        )
        queryset = queryset.filter(search_filter)
        .select_related(
            "section",
            "department",
            "category",
            "subcategory",
            "brand",
        )
        .prefetch_related(
            "variants",
            "reviews",
            "kids_sizes",
            "shoe_input",
        )
        .annotate(
            search_relevance=_relevance_expression(query, tokens)
            if tokens
            else Value(0, output_field=IntegerField())
        )
        .distinct()
        .order_by("-search_relevance", "-views", "-likes", "-created_at", "name")
    )

    paginator = Paginator(queryset, page_size)
    total = paginator.count
    total_pages = paginator.num_pages

    if total:
        try:
            page_obj = paginator.page(page_number)
        except EmptyPage:
            page_number = total_pages
            page_obj = paginator.page(page_number)
    else:
        page_obj = []

    suggestion_mode = str(request.GET.get("suggestions", "")).lower() in {
        "1",
        "true",
        "yes",
    }

    if suggestion_mode:
        suggestions = [_compact_suggestion(item) for item in list(page_obj)[:SUGGESTION_LIMIT]]
        return Response(
            {
                "query": query,
                "results": suggestions,
                "suggestions": suggestions,
                "total": total,
                "page": page_number,
                "page_size": len(suggestions),
                "total_pages": total_pages,
            }
        )

    serializer = ItemSerializer(page_obj, many=True)
    return Response(
        {
            "query": query,
            "results": serializer.data,
            "suggestions": [
                _compact_suggestion(item)
                for item in list(page_obj)[:SUGGESTION_LIMIT]
            ],
            "total": total,
            "page": page_number,
            "page_size": page_size,
            "total_pages": total_pages,
        }
    )
