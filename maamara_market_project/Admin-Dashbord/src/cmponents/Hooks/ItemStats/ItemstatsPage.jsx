import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, YAxis, XAxis, Tooltip, CartesianGrid } from "recharts";
import api from "../../../Services/Api";

const GrowthPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/vendor-item-growth/", { withCredentials: true })
      .then((response) => setData(response.data))
      .catch(() => setError("Failed to load vendor item growth stats."))
      .finally(() => setLoading(false));
  }, []);

  const chartData = Array.isArray(data?.monthly_stats)
    ? data.monthly_stats.map((stat) => ({ name: stat.month, pv: Number(stat.total_items) || 0 }))
    : [];

  const last = Number(data?.monthly_stats?.at(-1)?.percentage_change || 0);
  const percentage = `${last >= 0 ? "+" : ""}${last}%`;

  if (loading) return <div className="rounded-2xl border border-[#e6e6e4] bg-white p-8 text-sm text-[#595959]">Loading growth data...</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-white p-8 text-sm text-red-600">{error}</div>;

  return (
    <section className="w-full space-y-5">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Store analytics</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">Item Growth</h1>
        <p className="mt-1 text-sm text-[#595959]">Item count trend across the last six months.</p>
      </header>

      <section className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e6e6e4] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#222]">Growth trend</h2>
            <p className="mt-1 text-xs text-[#595959]">Monthly item totals.</p>
          </div>
          <div className="rounded-full bg-[#eff6ff] px-3 py-1.5 text-xs font-bold text-[#2563eb]">{percentage}</div>
        </div>
        {chartData.length ? (
          <div className="mt-5 h-[320px] w-full min-w-0 sm:h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#595959" }} tickLine={false} axisLine={{ stroke: "#d9d9d6" }} />
                <YAxis tick={{ fontSize: 10, fill: "#595959" }} tickLine={false} axisLine={false} width={38} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6e6e4", background: "#fff" }} />
                <Line type="monotone" dataKey="pv" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="mt-5 rounded-xl bg-[#f8f8f6] p-8 text-center text-sm text-[#595959]">No growth data available.</div>}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e6e6e4] bg-white p-5"><p className="text-xs text-[#595959]">Current items</p><p className="mt-1 text-2xl font-bold text-[#222]">{data?.total_items || 0}</p></div>
        <div className="rounded-2xl border border-[#e6e6e4] bg-white p-5"><p className="text-xs text-[#595959]">Period</p><p className="mt-1 text-base font-bold text-[#222]">Last 6 months</p></div>
        <div className="rounded-2xl border border-[#e6e6e4] bg-white p-5"><p className="text-xs text-[#595959]">Change</p><p className="mt-1 text-base font-bold text-[#2563eb]">{percentage}</p></div>
      </section>
    </section>
  );
};

export default GrowthPage;
