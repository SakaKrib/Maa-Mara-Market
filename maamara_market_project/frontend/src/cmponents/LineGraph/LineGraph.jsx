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
import "../admin-charts.css";
import { formatAxisNumber } from "../../Services/formatNumber";

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

  const muted = cssVar("--mm-muted-hsl", "0 0% 45%");
  const border = cssVar("--mm-border-hsl", "0 0% 85%");
  const chart1 = cssVar("--mm-chart-1-hsl", "142 71% 45%");
  const chart2 = cssVar("--mm-chart-2-hsl", "217 91% 60%");

  return (
    <div className="mm-admin-chart-fill mm-admin-chart-relative">
      {showSummary && (
        <button
          type="button"
          onClick={() => setSummaryOpen(true)}
          className="mm-admin-chart-summary-button"
        >
          Summary
        </button>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
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
          <YAxis tick={{ fill: `hsl(${muted})`, fontSize: 10 }} axisLine={false} tickLine={false} width={44} tickFormatter={formatAxisNumber} />
          <Tooltip
            contentStyle={{
              background: "var(--mm-surface, #fff)",
              border: "1px solid var(--mm-border, #e5e7eb)",
              borderRadius: 10,
              color: "var(--mm-foreground, #1f2937)",
            }}
          />
          <Area type="monotone" dataKey="revenue" name="Revenue (KES)" stroke={`hsl(${chart1})`} fill="url(#adminRevenueFill)" strokeWidth={2} />
          <Area type="monotone" dataKey="orders" name="Orders" stroke={`hsl(${chart2})`} fill="url(#adminOrdersFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>

      {summaryOpen && (
        <div className="mm-admin-chart-summary-card">
          <h3 className="mm-admin-chart-summary-heading">Revenue Summary</h3>
          <div className="mm-admin-chart-summary-divider" />
          <p className="mm-admin-chart-summary-label">Months: {data.length}</p>
          <p className="mm-admin-chart-summary-label mm-admin-chart-summary-spaced">Total Revenue</p>
          <p className="mm-admin-chart-summary-value-primary">KES {totalRevenue.toLocaleString()}</p>
          <p className="mm-admin-chart-summary-label mm-admin-chart-summary-spaced">Total Orders</p>
          <p className="mm-admin-chart-summary-value">{totalOrders.toLocaleString()}</p>
          <button type="button" onClick={() => setSummaryOpen(false)} className="mm-admin-chart-summary-close">
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomAreaChart;
