import React, { useMemo, useState } from "react";

const money = (value) =>
  `KSh ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STAGES = [
  ["paid_out", "Paid out", "bg-green-50 text-green-700 border-green-200"],
  ["processing", "Payout processing", "bg-blue-50 text-blue-700 border-blue-200"],
  ["ready", "Ready for payout", "bg-amber-50 text-amber-700 border-amber-200"],
  ["awaiting", "Awaiting delivery confirmation", "bg-slate-50 text-slate-700 border-slate-200"],
];

const badgeClass = Object.fromEntries(STAGES.map(([key, , cls]) => [key, cls]));
const badgeLabel = Object.fromEntries(STAGES.map(([key, label]) => [key, label]));

// Shows where the vendor's sales stand and lists the items behind them.
const SalesBreakdown = ({ overview, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [month, setMonth] = useState("all");
  const totals = overview?.totals || {};
  const months = overview?.months || [];
  const items = overview?.items || [];

  const visible = useMemo(
    () => (month === "all" ? items : items.filter((item) => item.month === month)),
    [items, month]
  );

  const openMonth = (key) => {
    setMonth(key);
    setOpen(true);
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
                    {[["paid_out", "bg-green-500"], ["processing", "bg-blue-500"], ["ready", "bg-amber-400"], ["awaiting", "bg-slate-300"]].map(([key, cls]) => (
                      <span key={key} className={cls} style={{ width: `${total ? (Number(m[key]) / total) * 100 : 0}%` }} />
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
        onClick={() => setOpen(true)}
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
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#e6e6e4] p-4">
              <div>
                <h3 className="text-base font-bold text-[#222]">Items sold</h3>
                <p className="mt-0.5 text-xs text-[#595959]">
                  Every paid sale, with where it stands on the way to your payout.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[#d9d9d6] px-3 py-1 text-xs font-semibold">
                Close
              </button>
            </div>
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
            <div className="overflow-y-auto p-3">
              {visible.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#595959]">No sales in this period.</p>
              ) : (
                <ul className="divide-y divide-[#e6e6e4]">
                  {visible.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#222]">{item.item_name}</p>
                        <p className="mt-0.5 text-xs text-[#595959]">
                          Order #{item.order_id} · Qty {item.quantity} ·{" "}
                          {new Date(item.ordered_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        <span className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass[item.stage]}`}>
                          {badgeLabel[item.stage]}
                        </span>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-[#222]">{money(item.amount)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesBreakdown;
