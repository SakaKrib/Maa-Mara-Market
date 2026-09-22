import React, { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, YAxis, XAxis, Tooltip, CartesianGrid } from "recharts";
import useMonthlySalesReport from "../../../../Hooks/Sales/SalesReportHook";
import PayoutsPage from "../../../../VendorPayoutReport/vendorPayouts/vendorPayouts";

const VendorSalesPage = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthLabel = now.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  const { sales, totalAmount, loading, error } = useMonthlySalesReport(year, month);

  const dailySales = useMemo(() => {
    const grouped = {};
    (sales || []).forEach((sale) => {
      if (!sale.date_sold) return;
      const date = new Date(sale.date_sold);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      grouped[key] = (grouped[key] || 0) + (Number(sale.calculated_total_price) || 0);
    });
    return Object.entries(grouped)
      .map(([key, value]) => ({
        name: new Date(key).toLocaleDateString("en-KE", { day: "2-digit", month: "short" }),
        pv: value,
        date: new Date(key),
      }))
      .sort((a, b) => a.date - b.date);
  }, [sales]);

  if (loading) return <div className="rounded-2xl border border-[#e6e6e4] bg-white p-8 text-sm text-[#595959]">Loading sales data...</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-white p-8 text-sm text-red-600">{error}</div>;

  return (
    <section className="w-full space-y-5">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Store analytics</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">Sales for {monthLabel}</h1>
        <p className="mt-1 text-sm text-[#595959]">Daily sales activity for the current month.</p>
      </header>

      <section className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e6e6e4] pb-4">
          <div><h2 className="text-lg font-bold text-[#222]">Current month sales</h2><p className="mt-1 text-xs text-[#595959]">{sales?.length || 0} sale record{sales?.length === 1 ? "" : "s"}</p></div>
          <p className="text-xl font-bold text-[#222]">KSh {Number(totalAmount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="mt-5 h-[320px] w-full min-w-0 sm:h-[380px]">
          {dailySales.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySales} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#595959" }} tickLine={false} axisLine={{ stroke: "#d9d9d6" }} />
                <YAxis tick={{ fontSize: 10, fill: "#595959" }} tickLine={false} axisLine={false} width={55} />
                <Tooltip formatter={(value) => [`KSh ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, "Sales"]} contentStyle={{ borderRadius: 12, border: "1px solid #e6e6e4", background: "#fff" }} />
                <Line type="monotone" dataKey="pv" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="flex h-full items-center justify-center rounded-xl bg-[#f8f8f6] text-center text-sm text-[#595959]">No sales recorded for {monthLabel}.</div>}
        </div>
      </section>

    </section>
  );
};

export default VendorSalesPage;
