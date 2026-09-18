import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useTheme } from "@mui/material";
import { tokens } from "../../../theme";

const CombinedVendorStatsChart = ({ vendorStats, /* monthlySales, */ vendorGrowthStats, orderStats }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Compose the combined data for the pie chart, excluding monthlySales
  const data = useMemo(() => {
    return [
      {
        name: "Views",
        value: Number(vendorStats.value) || 0,
        color: colors.blueAccent[400],
      },
      // {
      //   name: "Sales",
      //   value: Number(monthlySales.value) || 0,
      //   color: colors.greenAccent[400],
      // },
      {
        name: "Growth",
        value: Number(vendorGrowthStats.value) || 0,
        color: colors.orangeAccent[400],
      },
      {
        name: "Orders",
        value: Number(orderStats.value) || 0,
        color: colors.redAccent[400],
      },
    ];
  }, [vendorStats, /* monthlySales, */ vendorGrowthStats, orderStats, colors]);

  console.log(
    'Chart data values:',
    vendorStats.value,
    // monthlySales.value,
    vendorGrowthStats.value,
    orderStats.value
  );

  // If all zeros or loading
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  if (totalValue === 0) {
    return (
      <div style={{ color: colors.gray[400], textAlign: "center", padding: 20 }}>
        No vendor data available for chart.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 300 }} className="relative">
      <h3 style={{ color: colors.gray[100], textAlign: "start", marginBottom: 12 }} className="absolute">
        Overview
      </h3>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={4}
            label={({ name, percent }) =>
              percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : `${name}: 0%`
            }
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => new Intl.NumberFormat().format(value)}
            contentStyle={{
              backgroundColor: colors.primary[400],
              border: "1px solid #444",
            }}
            itemStyle={{ color: colors.gray[100] }}
            labelStyle={{ color: colors.gray[100] }}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ color: colors.gray[100], fontSize: 14 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CombinedVendorStatsChart;
