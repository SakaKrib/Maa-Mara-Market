import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { resolveApiAssetUrl } from "../../../../../../Services/Api";
import FormattedCurrency from "../Currency/FormattedCurrency";

const ProductImageSkeleton = () => (
  <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true">
    <div className="absolute inset-x-5 top-5 h-2 rounded-full bg-background/50" />
    <div className="absolute inset-x-5 top-9 h-2 w-1/2 rounded-full bg-background/40" />
    <div className="absolute inset-x-5 bottom-5 h-2 w-2/3 rounded-full bg-background/40" />
  </div>
);

const Stars = ({ value = 0 }) => {
  const rounded = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
  return (
    <span className="text-xs tracking-wide text-amber-700" aria-label={String(value) + " out of 5 stars"}>
      {"★".repeat(rounded)}
      <span className="text-gray-300">{"★".repeat(5 - rounded)}</span>
    </span>
  );
};

const TrendingProduct = ({
  itemId,
  title = "You may also like",
  items: suppliedItems,
  limit = 5,
  initialVisible = 4,
  scrollable = true,
  showViewAll = false,
}) => {
  const [items, setItems] = useState(suppliedItems || []);
  const [loading, setLoading] = useState(!suppliedItems);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (Array.isArray(suppliedItems)) {
      setItems(suppliedItems);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const response = await api.get(
          "/api/items/" + itemId + "/marketplace-context/",
          { withCredentials: true }
        );
        if (active) setItems(response.data?.explore_more || []);
      } catch (error) {
        console.error("Failed to load trending products:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (itemId) load();
    return () => {
      active = false;
    };
  }, [itemId, suppliedItems]);

  const availableProducts = items.filter(Boolean).slice(0, limit);
  const products = showAll
    ? availableProducts
    : availableProducts.slice(0, Math.max(1, initialVisible));
  const canViewAll = showViewAll && availableProducts.length > initialVisible;

  if (loading || !availableProducts.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-card-foreground sm:text-lg">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Products shoppers may also find interesting.
          </p>
        </div>
        {canViewAll && (
          <button
            type="button"
            onClick={() => setShowAll((open) => !open)}
            className="flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted"
            aria-expanded={showAll}
          >
            {showAll ? "Show Less" : "View All"}
          </button>
        )}
      </div>

      <div
        className={
          scrollable
            ? "flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "grid grid-cols-2 gap-4 sm:grid-cols-4"
        }
      >
        {products.map((product) => {
          const imageUrl = resolveApiAssetUrl(
            product.image?.url ||
              product.image ||
              product.image_url ||
              product.imageUrl ||
              product.thumbnail ||
              product.photo
          );
          return (
          <Link
            key={product.id}
            to={"/item/" + product.id}
            className={
              scrollable
                ? "group w-[180px] flex-none snap-start"
                : "group min-w-0"
            }
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-background">
              {imageUrl ? (
                <>
                  <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
                  <img
                    src={imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="relative z-[1] h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:scale-[1.03]"
                    onLoad={(event) => {
                      event.currentTarget.classList.remove("opacity-0");
                      event.currentTarget.previousElementSibling?.classList.add("hidden");
                    }}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      event.currentTarget.previousElementSibling?.classList.add("hidden");
                      event.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                  <div className="hidden">
                    <ProductImageSkeleton />
                  </div>
                </>
              ) : (
                <ProductImageSkeleton />
              )}
            </div>
            <h3 className="mt-2 truncate text-sm font-semibold text-card-foreground">
              {product.name}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <Stars value={product.average_rating} />
              <span className="text-[11px] text-muted-foreground">
                ({product.review_count || 0})
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-card-foreground">
              <FormattedCurrency
                value={Number(
                  product.final_discounted_price ??
                    product.final_price ??
                    product.price ??
                    0
                )}
              />
            </p>
          </Link>
          );
        })}
      </div>
    </section>
  );
};

export default TrendingProduct;
