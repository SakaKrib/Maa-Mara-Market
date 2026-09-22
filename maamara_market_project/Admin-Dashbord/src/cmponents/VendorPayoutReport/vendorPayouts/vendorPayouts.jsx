import React, { useMemo } from "react";
import { useVendorPayoutHistory } from "../../../cmponents/Hooks/Payouts/Payouts";

const PayoutsPage = () => {
  const { payouts, loading, error } = useVendorPayoutHistory();

  const cleanNumber = (value) => {
    if (value == null) return 0;
    if (typeof value === "string") return parseFloat(value.replace(/,/g, "")) || 0;
    return typeof value === "number" ? value : 0;
  };

  const formatted = useMemo(() => payouts.map((p) => ({
    id: p.id || `${p.reference}-${p.payout_period_start}`,
    reference: p.reference || "N/A",
    gross_sales: cleanNumber(p.gross_sales),
    amount: cleanNumber(p.amount),
    adjustment_amount: cleanNumber(p.adjustment_amount),
    month: p.payout_period_start
      ? new Date(p.payout_period_start).toLocaleDateString("en-US", { year: "numeric", month: "long" })
      : "N/A",
    payment_method: p.vendor?.payment_method || "N/A",
    paid: Boolean(p.paid),
    vendor_name: p.vendor
      ? [p.vendor.surname_name, p.vendor.middle_name, p.vendor.first_name].filter(Boolean).join(" ") || "N/A"
      : "N/A",
    vendor_email: p.vendor?.email || "N/A",
    payout_period_start: p.payout_period_start,
    payout_period: p.payout_period_start && p.payout_period_end
      ? `${new Date(p.payout_period_start).toLocaleDateString("en-GB")} - ${new Date(p.payout_period_end).toLocaleDateString("en-GB")}`
      : "N/A",
  })), [payouts]);

  const sorted = useMemo(
    () => [...formatted].sort((a, b) => new Date(b.payout_period_start) - new Date(a.payout_period_start)),
    [formatted]
  );

  const now = new Date();
  const current = sorted.filter((p) => {
    const d = new Date(p.payout_period_start);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const currentMonth = current.length ? current : sorted.length ? [sorted[0]] : [];
  const currentIds = new Set(currentMonth.map((p) => p.id));
  const past = sorted.filter((p) => !currentIds.has(p.id));
  const currentTotal = currentMonth.reduce((sum, p) => sum + p.amount, 0);
  const pastTotal = past.reduce((sum, p) => sum + p.amount, 0);

  const formatKsh = (value) => `Ksh ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderPayout = (p) => (
    <div key={p.id} className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#595959]">{p.reference}</p>
          <h3 className="mt-1 break-words text-sm font-bold text-[#222] sm:text-base">{p.vendor_name}</h3>
          <p className="mt-1 break-all text-xs text-[#595959]">{p.vendor_email}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.paid ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"}`}>
          {p.paid ? "Paid" : "Pending"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wide text-[#595959]">Gross Sales</p><p className="mt-1 text-sm font-bold text-[#222]">{formatKsh(p.gross_sales)}</p></div>
        <div className="rounded-xl bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wide text-[#595959]">Net Payout</p><p className="mt-1 text-sm font-bold text-[#222]">{formatKsh(p.amount)}</p></div>
        <div className="rounded-xl bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wide text-[#595959]">Adjustments</p><p className="mt-1 text-sm font-bold text-[#222]">{formatKsh(p.adjustment_amount)}</p></div>
        <div className="rounded-xl bg-muted/50 p-3"><p className="text-[10px] uppercase tracking-wide text-[#595959]">Payment</p><p className="mt-1 text-sm font-bold text-[#222]">{p.payment_method}</p></div>
      </div>
      <div className="mt-4 grid gap-2 border-t border-[#e6e6e4] pt-3 text-xs text-[#595959] sm:grid-cols-2">
        <span>Month: <strong className="text-[#222]">{p.month}</strong></span>
        <span>Period: <strong className="text-[#222]">{p.payout_period}</strong></span>
      </div>
    </div>
  );

  if (loading) return <div className="min-h-full bg-[#f8f8f6] p-4 text-sm text-[#595959]">Loading payouts...</div>;
  if (error) return <div className="min-h-full bg-[#f8f8f6] p-4 text-sm text-red-600 dark:text-red-400">{error}</div>;
  if (!sorted.length) return (
    <div className="w-full space-y-6">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#595959]">Money</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">Payouts</h1>
        <p className="mt-1 text-sm text-[#595959]">Monthly vendor payout history and payment status.</p>
      </header>
      <section className="rounded-2xl border border-dashed border-[#d7d7d3] bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f8f8f6] text-sm font-bold text-[#595959]">KSh</div>
        <h2 className="mt-4 text-lg font-semibold text-[#222]">No payout history available</h2>
        <p className="mt-1 text-sm text-[#595959]">Payout records will appear here once payments have been generated.</p>
      </section>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div className="w-full">
        <div className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#595959]">Money</p>
          <h1 className="mt-1 text-xl font-bold text-[#222] sm:text-2xl">Payouts</h1>
          <p className="mt-2 text-sm text-[#595959]">Monthly vendor payout history and payment status.</p>
        </div>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div><h2 className="text-base font-bold text-[#222]">Current Month Payout</h2><p className="text-xs text-[#595959]">Latest/current payout period</p></div>
            <p className="text-sm font-bold text-[#f1641e]">{formatKsh(currentTotal)}</p>
          </div>
          <div className="grid gap-3">{currentMonth.map(renderPayout)}</div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div><h2 className="text-base font-bold text-[#222]">Previous Months</h2><p className="text-xs text-[#595959]">Historical payout periods</p></div>
            <p className="text-sm font-bold text-[#222]">{formatKsh(pastTotal)}</p>
          </div>
          <div className="grid gap-3">{past.length ? past.map(renderPayout) : <div className="rounded-2xl border border-dashed border-[#e6e6e4] bg-white p-6 text-center text-sm text-[#595959]">No previous payout periods.</div>}</div>
        </section>
      </div>
    </div>
  );
};

export default PayoutsPage;
