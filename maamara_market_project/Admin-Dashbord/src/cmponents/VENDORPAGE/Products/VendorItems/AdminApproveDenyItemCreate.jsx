import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  cubeOutline,
  cashOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  createOutline,
  refreshOutline,
  timeOutline,
} from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import api, { getWebSocketUrl, resolveApiAssetUrl } from "../../../../Services/Api";

const statusClasses = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  denied: "bg-red-500/10 text-red-700 dark:text-red-300",
};

const VendorItemCreateRequests = ({ onCountChange }) => {
  const [itemRequests, setItemRequests] = useState([]);
  const [priceRequests, setPriceRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("items");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const navigate = useNavigate();

  const fetchRequests = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      setError("");
      const [itemsResponse, pricesResponse] = await Promise.all([
        api.get("/api/vendor/requests/", { withCredentials: true }),
        api.get("/api/price-change-requests/?status=pending", { withCredentials: true }),
      ]);

      const itemsData = Array.isArray(itemsResponse.data)
        ? itemsResponse.data
        : itemsResponse.data?.results || [];
      const pricesData = Array.isArray(pricesResponse.data)
        ? pricesResponse.data
        : pricesResponse.data?.results || [];

      setItemRequests(itemsData);
      setPriceRequests(pricesData);
      onCountChange?.(itemsData.filter((item) => item.status === "pending").length + pricesData.length);
    } catch (requestError) {
      console.error("Error fetching vendor requests:", requestError);
      setError(requestError?.response?.data?.detail || "Could not load vendor requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchRequests(false);
  }, [fetchRequests]);

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let attempts = 0;
    let closed = false;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(getWebSocketUrl("/ws/admin/vendor-requests/"));
      socket.onopen = () => { attempts = 0; };
      socket.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          if (update?.type === "vendor_request.changed") fetchRequests(true);
        } catch (socketError) {
          console.error("Invalid vendor request WebSocket message:", socketError);
        }
      };
      socket.onclose = (event) => {
        if (closed || event.code === 4403) return;
        const delay = Math.min(1000 * 2 ** attempts, 15000);
        attempts += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
      socket.onerror = () => socket.close();
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [fetchRequests]);

  const pendingItemRequests = useMemo(
    () => itemRequests.filter((request) => request.status === "pending"),
    [itemRequests]
  );

  const handleItemAction = async (id, action) => {
    // Approval is intentionally routed through AddingNewItem so the admin
    // reviews the complete product and its media before approval.
    if (action === "approve") {
      const request = itemRequests.find((entry) => String(entry.id) === String(id));
      if (request) {
        navigate(`/admin-dashboard/vendor/create-item/${id}`, { state: request });
      }
      return;
    }

    setActionLoading(`item-${id}-${action}`);
    setError("");
    setNotice("");
    try {
      await api.post(
        `/api/vendor/requests/${id}/approve/`,
        { action },
        { withCredentials: true }
      );
      setNotice("Item request denied.");
      await fetchRequests(true);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Failed to deny the item request.");
    } finally {
      setActionLoading("");
    }
  };

  const handlePriceApprove = async (id) => {
    setActionLoading(`price-${id}`);
    setError("");
    setNotice("");
    try {
      await api.post(
        `/api/item-price-change/approve/${id}/price-change/`,
        {},
        { withCredentials: true }
      );
      setNotice("Price change approved and the item price was updated.");
      await fetchRequests(true);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Failed to approve the price change.");
    } finally {
      setActionLoading("");
    }
  };

  const handleCreateItem = (request) => {
    navigate(`/admin-dashboard/vendor/create-item/${request.id}`, { state: request });
  };

  const pendingCount = pendingItemRequests.length + priceRequests.length;

  return (
    <div className="min-h-[calc(100vh-72px)] w-full bg-background text-foreground">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <IonIcon icon={cubeOutline} className="text-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Marketplace</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-card-foreground sm:text-3xl">Vendor item requests</h1>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
                Review vendor requests to create new items or change the price of existing items. Open a request for the full details before taking action.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchRequests(true)}
              disabled={loading || refreshing}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IonIcon icon={refreshOutline} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending total</p>
              <p className="mt-1 text-2xl font-bold text-card-foreground">{pendingCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New item requests</p>
              <p className="mt-1 text-2xl font-bold text-card-foreground">{pendingItemRequests.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price changes</p>
              <p className="mt-1 text-2xl font-bold text-card-foreground">{priceRequests.length}</p>
            </div>
          </div>
        </header>

        {(error || notice) && (
          <div
            role="alert"
            className={`rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {error || notice}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-custom">
          <div className="flex flex-wrap gap-2 border-b border-border p-3 sm:p-4">
            <button
              type="button"
              onClick={() => setActiveTab("items")}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "items"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-card-foreground"
              }`}
            >
              <IonIcon icon={cubeOutline} />
              Create item
              <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">{pendingItemRequests.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("prices")}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "prices"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-card-foreground"
              }`}
            >
              <IonIcon icon={cashOutline} />
              Price changes
              <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">{priceRequests.length}</span>
            </button>
          </div>

          {loading ? (
            <div className="grid min-h-[360px] place-items-center p-8">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : activeTab === "items" ? (
            <div className="p-4 sm:p-6">
              {pendingItemRequests.length === 0 ? (
                <EmptyState icon={cubeOutline} title="No pending item requests" text="New vendor requests to create marketplace items will appear here." />
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {pendingItemRequests.map((request) => (
                    <article key={request.id} className="overflow-hidden rounded-2xl border border-border bg-background">
                      <div className="flex gap-4 border-b border-border p-4 sm:p-5">
                        {request.image ? (
                          <img
                            src={resolveApiAssetUrl(request.image)}
                            alt={request.name}
                            className="h-20 w-20 shrink-0 rounded-xl border border-border bg-muted object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                            <IonIcon icon={cubeOutline} className="text-2xl" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h2 className="break-words text-base font-bold text-card-foreground">{request.name}</h2>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusClasses[request.status] || statusClasses.pending}`}>
                              {request.status || "pending"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {request.vendor?.company_name || "Vendor"} · KES {request.price ?? "—"}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {request.created_at ? new Date(request.created_at).toLocaleString() : "Date unavailable"}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5">
                        <p className="line-clamp-3 text-sm leading-6 text-card-foreground">
                          {request.description || "No description provided."}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin-dashboard/vendorDashboard/vendoritemrequest/${request.id}`)}
                            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground hover:bg-muted"
                          >
                            View details
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading !== ""}
                            onClick={() => handleCreateItem(request)}
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground hover:bg-muted disabled:opacity-50"
                          >
                            <IonIcon icon={createOutline} />
                            Create item
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading !== ""}
                            onClick={() => handleItemAction(request.id, "approve")}
                            className="inline-flex items-center gap-2 rounded-[20px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <IonIcon icon={checkmarkCircleOutline} />
                            {actionLoading === `item-${request.id}-approve` ? "Approving..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading !== ""}
                            onClick={() => handleItemAction(request.id, "deny")}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300 disabled:opacity-50"
                          >
                            <IonIcon icon={closeCircleOutline} />
                            {actionLoading === `item-${request.id}-deny` ? "Denying..." : "Deny"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              {priceRequests.length === 0 ? (
                <EmptyState icon={cashOutline} title="No pending price changes" text="Vendor requests to change an existing item's price will appear here." />
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {priceRequests.map((request) => (
                    <article key={request.id} className="rounded-2xl border border-border bg-background p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Price change</p>
                          <h2 className="mt-1 break-words text-lg font-bold text-card-foreground">{request.item_name || `Item #${request.item}`}</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Requested by {request.requested_by_username || "Vendor"}
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                          Pending
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-card p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current price</p>
                          <p className="mt-1 text-lg font-bold text-card-foreground">KES {request.item_price ?? "—"}</p>
                        </div>
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requested price</p>
                          <p className="mt-1 text-lg font-bold text-primary">KES {request.new_price ?? "—"}</p>
                        </div>
                      </div>

                      {request.reason && (
                        <div className="mt-4 rounded-xl border border-border bg-card p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-card-foreground">{request.reason}</p>
                        </div>
                      )}

                      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                        <IonIcon icon={timeOutline} />
                        {request.created_at ? new Date(request.created_at).toLocaleString() : "Date unavailable"}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin-dashboard/vendorDashboard/vendoritemPricerequest/${request.id}`)}
                          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground hover:bg-muted"
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading !== ""}
                          onClick={() => handlePriceApprove(request.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          <IonIcon icon={checkmarkCircleOutline} />
                          {actionLoading === `price-${request.id}` ? "Approving..." : "Approve price"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

    </div>
  );
};

const EmptyState = ({ icon, title, text }) => (
  <div className="grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-border bg-background p-8 text-center">
    <div className="max-w-md">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <IonIcon icon={icon} className="text-2xl" />
      </div>
      <h2 className="mt-4 text-base font-bold text-card-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  </div>
);

export default VendorItemCreateRequests;
