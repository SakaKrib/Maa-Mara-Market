import React from "react";
import { useTheme } from "@mui/material";
import { tokens } from "../../../theme";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import ChartBox from "../../VENDORPAGE/ChartBox/CharBox";
import { useVendorPendingOrdersStats } from "./PendingOrderStat";
const PendingOrdersPage = () => {
  const {
    title,
    value,
    percentage,
    percentageColor,
    duration,
    chartData,
    loading,
    error,
  } = useVendorPendingOrdersStats();

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  if (loading) {
    return (
      <div
        className="flex justify-center items-center h-[60vh] text-lg"
        style={{ color: colors.gray[100] }}
      >
        Loading pending orders data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-red-400 text-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-10 max-w-5xl mx-auto border-b border-gray-700">
      {/* Chart Section */}
      <section
        className="p-6 rounded-xl shadow border-b border-gray-700"order-stats
        style={{ color: colors.gray[100], backgroundColor: colors.primary[500] }}
        aria-label="Pending Orders Chart"
      >
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="mb-6 text-gray-400">{duration}</p>

        {chartData.length === 0 ? (
          <p style={{ color: colors.gray[400] }}>No pending orders data available.</p>
        ) : (
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#bbb" />
                <YAxis stroke="#bbb" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.primary[500],
                    border: "1px solid #374151",
                    color: colors.gray[100],
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pv"
                  stroke="#22c55e"
                  strokeWidth={3}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Summary Data */}
      <section
        className="p-6 rounded-xl border shadow max-w-lg mx-auto"
        style={{ color: colors.gray[100] }}
      >
        <ChartBox
          title={title}
          value={value}
          percentage={percentage}
          percentageColor={percentageColor}
          duration={duration}
          chartData={chartData}
        />
      </section>
    </div>
  );
};

export default PendingOrdersPage;
