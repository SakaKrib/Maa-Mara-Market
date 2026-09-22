import React from "react";
import { ResponsiveContainer, LineChart, Line, YAxis, XAxis, Tooltip, CartesianGrid } from "recharts";
import useVendorAnalytics, { PERIOD_OPTIONS } from "./useVendorAnalytics";

const VendorStatsPage = () => {
  const { period, setPeriod, series, value, loading, error } = useVendorAnalytics("views");

  return (
    <section className="w-full space-y-5">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Store analytics</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">Monthly Views</h1><p className="mt-1 text-sm text-[#595959]">Customer views across the selected period.</p></div>
          <div className="flex rounded-full border border-[#d9d9d6] bg-[#f8f8f6] p-1">
            {PERIOD_OPTIONS.map((option) => <button key={option.value} onClick={() => setPeriod(option.value)} className={`rounded-full px-3 py-2 text-xs font-semibold transition ${period === option.value ? "bg-[#2563eb] text-white" : "text-[#595959] hover:bg-white"}`}>{option.label}</button>)}
          </div>
        </div>
      </header>
      <section className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e6e6e4] pb-4">
          <div><h2 className="text-lg font-bold text-[#222]">Views trend</h2><p className="mt-1 text-xs text-[#595959]">{PERIOD_OPTIONS.find((x) => x.value === period)?.description}</p></div>
          <p className="text-2xl font-bold text-[#222]">{value.toLocaleString()}</p>
        </div>
        {loading ? <div className="mt-5 h-[320px] rounded-xl bg-[#f8f8f6] p-8 text-sm text-[#595959]">Loading...</div> : error ? <div className="mt-5 rounded-xl bg-red-50 p-8 text-sm text-red-600">{error}</div> : series.length ? (
          <div className="mt-5 h-[320px] w-full min-w-0 sm:h-[380px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{top:8,right:8,left:0,bottom:8}}><CartesianGrid strokeDasharray="3 3" stroke="#e6e6e4" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10,fill:"#595959"}} tickLine={false} axisLine={{stroke:"#d9d9d6"}}/><YAxis tick={{fontSize:10,fill:"#595959"}} tickLine={false} axisLine={false} width={42}/><Tooltip contentStyle={{borderRadius:12,border:"1px solid #e6e6e4",background:"#fff"}}/><Line type="monotone" dataKey="pv" stroke="#2563eb" strokeWidth={3} dot={{r:3}} activeDot={{r:5}}/></LineChart></ResponsiveContainer></div>
        ) : <div className="mt-5 rounded-xl bg-[#f8f8f6] p-8 text-center text-sm text-[#595959]">No view data for this period.</div>}
      </section>
    </section>
  );
};

export default VendorStatsPage;
