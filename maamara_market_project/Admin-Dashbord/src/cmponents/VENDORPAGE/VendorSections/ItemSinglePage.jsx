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
import EditItem from "../Products/Forms/EditItem/EditItem";
import api from "../../../Services/Api";
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { authType, user } = useAuth();
  const isAdmin = authType === "admin" || Boolean(user?.is_staff || user?.is_superuser);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

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
  const image = item.image || "/placeholder.png";

  const handleDelete = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this item permanently? This action cannot be undone.")) return;

    try {
      setDeleting(true);
      await api.delete("/api/item-post/update/" + id + "/", { withCredentials: true });
      navigate("/admin-dashboard/vendors");
    } catch (requestError) {
      console.error("Failed to delete item:", requestError);
      window.alert(requestError.response?.data?.detail || "Unable to delete item.");
    } finally {
      setDeleting(false);
    }
  };

  const itemForEditor = {
    ...item,
    vendor: vendor.id,
    vendor_id: vendor.id,
  };

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 p-2 sm:p-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563eb]">Item performance</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{item.name || "Item"}</h1>
          <p className="mt-1 text-sm text-gray-500">{vendor.company_name || "Vendor item"} · {item.category || "Uncategorized"}</p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <EditItem
              vendor={{ ...vendor, isAdmin: true }}
              item={itemForEditor}
              isAdmin
              onSuccess={loadItem}
            />
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
                <div className="mt-5 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                  <span>Category: {item.category || "—"}</span>
                  <span>Department: {item.department || "—"}</span>
                  <span>Vendor: {vendor.company_name || "—"}</span>
                  <span>Status: {vendor.is_active === false ? "Suspended" : "Active"}</span>
                </div>
              </div>
            </div>
          </div>

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
  );
};

export default SingleItemProfile;
