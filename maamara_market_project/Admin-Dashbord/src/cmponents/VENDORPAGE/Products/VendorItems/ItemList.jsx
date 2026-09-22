import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, Tag, Megaphone, FileText } from "lucide-react";
import api from "../../../../Services/Api";
import ItemAddNew from "../Forms/AddingNewItem";
import { useVendor } from "../vendorhooks";
import BannerAdd from "../../Banners/Banners";
import CreateBlog from "../../Blogs/BlogCreate";

const truncateWords = (text, numWords) => {
  if (!text) return "";
  const words = String(text).split(" ");
  return words.length > numWords
    ? words.slice(0, numWords).join(" ") + "..."
    : String(text);
};

const TABS = [
  { id: "item", label: "Create Item", icon: Plus },
  { id: "banner", label: "Create New Banner", icon: Megaphone },
  { id: "blog", label: "Create New Blog", icon: FileText },
  { id: "price", label: "Create New Price Change", icon: Tag },
];

const VendorItems = () => {
  const { vendor } = useVendor();
  const [activeTab, setActiveTab] = useState("item");

  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [reason, setReason] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);

  const [historyTab, setHistoryTab] = useState("all");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnack = (message, severity = "success") =>
    setSnack({ open: true, message, severity });

  const fetchItems = async () => {
    try {
      const res = await api.get("/api/item-post/update/", {
        withCredentials: true,
      });
      setItems(res.data?.results || []);
    } catch (err) {
      console.error("Items fetch error:", err);
      showSnack("Unable to load your items.", "error");
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/api/vendor/history/timeline/", {
        withCredentials: true,
      });
      setHistory(Array.isArray(res.data) ? res.data : res.data?.results || []);
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

  const handleRefresh = async () => {
    await Promise.all([fetchItems(), fetchHistory()]);
  };

  const filteredHistory =
    historyTab === "all"
      ? history
      : history.filter((h) => {
          const type = String(h.type || "").toLowerCase();
          if (historyTab === "items") {
            return ["item", "items", "item_request", "item_requests"].includes(type);
          }
          return type === historyTab;
        });

  const renderActiveSection = () => {
    if (activeTab === "item") {
      return (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-xl bg-muted p-2">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-card-foreground">Create Item</h2>
              <p className="text-xs text-muted-foreground">
                Submit a new product for your store.
              </p>
            </div>
          </div>

          <ItemAddNew
            vendor={vendor}
            vendorId={vendor?.id}
            onSave={() => {
              fetchItems();
              fetchHistory();
            }}
          />
        </section>
      );
    }

    if (activeTab === "banner") {
      return (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-xl bg-muted p-2">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-card-foreground">Create New Banner</h2>
              <p className="text-xs text-muted-foreground">
                Create a homepage-ready promotional banner.
              </p>
            </div>
          </div>
          <BannerAdd
            items={items}
            onSave={() => {
              fetchHistory();
            }}
          />
        </section>
      );
    }

    if (activeTab === "blog") {
      return (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-xl bg-muted p-2">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-card-foreground">Create New Blog</h2>
              <p className="text-xs text-muted-foreground">
                Create, edit and track your blog submissions.
              </p>
            </div>
          </div>
          <CreateBlog items={items} />
        </section>
      );
    }

    return (
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
          <div className="rounded-xl bg-muted p-2">
            <Tag className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-card-foreground">
              Create New Price Change
            </h2>
            <p className="text-xs text-muted-foreground">
              Submit a price change request for an existing item.
            </p>
          </div>
        </div>

        <form onSubmit={handlePriceChangeSubmit} className="mx-auto max-w-2xl space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
              Item
            </label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full rounded-[20px] border border-gray-300 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            >
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
              New price
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="New price"
              className="w-full rounded-[20px] border border-gray-300 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for the price change"
              rows={5}
              className="w-full resize-y rounded-[20px] border border-gray-300 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={priceLoading}
            className="w-full rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {priceLoading ? "Submitting..." : "Submit Price Change"}
          </button>
        </form>
      </section>
    );
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Product management
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-card-foreground">
            Create & Manage
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Choose an action below. Only the selected form is rendered.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={
                  active
                    ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
                    : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-background px-4 py-3 text-sm font-semibold text-card-foreground transition hover:bg-muted"
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {renderActiveSection()}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">Activity History</h2>
            <p className="text-xs text-muted-foreground">
              Track submitted items, banners, blogs and price changes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-300 bg-card px-3 py-2 text-xs font-semibold text-card-foreground transition hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["all", "items", "banners", "blogs", "prices"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setHistoryTab(tab)}
              className={
                historyTab === tab
                  ? "rounded-full bg-primary px-3 py-2 text-xs font-semibold capitalize text-primary-foreground"
                  : "rounded-full border border-gray-300 bg-card px-3 py-2 text-xs font-semibold capitalize text-muted-foreground transition hover:bg-muted"
              }
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {historyLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading activity...
            </p>
          ) : filteredHistory.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No activity found for this filter.
            </p>
          ) : (
            filteredHistory.map((h) => (
              <article
                key={`${h.id}-${h.type}`}
                className="rounded-[20px] border border-gray-300 bg-muted/30 p-4"
              >
                <h3 className="text-sm font-semibold text-card-foreground">
                  {truncateWords(h.title || h.name || h.type, 8)}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {truncateWords(
                    h.subtitle || h.description || h.message || "No details",
                    14
                  )}
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
