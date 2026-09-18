import React from "react";
import useVendorStatsBox from "../../Hooks/ItemStats/ItemStatsHook"; 
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
import { tokens } from "../../../theme";
import { useTheme } from "@mui/material";

const VendorStatsPage = ({ vendorId = null }) => {
  // Use your hook to get data & states
  const {
    title,
    value,
    percentage,
    percentageColor,
    duration,
    chartData,
    loading,
    error,
  } = useVendorStatsBox({ vendorId });

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  if (loading) {
    return (
      <div
        className="flex justify-center items-center h-[60vh] text-lg"
        style={{ color: colors.gray[100] }}
      >
        Loading stats...
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
        className="p-6 rounded-xl shadow border-b border-gray-700"
        style={{ color: colors.gray[100], backgroundColor: colors.primary[500] }}
        aria-label="Monthly Views Chart"
      >
        <h1 className="text-2xl font-bold mb-2" style={{color: colors.gray[100]}}>{title}</h1>
        {duration && <p className="mb-6 " style={{color: colors.gray[100]}}>{duration}</p>}

        {chartData.length === 0 ? (
          <p style={{ color: colors.gray[400] }}>No data available.</p>
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

export default VendorStatsPage;
