import React, { useEffect, useMemo, useState } from "react";
import api from "../../Services/Api";

const money = (value) =>
  `KSh ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STAGES = [
  ["paid_out", "Paid out", "bg-green-50 text-green-700 border-green-200", "bg-green-500"],
  ["processing", "Payout processing", "bg-blue-50 text-blue-700 border-blue-200", "bg-blue-500"],
  ["ready", "Ready for payout", "bg-amber-50 text-amber-700 border-amber-200", "bg-amber-400"],
  ["awaiting", "Awaiting delivery confirmation", "bg-slate-50 text-slate-700 border-slate-200", "bg-slate-300"],
];
const badgeClass = Object.fromEntries(STAGES.map(([key, , cls]) => [key, cls]));
const badgeLabel = Object.fromEntries(STAGES.map(([key, label]) => [key, label]));

const dateText = (value, withTime = false) =>
  value
    ? new Date(value).toLocaleString("en-KE", {
        day: "2-digit", month: "short", year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "";

const Timeline = ({ events }) => (
  <ol className="relative ml-2 border-l-2 border-[#e6e6e4]">
    {events.map((event, index) => {
      const last = index === events.length - 1;
      const dot =
        event.kind === "paid_out" ? "bg-green-500"
          : event.kind === "payout" ? "bg-blue-500"
            : last ? "bg-[#2563eb]" : "bg-[#9ca3af]";
      return (
        <li key={`${event.at}-${index}`} className="mb-4 ml-4 last:mb-0">
          <span className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full border-2 border-white ${dot}`} />
          <p className="text-sm font-semibold text-[#222]">{event.title}</p>
          {event.detail && <p className="mt-0.5 text-xs text-[#595959]">{event.detail}</p>}
          <p className="mt-0.5 text-[11px] text-[#777]">
            {dateText(event.at, true)} · {event.actor}
          </p>
        </li>
      );
    })}
  </ol>
);

