import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../../../../Services/Api";
import FormattedCurrency from "../Currency/FormattedCurrency";
import { useCartContext } from "../CartHook/cart";

const Stars = ({ value = 0 }) => (
  <span aria-label={`${value} out of 5 stars`} className="text-xs tracking-wide">
    {"★".repeat(Math.round(Number(value) || 0))}
    <span className="text-gray-300">{"★".repeat(Math.max(0, 5 - Math.round(Number(value) || 0)))}</span>
  </span>
);

const ProductRail = ({ title, items }) => {
  if (!items?.length) return null;
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="text-xl sm:text-2xl font-medium text-gray-900">{title}</h2>
        <span className="text-xs text-gray-500">{items.length} items</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((product) => (
          <Link
            key={product.id}
            to={`/item-client/${product.id}`}
            className="group flex-none w-[170px] sm:w-[205px] snap-start"
          >
            <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">No image</div>
              )}
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-800 truncate">{product.name}</h3>
            <div className="mt-1 flex items-center gap-2">
              <Stars value={product.average_rating} />
              <span className="text-[11px] text-gray-500">({product.review_count || 0})</span>
            </div>
            <div className="mt-1 text-sm font-semibold">
              <FormattedCurrency value={Number(product.final_discounted_price ?? product.final_price ?? product.price ?? 0)} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const MarketplaceItemContext = ({ item, availableStock }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { order } = useCartContext();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await api.get(`/api/items/${item.id}/marketplace-context/`, { withCredentials: true });
        if (active) setData(response.data);
      } catch (error) {
        console.error("Marketplace item context load failed:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [item.id]);

  if (loading) {
    return (
      <div className="mt-10 py-8 text-sm text-gray-500" aria-live="polite">
        Loading more about this item…
      </div>
    );
  }

  if (!data) return null;

  const searchLinks = data.related_searches || [];
  const itemReviews = data.item_reviews || [];
  const shopReviews = data.shop_reviews || [];
  const shop = data.item?.shop;
  const backendCartQuantity = Number(data.item?.cart_quantity || 0);
  const cartQuantityFromContext = Array.isArray(order?.items)
    ? order.items
        .filter((entry) => Number(entry?.id || entry?.item?.id) === Number(item.id))
        .reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
    : null;
  const cartQuantity = cartQuantityFromContext === null ? backendCartQuantity : cartQuantityFromContext;
  const wishlistCount = Number(data.item?.wishlist_count || 0);
  const stockLeft = Math.max(0, Number(availableStock || 0));

  return (
    <div className="mt-4 border-t border-gray-100 pt-8">
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500">In your cart</p>
          <p className="mt-1 text-lg font-medium">{cartQuantity}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500">Quantity left</p>
          <p className="mt-1 text-lg font-medium">{stockLeft}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500">Wishlist saves</p>
          <p className="mt-1 text-lg font-medium">{wishlistCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] text-gray-500">Item rating</p>
          <p className="mt-1 text-lg font-medium">{Number(item.average_rating || 0).toFixed(1)}</p>
        </div>
      </section>

      {!!searchLinks.length && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="text-xl sm:text-2xl font-medium">Related searches</h2>
            <Link to="/list" className="text-xs underline text-gray-600">Explore more</Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {searchLinks.map((term) => (
              <Link
                key={term}
                to={`/list?name=${encodeURIComponent(term)}&page=1`}
                className="flex-none rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-700 whitespace-nowrap hover:bg-gray-50 snap-start"
              >
                {term}
              </Link>
            ))}
          </div>
        </section>
      )}

      {shop && (
        <section className="mt-10 rounded-2xl border border-gray-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">Shop</p>
              <h2 className="mt-1 text-xl font-medium">{shop.name || "This shop"}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Stars value={shop.rating} />
                <span className="text-gray-500">{shop.rating || 0} · {shop.review_count || 0} reviews</span>
              </div>
            </div>
            <Link to={`/list?vendor_id=${shop.id}&page=1`} className="text-sm underline">More from this shop</Link>
          </div>
          {shopReviews.length > 0 && (
            <div className="mt-5 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {shopReviews.map((review) => (
                <article key={review.id} className="min-w-[250px] max-w-[310px] rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2">
                    <Stars value={review.rating} />
                    <span className="text-xs text-gray-500">{review.user}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {itemReviews.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="text-xl sm:text-2xl font-medium">Reviews about this item</h2>
            <span className="text-xs text-gray-500">{itemReviews.length} shown</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {itemReviews.map((review) => (
              <article key={review.id} className="min-w-[260px] max-w-[330px] rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <Stars value={review.rating} />
                  <span className="text-xs text-gray-500">{review.user}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{review.review_text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <ProductRail title="More from the shop" items={data.more_from_shop} />
      <ProductRail title="Explore more" items={data.explore_more} />
    </div>
  );
};

export default MarketplaceItemContext;