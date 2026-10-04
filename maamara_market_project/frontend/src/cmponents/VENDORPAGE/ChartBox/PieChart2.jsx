import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#2563eb", "#f59e0b", "#dc2626"];

const CombinedVendorStatsChart = ({ vendorStats, vendorGrowthStats, orderStats }) => {
  const data = useMemo(() => [
    { name: "Views", value: Number(vendorStats?.value) || 0 },
    { name: "Growth", value: Number(vendorGrowthStats?.value) || 0 },
    { name: "Orders", value: Number(orderStats?.value) || 0 },
  ], [vendorStats, vendorGrowthStats, orderStats]);

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  if (totalValue === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center text-center text-sm text-[#595959]">
        No vendor data available for chart.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-2">
        <h3 className="text-base font-bold text-[#222] sm:text-lg">Overview</h3>
        <p className="mt-0.5 text-xs text-[#595959]">Views, item growth and pending orders.</p>
      </div>
      <div className="mt-3 h-[300px] w-full min-w-0 overflow-hidden sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="42%"
              innerRadius="40%"
              outerRadius="58%"
              paddingAngle={3}
              label={false}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [Number(value).toLocaleString(), name]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e6e6e4",
                background: "#ffffff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              wrapperStyle={{
                fontSize: 11,
                color: "#374151",
                paddingTop: 8,
                width: "100%",
                whiteSpace: "normal",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CombinedVendorStatsChart;
