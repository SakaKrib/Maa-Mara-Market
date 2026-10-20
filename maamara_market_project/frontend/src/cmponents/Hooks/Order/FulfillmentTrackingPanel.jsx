import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, RefreshCw, Truck } from "lucide-react";
import api, { getWebSocketUrl } from "../../../Services/Api";

const LABELS = {
  PAID: "Payment confirmed", PROCESSING: "Processing", PACKING: "Packing",
  READY_TO_SHIP: "Ready for dispatch", DISPATCH_INSPECTED: "Dispatch inspection passed",
  SHIPPED: "Shipped", IN_TRANSIT: "In transit", OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered", AWAITING_CONFIRMATION: "Awaiting your confirmation",
  COMPLETED: "Completed", ISSUE_REPORTED: "Problem reported", CANCELLED: "Cancelled",
};
const formatDate = (value) => value ? new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";

export default function FulfillmentTrackingPanel({ orderId, onOrderStatusChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reasonByItem, setReasonByItem] = useState({});
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const { data: result } = await api.get(`/api/fulfillment/customer/${orderId}/`, { withCredentials: true });
      setData(result);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.detail || "Shipment tracking could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    load(true);
    let socket;
    let active = true;
    let retryTimer;
    let attempts = 0;
    const connect = () => {
      if (!active) return;
      try { socket = new WebSocket(getWebSocketUrl(`/ws/orders/${orderId}/`)); } catch { return; }
      socket.onopen = () => { attempts = 0; };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === "fulfillment_update" || payload?.type === "payment_status") load(true);
        } catch { /* Ignore malformed frames; REST remains authoritative. */ }
      };
      socket.onclose = () => {
        if (!active) return;
        retryTimer = window.setTimeout(connect, Math.min(1000 * (2 ** attempts++), 30000));
      };
    };
    connect();
    return () => {
      active = false;
      window.clearTimeout(retryTimer);
      if (socket) { socket.onclose = null; socket.close(); }
    };
  }, [orderId, load]);

  useEffect(() => {
    const hasAwaitingConfirmation = (data?.items || []).some((item) => item.status === "AWAITING_CONFIRMATION");
    if (!hasAwaitingConfirmation) {
      setShowConfirmationModal(false);
      setModalDismissed(false);
      return;
    }
    if (!modalDismissed) setShowConfirmationModal(true);
  }, [data, modalDismissed]);

  useEffect(() => {
    if (data?.order_status && onOrderStatusChange) onOrderStatusChange(data.order_status);
  }, [data, onOrderStatusChange]);

  const accept = async (item) => {
    try {
      await api.post(`/api/fulfillment/items/${item.order_item_id}/accept/`, {}, { withCredentials: true });
      await load(true);
    } catch (e) {
      setError(e?.response?.data?.detail || "Receipt could not be confirmed.");
    }
  };

  const reportIssue = async (item) => {
    const reason = String(reasonByItem[item.order_item_id] || "").trim();
    if (!reason) { setError("Please describe the issue before submitting."); return; }
    try {
      await api.post(`/api/fulfillment/items/${item.order_item_id}/report-issue/`, { reason }, { withCredentials: true });
      setReasonByItem((current) => ({ ...current, [item.order_item_id]: "" }));
      await load(true);
    } catch (e) {
      setError(e?.response?.data?.detail || "The issue could not be recorded.");
    }
  };

  if (loading) return <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading item-level shipment tracking…</div>;

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Live fulfilment record</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Shipment journey</h2>
          <p className="mt-1 text-sm text-slate-600">This page keeps each item's status and customer-confirmation action available, even after you close the reminder.</p>
        </div>
        <button type="button" onClick={() => load()} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</button>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data?.items?.length ? data.items.map((item) => {
        const awaiting = item.status === "AWAITING_CONFIRMATION";
        const issue = item.status === "ISSUE_REPORTED";
        return (
          <article key={item.fulfillment_id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item #{item.order_item_id}</p>
                <h3 className="mt-1 font-bold text-slate-900">{item.item_name}</h3>
                <p className="mt-1 text-sm text-slate-600">Quantity: {item.quantity}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "COMPLETED" ? "bg-green-50 text-green-700" : awaiting ? "bg-amber-50 text-amber-800" : issue ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-800"}`}>{LABELS[item.status] || item.status}</span>
            </div>

            <div className="mt-4 space-y-3">
              {(item.shipments || []).length ? item.shipments.map((shipment) => (
                <div key={shipment.id} className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <div className="flex items-center gap-2 font-semibold text-slate-800"><Truck className="h-4 w-4" /> {shipment.carrier} · {String(shipment.status).replaceAll("_", " ")}</div>
                  <p className="mt-1 break-all text-sm text-slate-700">Tracking number: {shipment.tracking_number}</p>
                  {shipment.tracking_url && <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-blue-700 underline">Track with {shipment.carrier}</a>}
                  {shipment.latest_event_description && <p className="mt-2 text-sm text-slate-700">{shipment.latest_event_description}</p>}
                  <p className="mt-1 text-xs text-slate-500">Last provider sync: {formatDate(shipment.last_synced_at)}</p>
                  <div className="mt-3 space-y-2">
                    {(shipment.events || []).slice().reverse().map((event, index) => <p key={index} className="border-l-2 border-blue-200 pl-3 text-xs text-slate-600">{formatDate(event.occurred_at || event.received_at)} · {event.description}</p>)}
                  </div>
                </div>
              )) : (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">The item is being prepared or is waiting for dispatch. A carrier tracking number will appear here after dispatch records the shipment.</div>
              )}
            </div>

            {awaiting && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-bold text-amber-900">Please confirm this item</p><p className="mt-1 text-sm text-amber-900">Confirm only if the correct item arrived in good condition. If you report a problem, this item is held for review. Response deadline: {formatDate(item.confirmation_deadline)}.</p></div></div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => accept(item)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"><CheckCircle2 className="h-4 w-4" /> Confirm item received</button>
                </div>
                <label className="mt-4 block text-sm font-semibold text-slate-800">Report an issue
                  <textarea value={reasonByItem[item.order_item_id] || ""} onChange={(event) => setReasonByItem((current) => ({ ...current, [item.order_item_id]: event.target.value }))} rows={2} maxLength={2000} className="mt-1 w-full rounded-xl border border-amber-300 bg-white p-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" placeholder="Wrong item, damage, missing parts, or another problem…" />
                </label>
                <button type="button" onClick={() => reportIssue(item)} className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100"><AlertTriangle className="h-4 w-4" /> Report problem and hold item</button>
              </div>
            )}
            {issue && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p className="font-bold">This item is on hold for review.</p><p className="mt-1">{item.hold_reason || "Maamara Market staff will review the reported issue."}</p></div>}
            {item.status === "COMPLETED" && <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" /> Item completed on {formatDate(item.completed_at)}.</p>}

            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status history</p>
              {(item.events || []).slice().reverse().map((event, index) => (
                <p key={index} className="mt-2 flex gap-2 text-xs text-slate-600"><PackageCheck className="h-3.5 w-3.5 shrink-0 text-blue-700" /><span>{formatDate(event.created_at)} · {event.note || event.event_type.replaceAll("_", " ")}</span></p>
              ))}
            </div>
          </article>
        );
      }) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No shipment tracking records are available for this order yet.</p>}

      {showConfirmationModal && !modalDismissed && (data?.items || []).some((item) => item.status === "AWAITING_CONFIRMATION") && (
        <div role="dialog" aria-modal="true" aria-labelledby="acceptance-dialog-title" className="fixed inset-0 z-[16000] flex items-end justify-center bg-slate-950/55 p-3 sm:items-center">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-800"><PackageCheck className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1"><h3 id="acceptance-dialog-title" className="text-xl font-bold text-slate-900">Has your order arrived correctly?</h3><p className="mt-2 text-sm text-slate-600">Confirm each item only if it is the item you ordered and is in good condition. You have up to three days after recorded delivery to confirm or report a problem.</p></div>
              <button type="button" onClick={() => { setShowConfirmationModal(false); setModalDismissed(true); }} className="rounded-lg px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="mt-4 space-y-2">{(data?.items || []).filter((item) => item.status === "AWAITING_CONFIRMATION").map((item) => <div key={item.fulfillment_id} className="rounded-xl border border-slate-200 p-3"><p className="font-semibold text-slate-800">{item.item_name}</p><p className="mt-1 text-xs text-slate-500">Deadline: {formatDate(item.confirmation_deadline)}</p><button type="button" onClick={() => accept(item)} className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">Confirm this item</button></div>)}</div>
            <p className="mt-4 text-xs text-slate-500">Closing this reminder does not confirm the item. You can still confirm or report an issue from this order-tracking page.</p>
          </div>
        </div>
      )}
    </section>
  );
}
