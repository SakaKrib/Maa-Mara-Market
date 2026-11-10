import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, CalendarDays } from "lucide-react";
import api, { getWebSocketUrl } from "../../Services/Api";

const kes = (value) => `KES ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const STATUS = {
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Partly paid", cls: "bg-amber-100 text-amber-800" },
  processing: { label: "Payment processing", cls: "bg-blue-100 text-blue-800" },
  unpaid: { label: "Unpaid", cls: "bg-red-100 text-red-800" },
  none: { label: "No payouts due", cls: "bg-slate-100 text-slate-600" },
};
const StatusBadge = ({ status }) => {
  const meta = STATUS[status] || STATUS.none;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>;
};

const monthLabel = (key) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
};

const currentKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return values.year + "-" + values.month;
};

/**
 * Month-by-month accounting: revenue, shop profit and what vendors are owed,
 * with per-vendor settlement and an admin sign-off for accountability.
 */
export default function MonthlyAccountingPanel({ monthlyRevenue = [] }) {
  const months = useMemo(() => {
    const keys = new Set(monthlyRevenue.map((row) => row.month_key).filter(Boolean));
    keys.add(currentKey());
    return [...keys].sort().reverse();
  }, [monthlyRevenue]);

  const [month, setMonth] = useState(months[0]);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (key, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/admin/monthly-accounting/", { params: { month: key } });
      setData(response.data);
      setUpdatedAt(new Date());
      if (!silent) setNote(response.data?.signoff?.note || "");
    } catch (err) {
      if (!silent) setData(null);
      const body = err?.response?.data;
      const detail = body?.detail || body?.error;
      const status = err?.response?.status;
      // A reply without a "detail" usually comes from a proxy or the framework, not our view.
      // Show the start of it so the cause is visible instead of just the status code.
      const snippet = typeof body === "string"
        ? body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)
        : "";
      const requestedUrl = (err?.config?.baseURL || "") + (err?.config?.url || "");
      console.error("Monthly accounting request failed", { month: key, status, url: err?.config?.url, body });
      setError(detail || (status
        ? "Could not load this month's accounts (HTTP " + status + (snippet ? ": " + snippet : "") + ") at " + requestedUrl + "."
        : "Could not reach the server for the monthly accounts. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (month) load(month); }, [month, load]);

  // Live: refresh quietly whenever a payout or order changes anywhere in the system.
  useEffect(() => {
    let socket;
    let active = true;
    let retry;
    let debounce;
    let attempts = 0;
    const connect = () => {
      if (!active) return;
      try { socket = new WebSocket(getWebSocketUrl("/ws/admin/fulfillment/")); } catch { return; }
      socket.onopen = () => { attempts = 0; };
      socket.onmessage = () => {
        window.clearTimeout(debounce);
        debounce = window.setTimeout(() => { if (month) load(month, { silent: true }); }, 600);
      };
      socket.onclose = () => {
        if (active) retry = window.setTimeout(connect, Math.min(1000 * (2 ** attempts++), 30000));
      };
    };
    connect();
    return () => {
      active = false;
      window.clearTimeout(retry);
      window.clearTimeout(debounce);
      if (socket) { socket.onclose = null; socket.close(); }
    };
  }, [month, load]);

  const confirm = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await api.post("/api/admin/monthly-accounting/confirm/", { month, note });
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not sign off this month.");
    } finally {
      setSaving(false);
    }
  };

  const signoff = data?.signoff;
  const isOpenMonth = month === currentKey();
  const Stat = ({ label, value, tone = "" }) => (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-bold ${tone}`}>{value}</p>
    </div>
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-label="Monthly accounting">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accountability</p>
          <h2 className="mt-1 text-lg font-bold text-card-foreground">Monthly accounting</h2>
        </div>
        <div className="relative z-20 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Month</span>
          <button type="button" aria-haspopup="menu" aria-expanded={monthMenuOpen}
            aria-label={"Choose accounting month, currently " + monthLabel(month)}
            onClick={() => setMonthMenuOpen((open) => !open)}
            className="inline-flex min-h-10 min-w-[190px] items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-semibold text-card-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30">
            <span className="inline-flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{monthLabel(month)}</span>
            </span>
            <ChevronDown className={"h-4 w-4 shrink-0 text-muted-foreground transition-transform " + (monthMenuOpen ? "rotate-180" : "")} />
          </button>
          {monthMenuOpen && (
            <div role="menu" aria-label="Choose accounting month" className="absolute right-0 top-full mt-2 max-h-64 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available accounting months</p>
              {months.map((key) => (
                <button key={key} type="button" role="menuitem" aria-current={key === month ? "true" : undefined}
                  onClick={() => { setMonth(key); setMonthMenuOpen(false); }}
                  className={"flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition " + (key === month ? "bg-primary/10 font-semibold text-primary" : "text-card-foreground hover:bg-muted")}>
                  <span>{monthLabel(key)}</span>
                  {key === month && <span className="text-xs font-bold">Selected</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {monthlyRevenue.filter((row) => row.month_key).slice(-6).map((row) => (
          <button key={row.month_key} type="button" onClick={() => setMonth(row.month_key)}
            className={`rounded-full border px-3 py-1 text-xs ${row.month_key === month ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>
            {row.month} {row.year}
          </button>
        ))}
      </div>

      {loading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-red-600" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => month && load(month)} className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold hover:bg-red-50">Try again</button>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label={`Revenue (${data.orders} paid orders)`} value={kes(data.revenue)} />
            <Stat label="Shipping collected" value={kes(data.shipping)} />
            <Stat label="Shop profit" value={kes(data.profit)} tone="text-emerald-600" />
            <Stat label="Owed to vendors" value={kes(data.vendor_share)} />
            <Stat label="Already paid to vendors" value={kes(data.settled)} />
            <Stat label="Still to pay vendors" value={kes(data.outstanding)} tone={data.outstanding > 0 ? "text-amber-600" : ""} />
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Vendor payments for {monthLabel(month)}:</span>
            <StatusBadge status={data.payout_status} />
            {updatedAt && <span className="text-xs text-muted-foreground">Live · updated {updatedAt.toLocaleTimeString()}</span>}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Profit = revenue − shipping − vendor share. Vendor amounts are the vendors' own prices; paid-out amounts come from payouts marked paid.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="py-2 pr-3">Vendor</th><th className="pr-3">Items</th><th className="pr-3">Owed</th><th className="pr-3">Paid</th><th className="pr-3">Outstanding</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.vendors.length === 0 && <tr><td colSpan={6} className="py-3 text-muted-foreground">No paid sales this month.</td></tr>}
                {data.vendors.map((v) => (
                  <tr key={v.vendor_id} className="border-t border-border">
                    <td className="py-2 pr-3 font-medium">{v.vendor}</td>
                    <td className="pr-3">{v.items}</td>
                    <td className="pr-3">{kes(v.owed)}</td>
                    <td className="pr-3">{kes(v.settled)}</td>
                    <td className={`pr-3 ${v.outstanding > 0 ? "font-semibold text-amber-600" : ""}`}>{kes(v.outstanding)}</td>
                    <td><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background p-3 text-sm">
            {signoff ? (
              <p className={signoff.stale ? "text-amber-700" : "text-emerald-700"}>
                {signoff.stale ? "⚠ Signed off, but figures changed since" : "✓ Confirmed"} by {signoff.confirmed_by || "an admin"} on{" "}
                {new Date(signoff.confirmed_at).toLocaleString()}.
                {signoff.stale && ` At sign-off: revenue ${kes(signoff.snapshot.revenue)}, profit ${kes(signoff.snapshot.profit)}, vendors ${kes(signoff.snapshot.vendor_share)}. Review and sign off again.`}
              </p>
            ) : (
              <p className="text-muted-foreground">
                {isOpenMonth ? "This month is still open. You can sign it off once it has ended." : "Not signed off yet."}
              </p>
            )}
            {!isOpenMonth && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Optional note (e.g. checked against M-Pesa statement)"
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2" />
                <button type="button" onClick={confirm} disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60">
                  {saving ? "Saving…" : signoff ? "Re-confirm this month" : "Confirm this month"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
