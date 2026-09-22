import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, Tag, Megaphone, FileText } from "lucide-react";
import api from "../../../../Services/Api";
import VendorItemRequestForm from "../Forms/VendorItemRequest/VendorItemRequest";
import BannerAdd from "../../Banners/Banners";
import CreateBlog from "../../Blogs/BlogCreate";

const truncateWords = (text, numWords) => {
  if (!text) return "";
  const words = text.split(" ");
  return words.length > numWords
    ? words.slice(0, numWords).join(" ") + "..."
    : text;
};

const VendorItems = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [reason, setReason] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState("all");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  const showSnack = (message, severity = "success") =>
    setSnack({ open: true, message, severity });

  const fetchItems = async () => {
    try {
      const res = await api.get("/api/item-post/update/", { withCredentials: true });
      setItems(res.data?.results || []);
    } catch (err) {
      console.error("Items fetch error:", err);
      showSnack("Unable to load your items.", "error");
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/api/vendor/history/timeline/", { withCredentials: true });
      setHistory(res.data || []);
    } catch (err) {
      console.error("History fetch error:", err);
      showSnack("Unable to load activity history.", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchHistory();
  }, []);

  const handlePriceChangeSubmit = async (e) => {
    e.preventDefault();
    if (priceLoading) return;

    if (!selectedItem || !newPrice || !reason.trim()) {
      showSnack("Please fill in the item, new price and reason.", "warning");
      return;
    }

    setPriceLoading(true);
    try {
      await api.post(
        "/api/item-post/price-change/",
        {
          item_id: Number(selectedItem),
          new_price: Number(newPrice),
          reason: reason.trim(),
        },
        { withCredentials: true }
      );

      await Promise.all([fetchItems(), fetchHistory()]);
      setSelectedItem("");
      setNewPrice("");
      setReason("");
      showSnack("Price change request submitted successfully.");
    } catch (err) {
      console.error("Price change error:", err);
      showSnack(
        err?.response?.data?.detail || "Failed to submit price change request.",
        "error"
      );
    } finally {
      setPriceLoading(false);
    }
  };

  const filteredHistory =
    historyTab === "all" ? history : history.filter((h) => h.type === historyTab);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Product management
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-card-foreground">
            Add Products
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Create products, promote your store, publish blog content and request price changes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create product
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-xl bg-muted p-2"><Plus className="h-4 w-4 text-primary" /></div>
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Create Item</h2>
              <p className="text-xs text-muted-foreground">Submit a new product for your store.</p>
            </div>
          </div>
          <VendorItemRequestForm />
        </article>

        <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-xl bg-muted p-2"><Tag className="h-4 w-4 text-primary" /></div>
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Request Price Change</h2>
              <p className="text-xs text-muted-foreground">Submit a price change for an existing item.</p>
            </div>
          </div>

          <form onSubmit={handlePriceChangeSubmit} className="space-y-3">
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full rounded-[20px] border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">Select item</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>

            <input
              type="number"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="New price"
              className="w-full rounded-[20px] border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for the price change"
              rows={4}
              className="w-full resize-y rounded-[20px] border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />

            <button
              type="submit"
              disabled={priceLoading}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {priceLoading ? "Submitting..." : "Submit price request"}
            </button>
          </form>
        </article>

        <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-xl bg-muted p-2"><Megaphone className="h-4 w-4 text-primary" /></div>
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Store Banner</h2>
              <p className="text-xs text-muted-foreground">Manage promotional banner content.</p>
            </div>
          </div>
          <BannerAdd item={items} />
        </article>

        <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-xl bg-muted p-2"><FileText className="h-4 w-4 text-primary" /></div>
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Blog Content</h2>
              <p className="text-xs text-muted-foreground">Create content for your store.</p>
            </div>
          </div>
          <CreateBlog items={items} />
        </article>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">Activity History</h2>
            <p className="text-xs text-muted-foreground">Track banner, blog and price-related activity.</p>
          </div>
          <button
            type="button"
            onClick={() => { fetchItems(); fetchHistory(); }}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["all", "banners", "blogs", "prices"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setHistoryTab(tab)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition ${
                historyTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {historyLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading activity...</p>
          ) : filteredHistory.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity found for this filter.</p>
          ) : (
            filteredHistory.map((h) => (
              <article key={`${h.id}-${h.type}`} className="rounded-xl border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold text-card-foreground">
                  {truncateWords(h.title || h.name || h.type, 8)}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {truncateWords(h.subtitle || h.description || h.message || "No details", 14)}
                </p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Type: {h.type}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      {snack.open && (
        <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
          {snack.message}
          <button
            type="button"
            onClick={() => setSnack((prev) => ({ ...prev, open: false }))}
            className="ml-3 text-xs text-muted-foreground hover:text-card-foreground"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </section>
  );
};

export default VendorItems;