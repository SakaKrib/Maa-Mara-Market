import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../Services/Api";

const kes = (value) => `KES ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const monthLabel = (key) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};

const currentKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (key) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/admin/monthly-accounting/", { params: { month: key } });
      setData(response.data);
      setNote(response.data?.signoff?.note || "");
    } catch (err) {
      setData(null);
      setError(err?.response?.data?.detail || "Could not load this month's accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (month) load(month); }, [month, load]);

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
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Month</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {months.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}
          </select>
        </label>
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
      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

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
          <p className="mt-2 text-xs text-muted-foreground">
            Profit = revenue − shipping − vendor share. Vendor amounts are the vendors' own prices; paid-out amounts come from payouts marked paid.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="py-2 pr-3">Vendor</th><th className="pr-3">Items</th><th className="pr-3">Owed</th><th className="pr-3">Paid</th><th>Outstanding</th></tr>
              </thead>
              <tbody>
                {data.vendors.length === 0 && <tr><td colSpan={5} className="py-3 text-muted-foreground">No paid sales this month.</td></tr>}
                {data.vendors.map((v) => (
                  <tr key={v.vendor_id} className="border-t border-border">
                    <td className="py-2 pr-3 font-medium">{v.vendor}</td>
                    <td className="pr-3">{v.items}</td>
                    <td className="pr-3">{kes(v.owed)}</td>
                    <td className="pr-3">{kes(v.settled)}</td>
                    <td className={v.outstanding > 0 ? "font-semibold text-amber-600" : ""}>{kes(v.outstanding)}</td>
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
