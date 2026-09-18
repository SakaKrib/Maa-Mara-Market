import React, { useState, useEffect } from "react";
import api from "../../../Services/Api"; 
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
import {tokens} from "../../../theme";
import { useTheme } from "@mui/material";


const GrowthPage = () => {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/vendor-item-growth/", {
          withCredentials: true,
        });
        setData(response.data);

        if (Array.isArray(response.data.monthly_stats)) {
          const mapped = response.data.monthly_stats.map((stat) => ({
            name: stat.month,
            pv: stat.total_items || 0,
          }));
          setChartData(mapped);
        } else {
          setChartData([]);
        }
      } catch (err) {
        console.error("❌ Error fetching vendor item growth:", err);
        setError("Failed to load vendor item growth stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const last = data?.monthly_stats?.at(-1)?.percentage_change || 0;
  const percentage = `${last >= 0 ? "+" : ""}${last}%`;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-lg" style={{color:colors.gray[100]}}>
        Loading growth data...
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

      {/* Chart section */}
      <div className="p-6 rounded-xl shadow border-b border-gray-700" style={{color:colors.gray[100], backgroundColor:colors.primary[500]}}>
        <h1 className="text-2xl font-bold mb-2" style={{color:colors.gray[100]}}>Item Growth</h1>
        <p className=" mb-6" style={{color:colors.gray[400]}}>Last 6 Months</p>

        {chartData.length === 0 ? (
          <p style={{color:colors.gray[400]}}>No growth data available.</p>
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
      </div>

      {/* Summary data under the chart */}
      <section
    className="p-6 rounded-xl border shadow max-w-lg mx-auto"
    style={{ color: colors.gray[100] }}
  >
        <ChartBox
          title="Item Growth"
          value={data?.total_items || 0}
          percentage={percentage}
          duration="Last 6 Months"
          chartData={chartData}
        />
      </section>

    </div>
  );
};

export default GrowthPage;
