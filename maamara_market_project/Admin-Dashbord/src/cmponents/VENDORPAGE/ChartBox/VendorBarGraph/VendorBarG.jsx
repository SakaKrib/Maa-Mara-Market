import React, { useMemo } from "react";
import { Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";

const VendorBar = ({ payouts = [] }) => {
  const groupedData = useMemo(() => {
    const grouped = payouts.reduce((acc, item) => {
      if (!item?.payout_period_start) return acc;
      const date = new Date(item.payout_period_start);
      if (Number.isNaN(date.getTime())) return acc;
      const key = date.toISOString().slice(0, 10);
      acc[key] = (acc[key] || 0) + (Number(item.amount) || 0);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([key, amount]) => ({
        name: new Date(key).toLocaleDateString("en-KE", { day: "2-digit", month: "short" }),
        amount,
        date: new Date(key),
      }))
      .sort((a, b) => a.date - b.date);
  }, [payouts]);

  if (!groupedData.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-[#f8f8f6] text-center text-sm text-[#595959]">
        No sales recorded for this month.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={groupedData} margin={{ top: 8, right: 8, bottom: 12, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e4" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#595959" }} axisLine={{ stroke: "#d9d9d6" }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#595959" }} axisLine={false} tickLine={false} width={42} />
        <Tooltip
          formatter={(value) => [`KSh ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, "Sales"]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e6e6e4", background: "#ffffff", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
        />
        <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={34} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default VendorBar;
