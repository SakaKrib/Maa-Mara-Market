import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../../../../Services/Api";
import { useWishlistContext } from "../../../../../../cmponents/Hooks/WishListHook/Wishlist";
import TrendingProductCard from "./TrendingProductCard";

const GROUPS = [
  { key: "ending_soon", label: "Ending soon" },
  { key: "weekly", label: "This week's offers" },
  { key: "monthly", label: "Monthly offers" },
  { key: "long", label: "Long-running offers" },
];
const PAGE_SIZE = 12;

const OffersPage = () => {
  const [params, setParams] = useSearchParams();
  const requested = params.get("group");
  const group = GROUPS.some((g) => g.key === requested) ? requested : "ending_soon";
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlistContext();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (nextPage, replace) => {
      setLoading(true);
      setFailed(false);
      try {
        const { data } = await api.get("/api/homepage-offers/", { params: { group, page: nextPage, limit: PAGE_SIZE } });
        const block = data?.groups?.[0] || { items: [], total: 0, has_more: false };
        // An item is listed once, even if a later page repeats it.
        setItems((current) => {
          const base = replace ? [] : current;
          const seen = new Set(base.map((item) => item.id));
          return [...base, ...block.items.filter((item) => !seen.has(item.id))];
        });
        setTotal(block.total || 0);
        setHasMore(Boolean(block.has_more));
        setPage(nextPage);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [group]
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  return (
    <section className="px-4 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="mm-market-section-title mb-4">Items on offer</h1>
        <div className="mb-6 flex flex-wrap gap-2">
          {GROUPS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setParams({ group: entry.key })}
              className={`rounded-[20px] border px-4 py-2 text-sm font-semibold transition ${
                entry.key === group
                  ? "border-[#2563eb] bg-[#2563eb] text-white"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {failed && <p className="text-sm text-red-600">Could not load offers. Please try again.</p>}
        {!loading && !failed && items.length === 0 && (
          <p className="text-sm text-muted-foreground">There are no offers running in this group right now.</p>
        )}

        <div className="product-card-grid grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {items.map((item) => {
            const saved = wishlist.some((entry) => entry.item?.id === item.id || entry.id === item.id);
            return (
              <TrendingProductCard
                key={item.id}
                item={item}
                isWishlisted={saved}
                onToggleWishlist={async (event) => {
                  event.stopPropagation();
                  if (saved) await removeFromWishlist(item.id);
                  else await addToWishlist(item.id);
                }}
              />
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              disabled={loading}
              onClick={() => load(page + 1, false)}
              className="rounded-[20px] bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {loading ? "Loading…" : `View more (${Math.max(total - items.length, 0)} left)`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default OffersPage;
