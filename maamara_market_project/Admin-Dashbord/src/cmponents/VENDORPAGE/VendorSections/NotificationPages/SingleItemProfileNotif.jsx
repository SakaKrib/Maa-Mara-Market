import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";
import Header from "../../../../Header/Header";
import api from "../../../../Services/Api";
import { baseUrl } from "../../../Constant/Constant";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useItemActivityLogs from "../../../../cmponents/Hooks/ActivityHook/ItemActivityHook"; // fixed path typo

const SingleItemProfileNotif = () => {
  const { id } = useParams();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // State for item details and loading indicator
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Activity logs hook with relevant methods
  const {
    activityLogs,
    fetchActivityLogs,
    deleteSingleLog,
    clearItemLogs,
  } = useItemActivityLogs(id);

  // Fetch item details and activity logs when 'id' or fetchActivityLogs changes
  useEffect(() => {
    if (!id) return;

    const fetchItem = async () => {
      try {
        const res = await api.get(`${baseUrl}/api/items-vendor/${id}/`, {
          withCredentials: true,
        });
        setItem(res.data);
      } catch (err) {
        console.error("Failed to load item:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
    fetchActivityLogs();
  }, [id, fetchActivityLogs]);

  // Filter only vendor activity logs for chart and list
  const vendorActivityLogs = useMemo(() => {
    return activityLogs?.filter((log) => log.actor_type === "vendor") || [];
  }, [activityLogs]);

  // Prepare chart data grouped by month with activities and dummy sales data
  const chartData = useMemo(() => {
    const grouped = vendorActivityLogs.reduce((acc, log) => {
      const date = new Date(log.timestamp);
      const monthIndex = date.getMonth();
      const monthName = date.toLocaleString("default", { month: "short" });

      if (!acc[monthIndex]) {
        acc[monthIndex] = { monthIndex, month: monthName, activities: 0 };
      }
      acc[monthIndex].activities += 1;
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => a.monthIndex - b.monthIndex)
      .map(({ month, activities }) => ({
        month,
        activities,
        sales: Math.floor(Math.random() * 800) + 200, // Replace with real sales if available
      }));
  }, [vendorActivityLogs]);

  if (loading) return <p className="p-4">Loading item...</p>;
  if (!item) return <p className="p-4">Item not found.</p>;

  return (
    <div
      className="flex gap-2 p-2 w-full flex-wrap flex-col lg:flex-row"
      style={{ maxHeight: "165vh", overflowY: "hidden" }}
    >
      {/* LEFT SIDE */}
      <div className="flex flex-col gap-6 lg:w-[49%] md:w-[50%] sm:w-full">
        <Header title="Item (Notification View)" subtitle={item.name} />

        {/* IMAGE + DETAILS */}
        <div
          className="p-4 rounded-md"
          style={{ backgroundColor: colors.primary[600], color: colors.gray[100] }}
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <img
              src={item.image || "/placeholder.png"}
              alt={item.name}
              className="w-64 h-64 rounded-md object-cover"
            />
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <p className="text-sm text-gray-300">{item.description?.slice(0, 120)}...</p>
              <p className="text-md font-bold text-green-400">KES {item.price}</p>
              <p className="text-sm text-gray-400">
                Stock: {item.in_stock} | Category: {item.category}
              </p>
              <p className="text-sm text-gray-400">Department: {item.department}</p>
            </div>
          </div>
        </div>

        {/* CHART */}
        <div
          className="p-4 rounded-md"
          style={{  color: colors.gray[100] }}
        >
          <h2 className="text-lg md:text-xl mb-4">Sales & Activity Trend</h2>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[500]} />
                <XAxis
                  dataKey="month"
                  stroke={colors.gray[300]}
                  tick={{ fill: colors.greenAccent[400], fontSize: 12 }}
                />
                <YAxis stroke={colors.gray[300]} tick={{ fill: colors.greenAccent[400] }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke={colors.blueAccent[400]}
                  strokeWidth={2}
                  name="Sales"
                />
                <Line
                  type="monotone"
                  dataKey="activities"
                  stroke={colors.redAccent[400]}
                  strokeWidth={2}
                  name="Activity Count"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Show recent activity logs */}
      <div
        className="p-4 rounded-md lg:w-[50%] md:w-[50%] sm:w-full"
        style={{
          backgroundColor: colors.primary[700],
          color: colors.gray[100],
          overflowY: "auto",
          maxHeight: "165vh",
        }}
      >
        <div className="flex justify-between items-center mb-4 p-2" style={{
          backgroundColor: colors.primary[600]}}>
          <h4 className="font-semibold text-lg">Recent Item Activities</h4>
          {vendorActivityLogs.length > 0 && (
            <button
              onClick={clearItemLogs}
              className="text-sm px-2 py-1 bg-red-600 rounded hover:bg-red-500 transition"
              aria-label="Clear all activity logs"
            >
              Clear All
            </button>
          )}
        </div>

        <ul className="space-y-3 px-2">
          {vendorActivityLogs.length > 0 ? (
            vendorActivityLogs.map((log) => (
              <li
                key={log.id}
                className="border-b border-gray-600 pb-2 flex items-start justify-between gap-3 hover:bg-gray-800 rounded-md p-2 transition"
              >
                <div className="flex flex-col gap-1">
                  <p>{log.description || log.action}</p>
                  <time className="text-gray-400 text-xs">{new Date(log.timestamp).toLocaleString()}</time>
                </div>
                <button
                  onClick={() => deleteSingleLog(log.id)}
                  className="text-sm text-red-500 hover:text-red-400 transition"
                  aria-label="Delete log"
                >
                  🗑️
                </button>
              </li>
            ))
          ) : (
            <li className="text-gray-400 text-sm">No activities found</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default SingleItemProfileNotif;
