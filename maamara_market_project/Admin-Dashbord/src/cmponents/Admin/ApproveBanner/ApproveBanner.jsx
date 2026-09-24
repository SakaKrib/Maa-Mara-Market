import { useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import { megaphoneOutline, refreshOutline } from "ionicons/icons";
import api from "../../../Services/Api";

const POLL_INTERVAL = 10000;

export default function AdminBannerApprovalPage({ onCountChange }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const showSnackbar = (message) => {
    setSnackbar({ open: true, message });
    window.setTimeout(() => setSnackbar((prev) => ({ ...prev, open: false })), 3000);
  };

  const fetchBanners = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/api/moderation/banners/");
      const list = res.data?.results || res.data || [];
      setBanners(list);
      onCountChange?.(list.length);
    } catch (err) {
      console.error("Failed to fetch banners:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners(false);
    const interval = setInterval(() => fetchBanners(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      await api.post(`/api/moderation/banners/${id}/${action}/`);
      showSnackbar(`Banner ${action === "approve" ? "approved" : "rejected"} successfully.`);
      setBanners((prev) => {
        const updated = prev.filter((b) => b.id !== id);
        onCountChange?.(updated.length);
        return updated;
      });
    } catch (err) {
      console.error(`${action} banner failed:`, err);
      showSnackbar(err?.response?.data?.detail || `Unable to ${action} banner.`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      {snackbar.open && (
        <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
          {snackbar.message}
          <button
            type="button"
            onClick={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            className="ml-3 text-xs text-muted-foreground hover:text-card-foreground"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <div className="min-h-[calc(100vh-72px)] w-full bg-background text-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                <IonIcon icon={megaphoneOutline} className="text-xl" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Marketing &amp; promotions</p>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Banner Approvals</h1>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Review vendor banners before they appear on the marketplace.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchBanners(false)}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-card-foreground shadow-sm hover:bg-muted disabled:opacity-60"
            >
              <IonIcon icon={refreshOutline} />
              Refresh
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-4 sm:px-6">
              <h2 className="text-base font-semibold sm:text-lg">Pending banners</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {banners.length} {banners.length === 1 ? "banner" : "banners"} awaiting review.
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading banners…</div>
            ) : banners.length === 0 ? (
              <div className="p-6 text-center sm:p-8">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <IonIcon icon={megaphoneOutline} className="text-xl text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium sm:text-base">No pending banners</h3>
                <p className="mt-1 text-sm text-muted-foreground">New vendor submissions will appear here for review.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {banners.map((banner) => (
                  <article key={banner.id} className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold">{banner.title}</h3>
                        {banner.subtitle && <p className="mt-1 text-sm text-muted-foreground">{banner.subtitle}</p>}
                        {banner.image && (
                          <img src={banner.image} alt={banner.title || "Banner"} className="mt-4 aspect-[16/6] w-full rounded-xl border border-border object-cover" />
                        )}
                        <p className="mt-3 text-sm text-muted-foreground">Vendor: {banner.vendor_name || "Unknown"}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => handleAction(banner.id, "approve")} disabled={processingId === banner.id} className="min-h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">Approve</button>
                        <button type="button" onClick={() => handleAction(banner.id, "reject")} disabled={processingId === banner.id} className="min-h-10 rounded-xl border border-border bg-card px-4 text-sm font-medium text-card-foreground hover:bg-muted disabled:opacity-60">Reject</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
