import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { getWebSocketUrl } from "../../../Services/Api";

const AdminPriceRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchRequest = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/api/admin/vendorDashboard/vendoritemrequest/price-change/request/${id}/`, { withCredentials: true });
      setRequest(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching price change request:", err);
      if (!silent) {
        setRequest(null);
        setError(err?.response?.data?.detail || "Unable to load this price change request.");
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
            update.resource === "price" &&
            String(update.object_id) === String(id)
          ) fetchRequest(true);
        } catch (err) {
          console.error("Invalid price request WebSocket message:", err);
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

  const handleApprove = async () => {
    setApproving(true);
    setMessage("");
    setError("");
    try {
      await api.post(`/api/item-price-change/approve/${id}/price-change/`, {}, { withCredentials: true });
      setMessage("Price change request approved successfully.");
      await fetchRequest(true);
    } catch (err) {
      console.error("Error approving price change request:", err);
      setError(err?.response?.data?.error || "Failed to approve the price change request.");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center bg-background"><div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (!request) {
    return (
      <div className="min-h-[320px] bg-background p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{error || "Request not found."}</p>
          <button type="button" onClick={() => navigate(-1)} className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Go Back</button>
        </div>
      </div>
    );
  }

  const approved = Boolean(request.approved);
  const oldPrice = request.old_price ?? request.item_price;

  return (
    <div className="min-h-full bg-background p-2 text-foreground sm:p-4 lg:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vendor Price Update</p>
            <h1 className="mt-1 text-xl font-bold text-card-foreground sm:text-2xl">Price Change Request Detail</h1>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground hover:bg-muted">Back</button>
        </div>

        {(message || error) && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${message ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300" : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"}`}>{message || error}</div>
        )}

        <div className="rounded-2xl border border-border bg-card p-5 shadow-custom sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item</p>
              <h2 className="mt-1 break-words text-lg font-bold text-card-foreground sm:text-xl">{request.item_name || "Unnamed item"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Requested by: {request.requested_by_username || "—"}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${approved ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"}`}>{approved ? "Approved" : "Pending"}</span>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Price</p>
              <p className="mt-1 text-lg font-bold text-card-foreground">KES {oldPrice ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requested Price</p>
              <p className="mt-1 text-lg font-bold text-primary">KES {request.new_price ?? "—"}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-card-foreground">{request.reason || "No reason provided."}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {!approved && (
              <button type="button" onClick={handleApprove} disabled={approving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{approving ? "Approving..." : "Approve Price Change"}</button>
            )}
            <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-card-foreground hover:bg-muted">Return to Requests</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPriceRequestDetail;
