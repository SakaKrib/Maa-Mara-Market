import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, PackageCheck, RefreshCw, Truck } from "lucide-react";
import api, { getWebSocketUrl } from "../../../Services/Api";

const STAGES = [
  "PAID", "PROCESSING", "PACKING", "READY_TO_SHIP", "DISPATCH_INSPECTED",
  "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "AWAITING_CONFIRMATION", "COMPLETED",
];
const LABELS = {
  PAID: "Payment confirmed",
  PROCESSING: "Processing",
  PACKING: "Packing",
  READY_TO_SHIP: "Ready for dispatch",
  DISPATCH_INSPECTED: "Dispatch inspection passed",
  SHIPPED: "Handed to carrier",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  AWAITING_CONFIRMATION: "Awaiting customer confirmation",
  COMPLETED: "Completed",
  ISSUE_REPORTED: "Customer reported an issue",
  CANCELLED: "Cancelled",
};
const ACTIONS = {
  PAID: { next: "PROCESSING", title: "Start processing", text: "Confirm that you have started preparing this paid order." },
  PROCESSING: { next: "PACKING", title: "Start packing", text: "Confirm that preparation is complete and the item is being packed." },
  PACKING: { next: "READY_TO_SHIP", title: "Ready for dispatch", text: "Confirm that the item is packed and ready for Maamara Market dispatch inspection." },
};
const normalize = (value) => String(value || "").trim().toUpperCase();
const formatDate = (value) => value ? new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";

