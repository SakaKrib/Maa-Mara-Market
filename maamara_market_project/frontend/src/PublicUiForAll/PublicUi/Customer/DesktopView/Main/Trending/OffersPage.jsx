import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
    <main className="mm-page min-h-[60vh] py-6 sm:py-8">
      <section className="mm-container">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>

        <header className="mb-6 border-b border-border pb-5 sm:mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Limited-time deals
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground sm:text-3xl">
            Items on offer
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Discover discounted items from our marketplace while the offers last.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {GROUPS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setParams({ group: entry.key })}
                aria-pressed={entry.key === group}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  entry.key === group
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-card-foreground hover:bg-muted"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </header>

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
              className="rounded-full border border-border bg-background px-5 py-2 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {loading ? "Loading…" : `View more (${Math.max(total - items.length, 0)} left)`}
            </button>
          </div>
        )}
      </section>
    </main>
  );
};

export default OffersPage;
