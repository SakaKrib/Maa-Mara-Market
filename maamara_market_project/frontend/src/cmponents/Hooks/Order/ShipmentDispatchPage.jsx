import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Truck } from "lucide-react";
import api from "../../../Services/Api";

const formatDate = (value) => value ? new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";
const LABELS = {
  PAID: "Paid", PROCESSING: "Processing", PACKING: "Packing",
  READY_TO_SHIP: "Ready for dispatch inspection", DISPATCH_INSPECTED: "Inspection passed",
  SHIPPED: "Shipped", IN_TRANSIT: "In transit", OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered", AWAITING_CONFIRMATION: "Awaiting customer confirmation",
  COMPLETED: "Completed", ISSUE_REPORTED: "Customer reported an issue",
};
const CARRIER_EVENTS = ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "EXCEPTION", "RETURNED"];

export default function ShipmentDispatchPage() {
  const [records, setRecords] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState({});
  const [shipmentForms, setShipmentForms] = useState({});
  const [eventForms, setEventForms] = useState({});
  const [issueResolution, setIssueResolution] = useState({});

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await api.get("/api/fulfillment/admin/", { withCredentials: true });
      setRecords(Array.isArray(data?.results) ? data.results : []);
      setShipments(Array.isArray(data?.shipments) ? data.shipments : []);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.detail || "Unable to load the dispatch queue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const inspect = async (record, passed) => {
    try {
      await api.post(`/api/fulfillment/items/${record.order_item_id}/dispatch-inspection/`, { passed, notes: notes[record.order_item_id] || "" }, { withCredentials: true });
      setNotice(passed ? `Item #${record.order_item_id} passed dispatch inspection.` : `Item #${record.order_item_id} was held for correction.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "The inspection could not be saved.");
    }
  };

  const updateShipmentForm = (id, field, value) => setShipmentForms((current) => ({ ...current, [id]: { ...(current[id] || {}), [field]: value } }));
  const createShipment = async (record) => {
    const form = shipmentForms[record.fulfillment_id] || {};
    try {
      await api.post("/api/fulfillment/shipments/", {
        order_id: record.order_id,
        fulfillment_ids: [record.fulfillment_id],
        carrier: form.carrier || "DHL",
        tracking_number: form.tracking_number || "",
        service: form.service || "",
      }, { withCredentials: true });
      setNotice(`Carrier tracking record created for order #${record.order_id}. Confirm handover only after the carrier has accepted the parcel.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "Shipment record could not be created.");
    }
  };

  const handover = async (shipment) => {
    try {
      await api.post(`/api/fulfillment/shipments/${shipment.id}/handover/`, {}, { withCredentials: true });
      setNotice(`Carrier handover recorded for shipment #${shipment.id}.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "Carrier handover could not be recorded.");
    }
  };

  const refreshCarrier = async (shipment) => {
    try {
      const { data } = await api.post(`/api/fulfillment/shipments/${shipment.id}/refresh/`, {}, { withCredentials: true });
      setNotice(`${shipment.carrier} tracking checked. ${data.events_applied || 0} new event(s) applied.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "Automatic tracking could not be refreshed. Use verified manual carrier events until credentials are configured.");
    }
  };

  const addManualEvent = async (shipment) => {
    const form = eventForms[shipment.id] || {};
    try {
      await api.post(`/api/fulfillment/shipments/${shipment.id}/events/`, {
        status: form.status || "IN_TRANSIT",
        description: form.description || "",
      }, { withCredentials: true });
      setNotice(`Verified tracking event recorded for shipment #${shipment.id}.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "The tracking event could not be recorded.");
    }
  };

  const resolveIssue = async (record) => {
    const form = issueResolution[record.order_item_id] || {};
    try {
      await api.post(`/api/fulfillment/items/${record.order_item_id}/resolve-issue/`, {
        resolution: form.resolution || "resume_confirmation",
        notes: form.notes || "",
      }, { withCredentials: true });
      setNotice(`Customer issue for item #${record.order_item_id} was updated.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "The issue could not be resolved.");
    }
  };

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading dispatch and shipment queue…</div>;

  const readyForInspection = records.filter((r) => r.status === "READY_TO_SHIP");
  const inspected = records.filter((r) => r.status === "DISPATCH_INSPECTED");
  const issues = records.filter((r) => r.status === "ISSUE_REPORTED");

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Dispatch control</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Inspection & shipment tracking</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Inspect items that vendors marked ready, record carrier tracking details, confirm physical handover, and reconcile DHL/FedEx tracking events.</p></div>
          <button type="button" onClick={load} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh queue</button>
        </div>
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
      </section>

      <section className="space-y-3">
        <div><h2 className="text-lg font-bold text-slate-900">Awaiting dispatch inspection</h2><p className="mt-1 text-sm text-slate-600">Only vendor-prepared items can be inspected. Passing inspection unlocks carrier shipment recording.</p></div>
        {readyForInspection.length ? readyForInspection.map((record) => (
          <article key={record.fulfillment_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap justify-between gap-2"><div><p className="text-xs uppercase tracking-wide text-slate-500">Order #{record.order_id} · Item #{record.order_item_id}</p><h3 className="mt-1 font-bold text-slate-900">{record.item_name}</h3><p className="mt-1 text-sm text-slate-600">Vendor/customer: {record.customer_name || "Customer"} · Quantity {record.quantity}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Ready for inspection</span></div>
            <label className="mt-3 block text-sm font-semibold text-slate-700">Inspection notes<textarea value={notes[record.order_item_id] || ""} onChange={(e) => setNotes((current) => ({ ...current, [record.order_item_id]: e.target.value }))} rows={2} maxLength={2000} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Correct item/variant, quantity, condition, packaging…" /></label>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => inspect(record, true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800"><CheckCircle2 className="h-4 w-4" /> Pass inspection</button><button type="button" onClick={() => inspect(record, false)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"><AlertTriangle className="h-4 w-4" /> Fail and hold item</button></div>
          </article>
        )) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No items are currently awaiting inspection.</p>}
      </section>

      <section className="space-y-3">
        <div><h2 className="text-lg font-bold text-slate-900">Passed inspection — record carrier shipment</h2><p className="mt-1 text-sm text-slate-600">Book the parcel through the carrier's approved channel, then enter the carrier-issued tracking number. This page records the shipment; it does not claim that a carrier label was created by API.</p></div>
        {inspected.length ? inspected.map((record) => (
          <article key={record.fulfillment_id} className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap justify-between gap-2"><div><p className="text-xs uppercase tracking-wide text-slate-500">Order #{record.order_id} · Item #{record.order_item_id}</p><h3 className="mt-1 font-bold text-slate-900">{record.item_name}</h3></div><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">Inspection passed</span></div>
            {record.shipments?.length ? <div className="mt-3 space-y-2">{record.shipments.map((shipment) => <div key={shipment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-800">{shipment.carrier} · {shipment.tracking_number}</p><p className="mt-1 text-sm text-slate-600">Status: {shipment.status} · {shipment.latest_event_description}</p>{shipment.tracking_url && <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-blue-700 underline">Open carrier tracking</a>}{shipment.status === "LABEL_CREATED" && <button type="button" onClick={() => handover(shipment)} className="mt-3 block rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">Confirm physical carrier handover</button>}</div>)}</div> : <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold text-slate-700">Carrier<select value={shipmentForms[record.fulfillment_id]?.carrier || "DHL"} onChange={(e) => updateShipmentForm(record.fulfillment_id, "carrier", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5"><option value="DHL">DHL</option><option value="FEDEX">FedEx</option><option value="OTHER">Other</option></select></label><label className="text-sm font-semibold text-slate-700">Tracking number<input value={shipmentForms[record.fulfillment_id]?.tracking_number || ""} onChange={(e) => updateShipmentForm(record.fulfillment_id, "tracking_number", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5" placeholder="Carrier-issued number" /></label><label className="text-sm font-semibold text-slate-700">Service (optional)<input value={shipmentForms[record.fulfillment_id]?.service || ""} onChange={(e) => updateShipmentForm(record.fulfillment_id, "service", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5" placeholder="Express / Economy" /></label><div className="sm:col-span-3"><button type="button" onClick={() => createShipment(record)} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Save shipment details</button></div></div>}
          </article>
        )) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No inspected items are waiting for carrier handover.</p>}
      </section>

      <section className="space-y-3">
        <div><h2 className="text-lg font-bold text-slate-900">Carrier tracking</h2><p className="mt-1 text-sm text-slate-600">Configured carrier APIs sync automatically every 30 minutes. Use manual updates only when verified from the carrier's own tracking system.</p></div>
        {shipments.length ? shipments.map((shipment) => (
          <article key={shipment.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Truck className="h-5 w-5 text-blue-700" /><div><p className="font-bold text-slate-900">{shipment.carrier} · Order #{shipment.order_id}</p><p className="text-sm text-slate-600">{shipment.tracking_number} · {shipment.status.replaceAll("_", " ")}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => refreshCarrier(shipment)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sync carrier</button>{shipment.tracking_url && <a className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700" href={shipment.tracking_url} target="_blank" rel="noreferrer">Carrier page</a>}</div></div>
            <p className="mt-2 text-sm text-slate-600">{shipment.latest_event_description || "No carrier event recorded yet."}</p>
            {shipment.status !== "DELIVERED" && shipment.status !== "RETURNED" && <div className="mt-3 grid gap-2 sm:grid-cols-[190px_1fr_auto]"><select value={eventForms[shipment.id]?.status || "IN_TRANSIT"} onChange={(e) => setEventForms((current) => ({ ...current, [shipment.id]: { ...(current[shipment.id] || {}), status: e.target.value } }))} className="rounded-lg border border-slate-300 p-2 text-sm">{CARRIER_EVENTS.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select><input value={eventForms[shipment.id]?.description || ""} onChange={(e) => setEventForms((current) => ({ ...current, [shipment.id]: { ...(current[shipment.id] || {}), description: e.target.value } }))} className="rounded-lg border border-slate-300 p-2 text-sm" placeholder="Verified carrier event description" /><button type="button" onClick={() => addManualEvent(shipment)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900">Record event</button></div>}
          </article>
        )) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No shipments have been recorded yet.</p>}
      </section>

      <section className="space-y-3">
        <div><h2 className="text-lg font-bold text-slate-900">Customer-reported issues</h2><p className="mt-1 text-sm text-slate-600">Items with reported problems remain held and cannot time out into automatic completion.</p></div>
        {issues.length ? issues.map((record) => (
          <article key={record.fulfillment_id} className="rounded-xl border border-red-200 bg-white p-4">
            <p className="font-bold text-slate-900">Order #{record.order_id} · {record.item_name}</p><p className="mt-1 text-sm text-red-800">{record.hold_reason || "Customer reported a problem."}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2"><select value={issueResolution[record.order_item_id]?.resolution || "resume_confirmation"} onChange={(e) => setIssueResolution((current) => ({ ...current, [record.order_item_id]: { ...(current[record.order_item_id] || {}), resolution: e.target.value } }))} className="rounded-lg border border-slate-300 p-2 text-sm"><option value="resume_confirmation">Resume customer confirmation</option><option value="complete_after_review">Complete after staff review</option></select><input value={issueResolution[record.order_item_id]?.notes || ""} onChange={(e) => setIssueResolution((current) => ({ ...current, [record.order_item_id]: { ...(current[record.order_item_id] || {}), notes: e.target.value } }))} className="rounded-lg border border-slate-300 p-2 text-sm" placeholder="Required resolution notes" /></div>
            <button type="button" onClick={() => resolveIssue(record)} className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">Save resolution</button>
          </article>
        )) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No unresolved customer-reported issues.</p>}
      </section>

      <p className="text-xs text-slate-500">Carrier synchronization requires active DHL/FedEx API credentials. Without those credentials, this page supports verified staff-entered tracking events; it never fabricates carrier progress.</p>
    </div>
  );
}
