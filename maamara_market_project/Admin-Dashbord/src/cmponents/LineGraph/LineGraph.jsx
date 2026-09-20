import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../../Services/Api";

const cssVar = (name, fallback) => {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

const CustomAreaChart = ({ showSummary = true, data: suppliedData = [] }) => {
  const [data, setData] = useState(Array.isArray(suppliedData) ? suppliedData : []);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    if (Array.isArray(suppliedData) && suppliedData.length) {
      setData(suppliedData);
      return;
    }

    let active = true;
    api.get("/api/revenue-analytics/").then((res) => {
      if (!active) return;
      const payload = res.data;
      const rows = Array.isArray(payload) ? payload : payload?.monthly_revenue || [];
      setData(Array.isArray(rows) ? rows : []);
    }).catch((error) => {
      console.error("Revenue chart load failed:", error);
      if (active) setData([]);
    });

    return () => { active = false; };
  }, [suppliedData]);

  const totalRevenue = data.reduce((sum, d) => sum + Number(d.revenue || 0), 0);
  const totalOrders = data.reduce((sum, d) => sum + Number(d.orders || 0), 0);

  const primary = cssVar("--primary", "120 100% 40%");
  const foreground = cssVar("--foreground", "0 0% 10%");
  const muted = cssVar("--muted-foreground", "0 0% 45%");
  const border = cssVar("--border", "0 0% 85%");
  const chart1 = cssVar("--chart-1", "142 71% 45%");
  const chart2 = cssVar("--chart-2", "217 91% 60%");

  return (
    <div className="relative h-full min-h-0 w-full">
      {showSummary && (
        <button
          type="button"
          onClick={() => setSummaryOpen(true)}
          className="absolute right-2 top-1 z-10 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          Summary
        </button>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 4 }}>
          <defs>
            <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`hsl(${chart1})`} stopOpacity={0.35} />
              <stop offset="95%" stopColor={`hsl(${chart1})`} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="adminOrdersFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`hsl(${chart2})`} stopOpacity={0.25} />
              <stop offset="95%" stopColor={`hsl(${chart2})`} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={`hsl(${border})`} />
          <XAxis dataKey="month" tick={{ fill: `hsl(${muted})`, fontSize: 10 }} axisLine={{ stroke: `hsl(${border})` }} tickLine={false} />
          <YAxis tick={{ fill: `hsl(${muted})`, fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
          <Tooltip
            contentStyle={{
              background: `hsl(var(--card))`,
              border: `1px solid hsl(${border})`,
              borderRadius: 10,
              color: `hsl(${foreground})`,
            }}
          />
          <Area type="monotone" dataKey="revenue" name="Revenue (KES)" stroke={`hsl(${chart1})`} fill="url(#adminRevenueFill)" strokeWidth={2} />
          <Area type="monotone" dataKey="orders" name="Orders" stroke={`hsl(${chart2})`} fill="url(#adminOrdersFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>

      {summaryOpen && (
        <div className="absolute inset-x-2 top-12 z-20 rounded-xl border border-border bg-card p-4 shadow-xl sm:left-auto sm:w-72">
          <h3 className="font-semibold text-foreground">Revenue Summary</h3>
          <div className="my-2 border-t border-border" />
          <p className="text-sm text-muted-foreground">Months: {data.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">Total Revenue</p>
          <p className="font-bold text-primary">KES {totalRevenue.toLocaleString()}</p>
          <p className="mt-2 text-sm text-muted-foreground">Total Orders</p>
          <p className="font-bold text-foreground">{totalOrders.toLocaleString()}</p>
          <button type="button" onClick={() => setSummaryOpen(false)} className="mt-4 w-full rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/80">
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomAreaChart;
