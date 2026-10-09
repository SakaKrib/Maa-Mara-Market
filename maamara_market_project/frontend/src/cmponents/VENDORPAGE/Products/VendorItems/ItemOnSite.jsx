import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, PackageOpen, Search, X } from "lucide-react";
import api, { resolveApiAssetUrl } from "../../../../Services/Api";
import EditItem from "../Forms/EditItem/EditItem";

const truncateWords = (text, numWords) => {
  if (!text) return "";
  const words = text.split(" ");
  return words.length > numWords
    ? words.slice(0, numWords).join(" ") + "..."
    : text;
};

const ItemsOnsite = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/api/item-post/update/", {
        withCredentials: true,
      });
      setItems(res.data?.results || []);
    } catch (err) {
      console.error("Error fetching vendor items:", err);
      setError("Unable to load your items right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter((item) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return [item.name, item.description].some((value) =>
      String(value || "").toLowerCase().includes(query)
    );
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Inventory
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-card-foreground">
            Items OnSite
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage products currently listed in your store.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
            {searchTerm.trim() ? `${filteredItems.length} of ${items.length} items` : `${items.length} ${items.length === 1 ? "item" : "items"}`}
          </span>
          <button
            type="button"
            onClick={() => {
              if (searchOpen) setSearchTerm("");
              setSearchOpen((open) => !open);
            }}
            aria-label={searchOpen ? "Close item search" : "Search items"}
            aria-expanded={searchOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-card-foreground transition hover:bg-muted"
          >
            {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => navigate("/vendors-dashboard/add-item")}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Add product
          </button>
        </div>
      </div>

      {searchOpen && !loading && !error && items.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <label htmlFor="onsite-item-search" className="sr-only">Search items by name or description</label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              id="onsite-item-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search your items..."
              className="w-full bg-transparent text-sm text-card-foreground outline-none placeholder:text-muted-foreground"
            />
            {searchTerm && <button type="button" onClick={() => setSearchTerm("")} className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-card-foreground" aria-label="Clear item search"><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Loading your items...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-card p-10 text-center shadow-sm">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={fetchItems}
            className="mt-4 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-card-foreground hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <PackageOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-base font-bold text-card-foreground">
            No items found
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Products you add and publish will appear here.
          </p>
          <button
            type="button"
            onClick={() => navigate("/vendors-dashboard/add-item")}
            className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add your first product
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-base font-bold text-card-foreground">No matching items</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try another item name or description.</p>
          <button type="button" onClick={() => setSearchTerm("")} className="mt-4 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-card-foreground hover:bg-muted">Clear search</button>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredItems.map((item) => {
            const hasDiscount =
              item.discount_price &&
              Number(item.discount_price) > 0 &&
              Number(item.discount_price) < Number(item.price);

            return (
              <article
                key={item.id}
                className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => navigate(`items/${item.id}`)}
                  className="block w-full text-left"
                  aria-label={`View ${item.name}`}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                    <img
                      src={resolveApiAssetUrl(item.image) || "/default-product.jpg"}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                    />
                  </div>
                </button>

                <div className="space-y-3 p-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-card-foreground">
                      {item.name}
                    </h2>
                    <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">
                      {truncateWords(item.description, 10) || "No description available"}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-card-foreground">
                        KES{" "}
                        {Number(hasDiscount ? item.discount_price : item.price).toLocaleString()}
                      </p>
                      {hasDiscount && (
                        <p className="text-xs text-muted-foreground line-through">
                          KES {Number(item.price).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 rounded-lg bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                      Stock: {item.in_stock}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => navigate(`items/${item.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      View item
                    </button>

                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2 py-1">
                      <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <EditItem item={item} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ItemsOnsite;
