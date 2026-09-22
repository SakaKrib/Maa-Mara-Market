import React from "react";
import { ResponsiveContainer, LineChart, Line, YAxis, XAxis, Tooltip, CartesianGrid } from "recharts";
import { useMonthlySales } from "./SalesReport";
import PayoutsPage from "../../../../VendorPayoutReport/vendorPayouts/vendorPayouts";

const VendorSalesPage = () => {
  const { chartData, loading, error } = useMonthlySales();
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  const current = chartData.filter((entry) => entry.date && `${entry.date.getFullYear()}-${String(entry.date.getMonth() + 1).padStart(2, "0")}` === currentKey);
  const currentTotal = current.reduce((sum, entry) => sum + (Number(entry.pv) || 0), 0);

  if (loading) return <div className="rounded-2xl border border-[#e6e6e4] bg-white p-8 text-sm text-[#595959]">Loading sales data...</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-white p-8 text-sm text-red-600">{error}</div>;

  return (
    <section className="w-full space-y-5">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Store analytics</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">Sales for {monthLabel}</h1>
        <p className="mt-1 text-sm text-[#595959]">Current-month vendor sales with payout history below.</p>
      </header>

      <section className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e6e6e4] pb-4">
          <div><h2 className="text-lg font-bold text-[#222]">Current month sales</h2><p className="mt-1 text-xs text-[#595959]">{monthLabel}</p></div>
          <p className="text-xl font-bold text-[#222]">KSh {currentTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="mt-5 h-[320px] w-full min-w-0 sm:h-[380px]">
          {current.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={current} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#595959" }} tickLine={false} axisLine={{ stroke: "#d9d9d6" }} />
                <YAxis tick={{ fontSize: 10, fill: "#595959" }} tickLine={false} axisLine={false} width={55} />
                <Tooltip formatter={(value) => [`KSh ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, "Sales"]} contentStyle={{ borderRadius: 12, border: "1px solid #e6e6e4", background: "#fff" }} />
                <Line type="monotone" dataKey="pv" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="flex h-full items-center justify-center rounded-xl bg-[#f8f8f6] text-center text-sm text-[#595959]">No sales recorded for {monthLabel}.</div>}
        </div>
      </section>

      <PayoutsPage />
    </section>
  );
};

export default VendorSalesPage;
