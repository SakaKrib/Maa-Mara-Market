import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../../../../Services/Api";
import FormattedCurrency from "../Currency/FormattedCurrency";

const Stars = ({ value = 0 }) => {
  const rounded = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
  return (
    <span className="text-xs tracking-wide text-amber-700" aria-label={String(value) + " out of 5 stars"}>
      {"★".repeat(rounded)}
      <span className="text-gray-300">{"★".repeat(5 - rounded)}</span>
    </span>
  );
};

const TrendingProduct = ({ itemId, title = "You may also like", items: suppliedItems, limit = 5 }) => {
  const [items, setItems] = useState(suppliedItems || []);
  const [loading, setLoading] = useState(!suppliedItems);

  useEffect(() => {
    if (Array.isArray(suppliedItems)) {
      setItems(suppliedItems);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const response = await api.get("/api/items/" + itemId + "/marketplace-context/", { withCredentials: true });
        if (active) setItems(response.data?.explore_more || []);
      } catch (error) {
        console.error("Failed to load trending products:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (itemId) load();
    return () => { active = false; };
  }, [itemId, suppliedItems]);

  const products = items.filter(Boolean).slice(0, limit);

  if (loading || !products.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-card-foreground sm:text-lg">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Products shoppers may also find interesting.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product) => (
          <Link key={product.id} to={"/item/" + product.id} className="group w-[180px] flex-none snap-start">
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-background">
              {product.image ? (
                <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
              )}
            </div>
            <h3 className="mt-2 truncate text-sm font-semibold text-card-foreground">{product.name}</h3>
            <div className="mt-1 flex items-center gap-2">
              <Stars value={product.average_rating} />
              <span className="text-[11px] text-muted-foreground">({product.review_count || 0})</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-card-foreground">
              <FormattedCurrency value={Number(product.final_discounted_price ?? product.final_price ?? product.price ?? 0)} />
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default TrendingProduct;