export default function VendorFulfillmentWorkflow() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeAction, setActiveAction] = useState(null);
  const [note, setNote] = useState("");
  const initialLoadRef = useRef(true);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const { data } = await api.get("/api/fulfillment/vendor/", { withCredentials: true });
      setRecords(Array.isArray(data?.results) ? data.results : []);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not load the fulfilment status page.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadRef.current = false;
    }
  }, []);

  useEffect(() => {
    load(true);
    let socket;
    let active = true;
    let reconnectTimer;
    let attempts = 0;
    const connect = () => {
      if (!active) return;
      try { socket = new WebSocket(getWebSocketUrl("/ws/vendor-orders/")); } catch { return; }
      socket.onopen = () => { attempts = 0; };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "orders_update") load(true);
        } catch { /* REST is still the source of truth. */ }
      };
      socket.onclose = () => {
        if (!active) return;
        reconnectTimer = window.setTimeout(connect, Math.min(1000 * (2 ** attempts++), 30000));
      };
    };
    connect();
    return () => {
      active = false;
      window.clearTimeout(reconnectTimer);
      if (socket) { socket.onclose = null; socket.close(); }
    };
  }, [load]);

  const confirmStep = async () => {
    if (!activeAction) return;
    try {
      const { data } = await api.post(
        `/api/fulfillment/items/${activeAction.order_item_id}/advance/`,
        { note },
        { withCredentials: true }
      );
      const nextAction = ACTIONS[normalize(data?.status)];
      await load(true);
      setNote("");
      if (nextAction) setActiveAction({ ...data, ...nextAction });
      else setActiveAction(null);
    } catch (e) {
      setError(e?.response?.data?.detail || "The status could not be updated. Refresh and review the latest state.");
    }
  };

  const openNextStep = (record) => {
    const action = ACTIONS[normalize(record.status)];
    if (action) { setActiveAction({ ...record, ...action }); setNote(""); }
  };

  if (loading) return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading order fulfilment tracking…</section>;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Persistent workflow</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Order preparation & tracking</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">Advance each order item one stage at a time. Your progress is saved on the server, so closing this page will not remove the next step.</p>
        </div>
        <button type="button" onClick={() => load()} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <PackageCheck className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 font-semibold text-slate-800">No paid items need tracking yet</p>
          <p className="mt-1 text-sm text-slate-500">Paid customer orders will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {records.map((record) => {
            const status = normalize(record.status);
            const action = ACTIONS[status];
            const progress = STAGES.indexOf(status);
            return (
              <article key={record.fulfillment_id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order #{record.order_id} · Item #{record.order_item_id}</p>
                    <h3 className="mt-1 font-bold text-slate-900">{record.item_name}</h3>
                    <p className="mt-1 text-sm text-slate-600">Quantity: {record.quantity} · Customer: {record.customer_name || "Customer"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "COMPLETED" ? "bg-green-50 text-green-700" : status === "ISSUE_REPORTED" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                    {LABELS[status] || status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {["PAID", "PROCESSING", "PACKING", "READY_TO_SHIP"].map((stage, index) => {
                    const reached = progress >= index;
                    return <div key={stage} className={`rounded-lg border px-2 py-2 text-center text-[11px] font-semibold ${reached ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-100 bg-slate-50 text-slate-400"}`}>{LABELS[stage]}</div>;
                  })}
                </div>

                {record.hold_reason && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Hold: {record.hold_reason}</p>}

                {record.shipments?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {record.shipments.map((shipment) => (
                      <div key={shipment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Truck className="h-4 w-4" /> {shipment.carrier} · {shipment.status.replaceAll("_", " ")}</div>
                        <p className="mt-1 break-all text-xs text-slate-600">Tracking number: {shipment.tracking_number}</p>
                        {shipment.tracking_url && <a className="mt-2 inline-block text-sm font-semibold text-blue-700 underline" href={shipment.tracking_url} target="_blank" rel="noreferrer">Open carrier tracking</a>}
                        {shipment.latest_event_description && <p className="mt-1 text-xs text-slate-600">{shipment.latest_event_description}</p>}
                        {shipment.events?.slice(-3).reverse().map((event, index) => <p key={index} className="mt-1 text-xs text-slate-500">{formatDate(event.occurred_at || event.received_at)} · {event.description}</p>)}
                      </div>
                    ))}
                  </div>
                )}

                {action && (
                  <button type="button" onClick={() => openNextStep(record)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800">
                    <CheckCircle2 className="h-4 w-4" /> {action.title}
                  </button>
                )}
                {status === "READY_TO_SHIP" && <p className="mt-3 text-sm text-slate-600">Next: Maamara dispatch staff must inspect the item before a shipment can be recorded.</p>}
                {status === "DISPATCH_INSPECTED" && <p className="mt-3 text-sm text-green-700">Dispatch inspection passed. Waiting for the carrier shipment and handover.</p>}
                {["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "AWAITING_CONFIRMATION"].includes(status) && <p className="mt-3 text-sm text-slate-600">Carrier tracking is shared with the customer and dispatch team. Shipment updates are recorded in the timeline.</p>}
                {status === "COMPLETED" && <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" /> This item is completed.</p>}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Latest activity</p>
                  {(record.events || []).slice(-3).reverse().map((event, index) => <p key={index} className="mt-1 text-xs text-slate-500">{formatDate(event.created_at)} · {event.note || event.event_type.replaceAll("_", " ")}</p>)}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {activeAction && (
        <div role="dialog" aria-modal="true" aria-labelledby="vendor-fulfillment-title" className="fixed inset-0 z-[15000] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Order #{activeAction.order_id}</p>
                <h3 id="vendor-fulfillment-title" className="mt-1 text-xl font-bold text-slate-900">{activeAction.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{activeAction.text}</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{activeAction.item_name}</p>
              </div>
              <button type="button" onClick={() => setActiveAction(null)} className="rounded-lg px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">Note (optional)
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={1000} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" placeholder="Add a short preparation note…" />
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setActiveAction(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Save for later</button>
              <button type="button" onClick={confirmStep} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Confirm and show next step</button>
            </div>
            <p className="mt-3 text-xs text-slate-500">The server records every change with its timestamp. You can close this window and resume from the Orders tracking page later.</p>
          </div>
        </div>
      )}
    </section>
  );
}
