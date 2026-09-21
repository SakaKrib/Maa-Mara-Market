from django.db.models import Avg, Count, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ReactSerializers.models import Item
from core.models import SearchEvent
from order.models import OrderItem
from .models import Review, Wishlist, VendorRating


@api_view(["GET"])
@permission_classes([AllowAny])
def item_marketplace_context_v2(request, pk):
    """
    Customer-facing context for a single product page.

    Includes:
    - how many other pending carts contain this item
    - wishlist activity
    - recent searches for the current shopper
    - popular marketplace searches related to this item
    - item/shop reviews
    - more from the shop
    - related product discovery
    """
    item = get_object_or_404(
        Item.objects.select_related(
            "vendor", "category", "subcategory", "department", "section", "brand"
        ),
        pk=pk,
    )

    user = request.user if request.user.is_authenticated else None
    visitor_id = request.COOKIES.get("visitorId")

    wishlist_qs = Wishlist.objects.filter(item=item)
    wishlist_count = wishlist_qs.count()

    if user:
        is_wishlisted = wishlist_qs.filter(user=user).exists()
        own_cart_filter = Q(order__user=user)
    elif visitor_id:
        is_wishlisted = wishlist_qs.filter(visitor_id=visitor_id).exists()
        own_cart_filter = Q(order__visitor_id=visitor_id)
    else:
        is_wishlisted = False
        own_cart_filter = Q(pk__isnull=True)

    own_cart_qs = OrderItem.objects.filter(
        item=item,
        order__status__iexact="pending",
    ).filter(own_cart_filter)

    cart_quantity = own_cart_qs.aggregate(total=Sum("quantity"))["total"] or 0

    # Etsy-style "In X carts" means the number of active carts, not the
    # total number of units sitting in those carts. Count each cart once.
    other_cart_qs = (
        OrderItem.objects.filter(
            item=item,
            order__status__iexact="pending",
        )
        .exclude(own_cart_filter)
        .values("order_id")
        .distinct()
    )
    in_carts_count = other_cart_qs.count()

    recent_searches = SearchEvent.objects.none()
    if user:
        recent_searches = (
            SearchEvent.objects.filter(user=user)
            .order_by("-created_at")
            .values_list("query", flat=True)[:8]
        )
    elif visitor_id:
        recent_searches = (
            SearchEvent.objects.filter(
                visitor_id=visitor_id,
                user__isnull=True,
            )
            .order_by("-created_at")
            .values_list("query", flat=True)[:8]
        )

    recent_terms = []
    seen_terms = set()
    for query in recent_searches:
        normalized = str(query or "").strip()
        key = normalized.lower()
        if normalized and key not in seen_terms:
            seen_terms.add(key)
            recent_terms.append(normalized)

    taxonomy_terms = [
        getattr(item.category, "name", None),
        getattr(item.subcategory, "name", None),
        getattr(item.brand, "name", None),
        item.item_attribute,
    ]

    # Use the product/taxonomy vocabulary to find actual marketplace searches
    # that other shoppers have made, then rank them by frequency.
    name_tokens = [
        token.strip(".,!?;:/\\\\()[]{}").lower()
        for token in str(item.name or "").split()
        if len(token.strip(".,!?;:/\\\\()[]{}")) >= 3
    ][:6]

    related_search_terms = []
    for value in taxonomy_terms + name_tokens:
        normalized = str(value or "").strip()
        if len(normalized) >= 3:
            related_search_terms.append(normalized)

    popular_searches = []
    if related_search_terms:
        search_filter = Q()
        for term in related_search_terms:
            search_filter |= Q(query__icontains=term)

        popular_qs = (
            SearchEvent.objects.filter(search_filter)
            .exclude(query__isnull=True)
            .exclude(query="")
            .values("query")
            .annotate(search_count=Count("id"))
            .order_by("-search_count", "query")[:8]
        )

        for row in popular_qs:
            query = str(row["query"] or "").strip()
            if query:
                popular_searches.append({
                    "query": query,
                    "count": int(row["search_count"] or 0),
                })

    related_searches = []
    seen_related = set()

    for row in popular_searches:
        value = row["query"]
        key = value.lower()
        if key not in seen_related:
            seen_related.add(key)
            related_searches.append(value)

    for value in recent_terms + taxonomy_terms:
        normalized = str(value or "").strip()
        key = normalized.lower()
        if normalized and key not in seen_related:
            seen_related.add(key)
            related_searches.append(normalized)

    related_searches = related_searches[:10]

    def compact_product(product):
        image_url = None
        if product.image:
            try:
                image_url = request.build_absolute_uri(product.image.url)
            except Exception:
                image_url = product.image.url

        review_stats = product.reviews.aggregate(
            average=Avg("rating"),
            count=Count("id"),
        )

        return {
            "id": product.id,
            "name": product.name,
            "image": image_url,
            "price": product.price,
            "discount_price": product.discount_price,
            "final_price": round(product.get_item_final_price(), 2),
            "final_discounted_price": round(product.get_item_final_discounted_price(), 2),
            "save_upto": round(product.get_save_upto or 0, 2),
            "percentage_discount": product.percentage_discount,
            "in_stock": product.in_stock,
            "available": product.available,
            "slug": product.slug,
            "likes": product.likes,
            "views": product.views,
            "average_rating": (
                round(review_stats["average"], 2)
                if review_stats["average"] is not None
                else None
            ),
            "review_count": review_stats["count"] or 0,
        }

    item_reviews_qs = (
        Review.objects.filter(item=item)
        .select_related("user")
        .prefetch_related("reactions")
        .order_by("-created_at")[:8]
    )

    item_reviews = [
        {
            "id": review.id,
            "user": review.user.username if review.user else "Visitor",
            "rating": review.rating,
            "review_text": review.review_text,
            "created_at": review.created_at,
            "reactions": {
                "like": review.reactions.filter(reaction_type="like").count(),
                "dislike": review.reactions.filter(reaction_type="dislike").count(),
            },
        }
        for review in item_reviews_qs
    ]

    shop_reviews = []
    shop_summary = {"rating": 0, "review_count": 0}

    if item.vendor:
        vendor_ratings = VendorRating.objects.filter(
            vendor=item.vendor
        ).select_related("user")

        aggregates = vendor_ratings.aggregate(
            quality=Avg("quality"),
            communication=Avg("communication"),
            shipping=Avg("shipping"),
        )

        rating_values = [
            aggregates["quality"],
            aggregates["communication"],
            aggregates["shipping"],
        ]
        valid_values = [float(value) for value in rating_values if value is not None]

        shop_summary = {
            "rating": round(sum(valid_values) / len(valid_values), 1)
            if valid_values
            else 0,
            "review_count": vendor_ratings.count(),
        }

        shop_reviews = [
            {
                "id": review.id,
                "user": review.user.username if review.user else "Visitor",
                "rating": round(
                    (review.quality + review.communication + review.shipping) / 3,
                    1,
                ),
                "comment": review.comment,
                "created_at": review.created_at,
            }
            for review in vendor_ratings
            .exclude(comment__isnull=True)
            .exclude(comment="")
            .order_by("-created_at")[:8]
        ]

    base_items = (
        Item.objects.filter(
            available=True,
            in_stock__gt=0,
        )
        .exclude(pk=item.pk)
        .select_related("vendor", "category", "subcategory", "brand")
    )

    more_from_shop_qs = (
        base_items.filter(vendor=item.vendor)
        .order_by("-views", "-likes", "-updated")[:8]
        if item.vendor
        else Item.objects.none()
    )

    related_qs = base_items.filter(
        Q(subcategory=item.subcategory)
        | Q(category=item.category)
        | Q(brand=item.brand)
    ).order_by("-views", "-likes", "-updated")[:8]

    return Response({
        "item": {
            "id": item.id,
            "cart_quantity": int(cart_quantity),
            "in_carts_count": int(in_carts_count),
            "wishlist_count": int(wishlist_count),
            "is_wishlisted": is_wishlisted,
            "shop": {
                "id": item.vendor.id if item.vendor else None,
                "name": item.vendor.company_name if item.vendor else None,
                "rating": shop_summary["rating"],
                "review_count": shop_summary["review_count"],
            },
        },
        "related_searches": related_searches,
        "popular_related_searches": popular_searches,
        "item_reviews": item_reviews,
        "shop_reviews": shop_reviews,
        "shop_summary": shop_summary,
        "more_from_shop": [
            compact_product(product) for product in more_from_shop_qs
        ],
        "explore_more": [
            compact_product(product) for product in related_qs
        ],
    })