const SaleDetail = ({ saleId, onBack }) => {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError("");
    api
      .get(`/api/vendor/sales-overview/items/${saleId}/`, { withCredentials: true })
      .then((response) => active && setDetail(response.data))
      .catch((requestError) => active && setError(requestError?.response?.data?.detail || "We couldn't load this sale."));
    return () => {
      active = false;
    };
  }, [saleId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <button type="button" onClick={onBack} className="mb-3 self-start text-xs font-semibold text-[#2563eb] hover:underline">
        ← Back to all sales
      </button>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!detail && !error && <p className="py-10 text-center text-sm text-[#595959]">Loading sale…</p>}
      {detail && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-base font-bold text-[#222]">{detail.item_name}</h4>
              <p className="mt-0.5 text-xs text-[#595959]">
                Order #{detail.order_id} · Qty {detail.quantity} · {dateText(detail.ordered_date)}
              </p>
            </div>
            <p className="shrink-0 text-lg font-bold text-[#222]">{money(detail.amount)}</p>
          </div>

          <span className={`mt-2 inline-block self-start rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass[detail.stage]}`}>
            {badgeLabel[detail.stage]}
          </span>

          <div className={`mt-3 rounded-xl border p-3 text-sm ${detail.on_hold ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#dbeafe] bg-[#eff6ff] text-[#1e3a8a]"}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">What happens next</p>
            <p className="mt-1">{detail.next_step}</p>
            {detail.release_by && detail.stage === "awaiting" && (
              <p className="mt-1 text-xs opacity-80">
                If the customer doesn't respond, the order completes automatically by {dateText(detail.release_by)}.
              </p>
            )}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-[#e6e6e4] p-2.5">
              <dt className="text-[#777]">Your price per item</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#222]">{money(detail.unit_amount)}</dd>
            </div>
            <div className="rounded-lg border border-[#e6e6e4] p-2.5">
              <dt className="text-[#777]">Current step</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#222]">{detail.step}</dd>
            </div>
            {detail.shipment && (
              <div className="col-span-2 rounded-lg border border-[#e6e6e4] p-2.5">
                <dt className="text-[#777]">Shipment · {detail.shipment.carrier}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[#222]">
                  {detail.shipment.status} · {detail.shipment.tracking_number}
                  {detail.shipment.tracking_url && (
                    <>
                      {" "}
                      <a href={detail.shipment.tracking_url} target="_blank" rel="noreferrer" className="font-semibold text-[#2563eb] hover:underline">
                        Track
                      </a>
                    </>
                  )}
                </dd>
                {detail.shipment.estimated_delivery_at && !detail.shipment.delivered_at && (
                  <dd className="mt-0.5 text-[11px] text-[#595959]">Expected {dateText(detail.shipment.estimated_delivery_at)}</dd>
                )}
              </div>
            )}
            {detail.payout && (
              <div className="col-span-2 rounded-lg border border-[#e6e6e4] p-2.5">
                <dt className="text-[#777]">Payout {detail.payout.reference}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[#222]">
                  {money(detail.payout.amount)} · {detail.payout.paid ? `Paid ${dateText(detail.payout.paid_at)}` : "Not paid yet"}
                </dd>
              </div>
            )}
          </dl>

          <h5 className="mb-3 mt-5 text-xs font-bold uppercase tracking-wide text-[#595959]">Sale history</h5>
          <Timeline events={detail.timeline || []} />
        </>
      )}
    </div>
  );
};

// Shows where the vendor's sales stand and lists the items behind them.
const SalesBreakdown = ({ overview, defaultOpen = false, onRefresh, updatedAt }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [month, setMonth] = useState("all");
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const totals = overview?.totals || {};
  const months = overview?.months || [];
  const items = overview?.items || [];

  const inMonth = useMemo(
    () => (month === "all" ? items : items.filter((item) => item.month === month)),
    [items, month]
  );
  const counts = useMemo(() => {
    const result = { all: inMonth.length };
    STAGES.forEach(([key]) => {
      result[key] = inMonth.filter((item) => item.stage === key).length;
    });
    return result;
  }, [inMonth]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return inMonth.filter(
      (item) =>
        (stage === "all" || item.stage === stage) &&
        (!needle || item.item_name.toLowerCase().includes(needle) || String(item.order_id).includes(needle))
    );
  }, [inMonth, stage, query]);
  const visibleTotal = visible.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const openMonth = (key) => {
    setMonth(key);
    setStage("all");
    setSelected(null);
    setOpen(true);
  };
  const refresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };
  const activeMonths = months.filter((m) => Number(m.total) > 0).slice().reverse();

  return (
    <div className="mt-3 border-t border-[#e6e6e4] pt-3">
      {activeMonths.length > 0 && (
        <ul className="mb-3 space-y-2">
          {activeMonths.map((m) => {
            const total = Number(m.total) || 0;
            return (
              <li key={m.key}>
                <button
                  type="button"
                  onClick={() => openMonth(m.key)}
                  className="w-full rounded-xl border border-[#e6e6e4] bg-white p-2.5 text-left transition hover:border-[#93c5fd] hover:bg-[#f8fbff]"
                  aria-label={`View ${m.label} sales`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-[#222]">{m.label}</span>
                    <span className="text-sm font-bold text-[#222]">{money(total)}</span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#f1f1ef]">
                    {STAGES.map(([key, , , bar]) => (
                      <span key={key} className={bar} style={{ width: `${total ? (Number(m[key]) / total) * 100 : 0}%` }} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-4 text-[#595959]">
                    Paid out {money(m.paid_out)} · Processing {money(m.processing)} · Ready {money(m.ready)} · Awaiting confirmation {money(m.awaiting)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mb-2 text-[11px] leading-4 text-[#595959]">
        A sale counts here as soon as the customer has paid. Once you dispatch it, we hold the payment safely and release it to you when the customer confirms delivery (or the confirmation window ends).
      </p>
      <div className="grid grid-cols-2 gap-2">
        {STAGES.map(([key, label, cls]) => (
          <div key={key} className={`rounded-lg border px-2.5 py-1.5 ${cls}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
            <p className="text-sm font-bold">{money(totals[key])}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => openMonth("all")}
        className="mt-3 inline-flex w-full items-center justify-center rounded-[20px] border border-[#dbeafe] bg-[#eff6ff] px-3 py-2 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#dbeafe]"
      >
        View items sold in the last 6 months
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Items sold"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div className="flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#e6e6e4] p-4">
              <div>
                <h3 className="text-base font-bold text-[#222]">Items sold</h3>
                <p className="mt-0.5 text-xs text-[#595959]">
                  Every paid sale and where it stands on the way to your payout.
                  {updatedAt && ` Updated ${updatedAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}.`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {onRefresh && (
                  <button type="button" onClick={refresh} disabled={refreshing} className="rounded-full border border-[#d9d9d6] px-3 py-1 text-xs font-semibold disabled:opacity-60">
                    {refreshing ? "Refreshing…" : "Refresh"}
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[#d9d9d6] px-3 py-1 text-xs font-semibold">
                  Close
                </button>
              </div>
            </div>

            {selected ? (
              <SaleDetail saleId={selected} onBack={() => setSelected(null)} />
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 border-b border-[#e6e6e4] p-3">
                  {[{ key: "all", label: "All 6 months" }, ...months.map((m) => ({ key: m.key, label: m.label }))].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMonth(m.key)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${month === m.key ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-[#d9d9d6] bg-white text-[#444]"}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 border-b border-[#e6e6e4] p-3">
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by item name or order number"
                    aria-label="Search sales"
                    className="w-full rounded-lg border border-[#d9d9d6] px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[["all", "All"], ...STAGES.map(([key, label]) => [key, label])].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStage(key)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${stage === key ? "border-[#222] bg-[#222] text-white" : "border-[#d9d9d6] bg-white text-[#444]"}`}
                      >
                        {label} ({counts[key] ?? 0})
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#595959]">
                    {visible.length} sale{visible.length === 1 ? "" : "s"} · {money(visibleTotal)}
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {visible.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[#595959]">No sales match this view.</p>
                  ) : (
                    <ul className="divide-y divide-[#e6e6e4]">
                      {visible.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(item.id)}
                            className="flex w-full items-start justify-between gap-3 rounded-lg px-1 py-3 text-left transition hover:bg-[#f8f8f6]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#222]">{item.item_name}</p>
                              <p className="mt-0.5 text-xs text-[#595959]">
                                Order #{item.order_id} · Qty {item.quantity} · {dateText(item.ordered_date)}
                              </p>
                              <span className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass[item.stage]}`}>
                                {badgeLabel[item.stage]}
                              </span>
                              {item.step && item.stage === "awaiting" && (
                                <span className="ml-1.5 text-[11px] text-[#595959]">{item.step}</span>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-[#222]">{money(item.amount)}</p>
                              <p className="mt-1 text-[11px] font-semibold text-[#2563eb]">View history →</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesBreakdown;
