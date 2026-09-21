import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../../../../Services/Api";
import FormattedCurrency from "../Currency/FormattedCurrency";

const Stars = ({ value = 0 }) => {
  const rounded = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
  return (
    <span aria-label={`${value} out of 5 stars`} className="text-xs tracking-wide text-amber-700">
      {"★".repeat(rounded)}
      <span className="text-gray-300">{"★".repeat(5 - rounded)}</span>
    </span>
  );
};

const ProductRail = ({ title, items }) => {
  if (!items?.length) return null;
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-card-foreground sm:text-lg">{title}</h2>
          <p className="text-xs text-muted-foreground">Discover more from this marketplace collection.</p>
        </div>
        <span className="text-xs text-muted-foreground">{items.length} items</span>
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
            <h3 className="mt-2 truncate text-sm font-bold text-card-foreground">{product.name}</h3>
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
  const [descriptionOpen, setDescriptionOpen] = useState(false);

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
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-custom" aria-live="polite">
        Loading more about this item…
      </div>
    );
  }

  if (!data) return null;

  const searchLinks = data.related_searches || [];
  const popularRelatedSearches = data.popular_related_searches || [];
  const itemReviews = data.item_reviews || [];
  const shopReviews = data.shop_reviews || [];
  const shop = data.item?.shop;
  const shopSummary = data.shop_summary || {};
  const wishlistCount = Number(data.item?.wishlist_count || 0);
  const inCartsCount = Number(data.item?.in_carts_count || 0);
  const stockLeft = Math.max(0, Number(availableStock || 0));

  return (
    <div className="mt-4 border-t border-gray-100 pt-8">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-card-foreground sm:text-lg">Item overview</h2>
          <p className="text-xs text-muted-foreground">Useful activity and availability at a glance.</p>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {[
            ["In other carts", inCartsCount > 0 ? `In ${inCartsCount} carts` : "In no other carts"],
            ["Quantity left", stockLeft],
            ["Wishlist saves", wishlistCount],
            ["Item rating", Number(item.average_rating || 0).toFixed(1)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 px-3 py-3 first:pl-0 sm:px-4 sm:first:pl-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-card-foreground">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {!!item.description && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <button
            type="button"
            onClick={() => setDescriptionOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-4 text-left"
            aria-expanded={descriptionOpen}
          >
            <span>
              <span className="block text-base font-bold text-card-foreground sm:text-lg">Item description</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {descriptionOpen ? "Hide product details" : "View product details"}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-card-foreground"
            >
              {descriptionOpen ? "−" : "+"}
            </span>
          </button>

          {descriptionOpen && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-card-foreground">
                {item.description}
              </div>
            </div>
          )}
        </section>
      )}

      {!!searchLinks.length && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-card-foreground sm:text-lg">Related searches</h2>
              <p className="text-xs text-muted-foreground">Continue exploring products related to this item.</p>
            </div>
            <span className="text-xs text-muted-foreground">Popular with shoppers</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(popularRelatedSearches.length ? popularRelatedSearches : searchLinks).map((entry) => {
              const term = typeof entry === "string" ? entry : entry.query;
              const count = typeof entry === "string" ? null : Number(entry.count || 0);
              return (
                <Link
                  key={term}
                  to={`/list?name=${encodeURIComponent(term)}&page=1`}
                  className="flex-none rounded-xl border border-border bg-background px-4 py-2 text-xs text-foreground whitespace-nowrap transition-colors hover:bg-muted snap-start"
                >
                  <span className="font-medium">{term}</span>
                  {count > 0 && <span className="ml-2 text-[10px] text-muted-foreground">{count} searches</span>}
                </Link>
              );
            })}
          </div>
          <Link
            to="/list"
            className="mt-3 flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted"
          >
            Explore related searches
          </Link>
        </section>
      )}

      {shop && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Shop</p>
              <h2 className="mt-1 text-base font-bold text-card-foreground sm:text-lg">{shop.name || "Mara Mara Market"}</h2>
              <div className="mt-1 text-sm text-muted-foreground">
                {shop.rating || 0} · {shop.review_count || 0} reviews
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <Link
                to={`/list?vendor_id=${shop.id}&page=1`}
                className="flex w-full items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted sm:w-auto"
              >
                More from this shop
              </Link>
            </div>
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-card-foreground">Shop reviews</h3>
              <p className="text-xs text-muted-foreground">Ratings and feedback from shoppers about this shop.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Overall", shopSummary.rating ?? shop.rating ?? 0],
                ["Quality", shopSummary.quality ?? 0],
                ["Communication", shopSummary.communication ?? 0],
                ["Shipping", shopSummary.shipping ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border bg-background p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars value={value} />
                    <span className="text-sm font-semibold text-card-foreground">{Number(value || 0).toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>

            {shopReviews.length > 0 && (
              <div className="mt-5 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {shopReviews.map((review) => (
                  <article key={review.id} className="min-w-[250px] max-w-[310px] rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <Stars value={review.rating} />
                      <span className="text-xs text-muted-foreground">{review.user}</span>
                    </div>
                    <p className="mt-2 text-sm text-card-foreground">{review.comment}</p>
                  </article>
                ))}
              </div>
            )}

            {!shopReviews.length && (
              <p className="mt-4 text-xs text-muted-foreground">No written shop reviews yet.</p>
            )}
          </div>
          <ProductRail title="More from this shop" items={data.more_from_shop} nested />
        </section>
      )}

      {itemReviews.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-card-foreground sm:text-lg">Reviews about this item</h2>
              <p className="text-xs text-muted-foreground">Recent customer feedback for this product.</p>
            </div>
            <span className="text-xs text-muted-foreground">{itemReviews.length} shown</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {itemReviews.map((review) => (
              <article key={review.id} className="min-w-[260px] max-w-[330px] rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <Stars value={review.rating} />
                  <span className="text-xs text-muted-foreground">{review.user}</span>
                </div>
                <p className="mt-2 text-sm text-card-foreground">{review.review_text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <ProductRail title="Explore more related products" items={data.explore_more} />
    </div>
  );
};

export default MarketplaceItemContext;