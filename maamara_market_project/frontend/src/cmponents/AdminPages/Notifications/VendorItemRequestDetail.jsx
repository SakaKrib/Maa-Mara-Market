import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { getWebSocketUrl, resolveApiAssetUrl } from "../../../Services/Api";

const VendorItemRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchRequest = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/api/admin/vendorDashboard/vendoritemrequest/${id}/`, {
        withCredentials: true,
      });
      setRequest(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching vendor item request:", err);
      if (!silent) {
        setRequest(null);
        setError(err?.response?.data?.detail || "Unable to load this request.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRequest(false); }, [fetchRequest]);

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
          if (
            update?.type === "vendor_request.changed" &&
            update.resource === "item" &&
            String(update.object_id) === String(id)
          ) fetchRequest(true);
        } catch (err) {
          console.error("Invalid vendor request WebSocket message:", err);
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
      if (socket) socket.close();
    };
  }, [fetchRequest, id]);

  const handleAction = async (action) => {
    // Approval must always go through AddingNewItem so the admin reviews and
    // approves the complete vendor submission, including persisted media.
    if (action === "approve") {
      navigate(`/admin-dashboard/vendor/create-item/${id}`, { state: request });
      return;
    }

    setActionLoading(action);
    setMessage("");
    setError("");
    try {
      await api.post(`/api/vendor/requests/${id}/approve/`, { action }, { withCredentials: true });
      setMessage(`Request ${action}d successfully.`);
      await fetchRequest(true);
    } catch (err) {
      console.error(`Error ${action} request:`, err);
      setError(err?.response?.data?.error || `Failed to ${action} this request.`);
    } finally {
      setActionLoading("");
    }
  };

  const status = request?.status || "pending";
  const statusClass =
    status === "approved"
      ? "bg-green-500/10 text-green-600 dark:text-green-400"
      : status === "denied"
        ? "bg-red-500/10 text-red-600 dark:text-red-400"
        : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center bg-background p-4"><div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (!request) {
    return (
      <div className="min-h-[320px] bg-background p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{error || "Request not found."}</p>
          <button type="button" onClick={() => navigate(-1)} className="mt-5 rounded-[20px] bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background p-2 text-foreground sm:p-4 lg:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vendor Request</p>
            <h1 className="mt-1 text-xl font-bold text-card-foreground sm:text-2xl">{request.name}</h1>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground hover:bg-muted">Back</button>
        </div>

        {(message || error) && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${message ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300" : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"}`}>{message || error}</div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-custom">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 p-5 sm:p-7">
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClass}`}>{status}</span>
                {request.created_at && <span className="text-xs text-muted-foreground">{new Date(request.created_at).toLocaleString()}</span>}
              </div>

              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendor</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-card-foreground">{request.vendor?.company_name || "—"}</dd>
                  {request.vendor?.id && <dd className="mt-1 text-xs text-muted-foreground">ID: {request.vendor.id}</dd>}
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requested Price</dt>
                  <dd className="mt-1 text-sm font-semibold text-card-foreground">KES {request.price ?? "—"}</dd>
                </div>
              </dl>

              <div className="mt-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h2>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-card-foreground">{request.description || "No description provided."}</p>
              </div>

              {request.image && (
                <div className="mt-6">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requested Image</h2>
                  <img src={resolveApiAssetUrl(request.image)} alt={request.name} className="mt-3 max-h-72 w-full max-w-md rounded-2xl border border-border object-contain bg-muted p-2" />
                </div>
              )}
            </div>

            <aside className="border-t border-border bg-muted/40 p-5 lg:border-l lg:border-t-0">
              <h2 className="text-sm font-bold text-card-foreground">Request Actions</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Use the same approval workflow as the request list.</p>
              <div className="mt-5 grid gap-2">
                <button type="button" disabled={status === "approved" || actionLoading !== ""} onClick={() => handleAction("approve")} className="rounded-[20px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{status === "approved" ? "Approved" : "Review & Approve"}</button>
                <button type="button" disabled={status === "denied" || actionLoading !== ""} onClick={() => handleAction("deny")} className="rounded-[20px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{actionLoading === "deny" ? "Denying..." : status === "denied" ? "Denied" : "Deny"}</button>
                <button type="button" onClick={() => navigate(`/admin-dashboard/vendor/create-item/${id}`, { state: request })} className="rounded-[20px] border border-border bg-transparent px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">Create Item</button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorItemRequestDetail;
