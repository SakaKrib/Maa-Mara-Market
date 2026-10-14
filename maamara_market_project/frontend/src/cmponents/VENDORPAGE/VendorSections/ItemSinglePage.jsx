import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import {
  eyeSharp,
  cartSharp,
  heartSharp,
  starSharp,
  cashSharp,
  cubeSharp,
  trashSharp,
} from "ionicons/icons";
import api, { resolveApiAssetUrl } from "../../../Services/Api";
import { useAuth } from "../../Auth/AuthContext/Context";
import useItemActivityLogs from "../../Hooks/ActivityHook/ItemActivityHook";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const Metric = ({ icon, label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
      <IonIcon icon={icon} className="text-lg text-[#2563eb]" />
      {label}
    </div>
    <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
  </div>
);

const SingleItemProfile = () => {
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const { id } = useParams();
  const navigate = useNavigate();
  const { authType, user } = useAuth();
  const isAdmin = authType === "admin" || Boolean(user?.is_staff || user?.is_superuser);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showPriceEditor, setShowPriceEditor] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  const {
    activityLogs,
    fetchActivityLogs,
    deleteSingleLog,
    clearItemLogs,
  } = useItemActivityLogs(id);

  const loadItem = async () => {
    try {
      setError("");
      const response = await api.get("/api/admin/items/" + id + "/performance/", {
        withCredentials: true,
      });
      setData(response.data);
      await fetchActivityLogs();
    } catch (requestError) {
      console.error("Failed to load item performance:", requestError);
      setError(requestError.response?.data?.detail || "Unable to load item details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadItem();
  }, [id]);

  if (loading) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading item details…</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error || "Item not found."}</p>
      </div>
    );
  }

  const item = data.item || {};
  const stats = data.stats || {};
  const vendor = data.vendor || {};
  const image = resolveApiAssetUrl(item.image) || "/placeholder.png";

  const handleDelete = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this item permanently? This action cannot be undone.")) return;

    try {
      setDeleting(true);
      await api.delete("/api/item-post/update/" + id + "/", { withCredentials: true });
      navigate("/admin-dashboard/vendors");
    } catch (requestError) {
      console.error("Failed to delete item:", requestError);
      setSnackbar({ open: true, message: requestError.response?.data?.detail || "Unable to delete item." });
    } finally {
      setDeleting(false);
    }
  };


  const handlePriceSave = async (event) => {
    event.preventDefault();
    const nextPrice = Number(priceDraft);
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      setSnackbar({ open: true, message: "Enter a valid non-negative price." });
      return;
    }
    try {
      setSavingPrice(true);
      await api.patch("/api/item-post/update/" + id + "/", { price: nextPrice }, { withCredentials: true });
      setShowPriceEditor(false);
      setSnackbar({ open: true, message: "Item price updated successfully." });
      await loadItem();
    } catch (requestError) {
      console.error("Failed to update item price:", requestError);
      setSnackbar({ open: true, message: requestError.response?.data?.detail || requestError.response?.data?.price?.[0] || "Unable to update the item price." });
    } finally {
      setSavingPrice(false);
    }
  };
  return (
    <>
      {snackbar.open && (
        <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
          {snackbar.message}
          <button type="button" onClick={handleCloseSnackbar} className="ml-3 text-xs text-muted-foreground hover:text-card-foreground" aria-label="Dismiss notification">×</button>
        </div>
      )}
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-2 sm:p-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563eb]">Item performance</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{item.name || "Item"}</h1>
          <p className="mt-1 text-sm text-gray-500">{vendor.company_name || "Vendor item"} · {item.category || "Uncategorized"}</p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setPriceDraft(String(item.price ?? "")); setShowPriceEditor((open) => !open); }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            >
              {showPriceEditor ? "Cancel price change" : "Change price"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IonIcon icon={trashSharp} />
              {deleting ? "Deleting…" : "Delete item"}
            </button>
          </div>
        )}
      </div>

      {isAdmin && showPriceEditor && (
        <form onSubmit={handlePriceSave} className="mx-auto w-full max-w-[1500px] rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5">
          <label htmlFor="admin-item-price" className="block text-sm font-semibold text-gray-800">New item price (KES)</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input id="admin-item-price" type="number" min="0" step="0.01" required value={priceDraft} onChange={(event) => setPriceDraft(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500" />
            <button type="submit" disabled={savingPrice} className="rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{savingPrice ? "Saving…" : "Save new price"}</button>
          </div>
          <p className="mt-2 text-xs text-gray-500">This updates the item price directly; it does not create a price-change request.</p>
        </form>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[280px_minmax(0,1fr)]">
              <img
                src={image}
                alt={item.name || "Item"}
                className="h-64 w-full rounded-xl border border-gray-200 bg-gray-50 object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/placeholder.png";
                }}
              />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">{item.description || "No description available."}</p>
                <div className="mt-5 flex flex-wrap items-baseline gap-3">
                  <span className="text-2xl font-bold text-[#2563eb]">KES {Number(stats.price || item.price || 0).toLocaleString()}</span>
                  {stats.discount_price !== null && stats.discount_price !== undefined && (
                    <span className="text-sm text-gray-500 line-through">KES {Number(stats.discount_price).toLocaleString()}</span>
                  )}
                </div>
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigate("/vendors-dashboard/edit-item/" + item.id, { state: { focusOffer: true } })}
                    className="mt-5 inline-flex w-fit items-center justify-center rounded-full bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                  >
                    Put this item on offer
                  </button>
                )}
                <div className="mt-5 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                  <span>Category: {item.category || "—"}</span>
                  <span>Department: {item.department || "—"}</span>
                  <span>Vendor: {vendor.company_name || "—"}</span>
                  <span>Status: {vendor.is_active === false ? "Suspended" : "Active"}</span>
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Complete product details</h2>
              <p className="mt-1 text-sm text-gray-500">Saved product information, specifications, variants, sizes and offer settings.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Department", item.department],
                ["Category", item.category],
                ["Subcategory", item.subcategory],
                ["Section", item.section],
                ["Brand", item.brand?.name || item.brand?.title || item.brand],
                ["Item attribute", item.item_attribute],
                ["Gender sizing", item.gender_based],
                ["Children size age group", item.children_size_based_age],
                ["Organic", item.is_organic],
                ["Fresh food", item.is_fresh_food],
                ["Returnable", item.returnable],
                ["Available for sale", item.available],
                ["Stock quantity", item.in_stock],
                ["Discount price", item.discount_price == null ? null : "KES " + Number(item.discount_price).toLocaleString()],
                ["Limited-time offer", item.in_offer],
                ["Offer discount", item.offer?.discount_percentage == null ? null : item.offer.discount_percentage + "%"],
                ["Offer start date", item.offer?.start_date],
                ["Offer end date", item.offer?.end_date],
                ["Occasions", item.occasions],
                ["Manufactured date", item.manufactured_date],
                ["Expiry date", item.expiry_date],
                ["Roast type", item.roast_type],
                ["Coffee state", item.coffee_state],
                ["Weight", item.weight?.value != null ? item.weight.value + " " + (item.weight.unit || "kg") : item.weight],
                ["Length", item.length?.value != null ? item.length.value + " " + (item.length.unit || "cm") : item.length],
                ["Shipping dimensions", item.shipping_dimension || item.shipping_dimension_data],
                ["Created", item.created_at ? new Date(item.created_at).toLocaleString() : null],
                ["Last updated", item.updated ? new Date(item.updated).toLocaleString() : null],
              ].map(([label, value]) => {
                const displayValue = Array.isArray(value)
                  ? value.map((entry) => typeof entry === "object" ? (entry?.name || entry?.label || entry?.occasion || JSON.stringify(entry)) : String(entry)).join(", ")
                  : value && typeof value === "object"
                    ? Object.entries(value).filter(([, part]) => part !== null && part !== "").map(([key, part]) => `${key.replaceAll("_", " ")}: ${typeof part === "object" ? JSON.stringify(part) : String(part)}`).join(" · ")
                    : typeof value === "boolean" ? (value ? "Yes" : "No") : value;
                return (
                  <div key={label} className="min-w-0 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-gray-800">{displayValue === null || displayValue === undefined || displayValue === "" ? "—" : displayValue}</p>
                  </div>
                );
              })}
            </div>

            {((item.variants || item.color_variants || []).length > 0) && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-bold text-gray-900">Colour variants and size stock</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(item.variants || item.color_variants || []).map((variant, index) => {
                    const variantImage = resolveApiAssetUrl(variant.image || variant.color_image);
                    return (
                      <article key={variant.id || `${variant.color || "variant"}-${index}`} className="rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-3">
                          {variantImage ? <img src={variantImage} alt={`${variant.color || "Variant"} colour`} className="h-14 w-14 rounded-lg border border-gray-200 object-cover" /> : <span className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-100" aria-hidden="true" /> }
                          <div><p className="text-sm font-semibold text-gray-900">{variant.color || variant.name || `Variant ${index + 1}`}</p><p className="text-xs text-gray-500">{(variant.sizes || []).length} size option(s)</p></div>
                        </div>
                        {(variant.sizes || []).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{variant.sizes.map((size, sizeIndex) => <span key={size.id || `${size.size}-${sizeIndex}`} className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-700">{size.size || "Size"} · Stock: {size.quantity_in_stock ?? size.stock ?? "—"}</span>)}</div>}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {(item.size_only_icon || item.size_variant || []).length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-bold text-gray-900">Standalone sizes</h3>
                <div className="mt-3 flex flex-wrap gap-2">{(item.size_only_icon || item.size_variant || []).map((size, index) => <span key={size.id || `${size.size}-${index}`} className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700">{size.size || "Size"} · Stock: {size.quantity_in_stock ?? size.stock ?? "—"}</span>)}</div>
              </div>
            )}

            {(item.kids_sizes || []).length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-bold text-gray-900">Children’s sizes</h3>
                <div className="mt-3 flex flex-wrap gap-2">{item.kids_sizes.map((size, index) => <span key={size.id || `${size.age_group || size.size}-${index}`} className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700">{size.age_group || size.size || "Size"} · Stock: {size.quantity_in_stock ?? size.stock ?? "—"}</span>)}</div>
              </div>
            )}

            {(item.shoe_input || []).length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-bold text-gray-900">Shoe specifications</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">{item.shoe_input.map((shoe, index) => <div key={shoe.id || index} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700"><p>Type: {shoe.shoe_type || "—"}</p><p>Gender: {shoe.shoe_gender || "—"}</p><p>Sizes: {Array.isArray(shoe.shoe_size) ? shoe.shoe_size.join(", ") : shoe.shoe_size || "—"}</p></div>)}</div>
              </div>
            )}

            {(item.additional_images || []).length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-bold text-gray-900">Additional product images</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{item.additional_images.map((asset, index) => { const src = resolveApiAssetUrl(asset.image || asset.url || asset.file); return src ? <img key={asset.id || index} src={src} alt={asset.alt_text || `${item.name || "Product"} image ${index + 1}`} className="aspect-square w-full rounded-xl border border-gray-200 object-cover" /> : null; })}</div>
              </div>
            )}
            {item.video && <div className="border-t border-gray-100 pt-4"><h3 className="text-sm font-bold text-gray-900">Product video</h3><video className="mt-3 max-h-80 w-full rounded-xl bg-black" controls preload="metadata" src={resolveApiAssetUrl(item.video)} /></div>}
          </section>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={cubeSharp} label="In stock" value={Number(stats.stock || 0).toLocaleString()} />
            <Metric icon={cartSharp} label="In carts" value={Number(stats.in_carts || 0).toLocaleString()} />
            <Metric icon={eyeSharp} label="Views" value={Number(stats.views || 0).toLocaleString()} />
            <Metric icon={heartSharp} label="Wishlisted" value={Number(stats.wishlist || 0).toLocaleString()} />
            <Metric icon={cashSharp} label="Units sold" value={Number(stats.sold_units || 0).toLocaleString()} />
            <Metric icon={cashSharp} label="Sales" value={"KES " + Number(stats.sales_amount || 0).toLocaleString()} />
            <Metric icon={starSharp} label="Reviews" value={Number(stats.reviews || 0).toLocaleString()} />
            <Metric icon={starSharp} label="Stars" value={Number(stats.average_stars || 0).toFixed(1) + " / 5"} />
          </div>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent item activity</h2>
              <p className="mt-1 text-xs text-gray-500">Recorded actions related to this item.</p>
            </div>
            {activityLogs.length > 0 && (
              <button
                type="button"
                onClick={clearItemLogs}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-[680px] overflow-y-auto p-5">
            {activityLogs.length ? (
              <ul className="space-y-4">
                {activityLogs.map((log, index) => (
                  <li key={log.id || index} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{log.description || log.action || "Item activity"}</p>
                      <time className="mt-1 block text-xs text-gray-500">
                        {log.timestamp ? dayjs(log.timestamp).fromNow() : "Unknown time"}
                      </time>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSingleLog(log.id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No activities found.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
    </>
  );
};

export default SingleItemProfile;
