import React from "react";
import { useMonthlySales } from "./SalesReport";
import ChartBox from "../../CharBox";
import { ResponsiveContainer, LineChart, Line, YAxis, XAxis, Tooltip, CartesianGrid } from "recharts";
import { useTheme } from "@mui/material";
import {tokens} from "../../../../../theme"
import PayoutsPage from "../../../../VendorPayoutReport/vendorPayouts/vendorPayouts";

const VendorSalesPage = () => {
  const { title, value, percentage, duration, chartData, loading, error } = useMonthlySales();

  const theme = useTheme();
  const colors = tokens(theme.palette.mode)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-gray-300 text-lg">
        Loading sales data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-red-400 text-lg">
        Error loading sales data.
      </div>
    );
  }

  return (
    <div>
    <div className="p-6 space-y-10 max-w-5xl mx-auto border-b border-gray-700">
  {/* Graph FIRST */}
  <div className="flex flex-col border-b border-gray-700">
    <div
      className="p-6 rounded-xl shadow"
      style={{ backgroundColor: colors.primary[500], color: colors.gray[100] }}
    >
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="mb-6">{duration}</p>

      {chartData.length === 0 ? (
        <p style={{ color: colors.gray[400] }}>No sales data available.</p>
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
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </div>

  {/* SUMMARY DATA UNDER CHART */}
  <section
    className="p-6 rounded-xl border shadow max-w-lg mx-auto"
    style={{ color: colors.gray[100] }}
  >
    <ChartBox
      title={title}
      value={value}
      percentage={percentage}
      duration={duration}
      chartData={chartData}
    />
  </section>
</div>


     

    
     {/* othtly payout */}
     <div>
        <PayoutsPage />
      </div>
    </div>
  );
};

export default VendorSalesPage;
