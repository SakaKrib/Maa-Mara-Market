import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";
import Header from "../../../../Header/Header";
import api, { resolveApiAssetUrl } from "../../../../Services/Api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useItemActivityLogs from "../../../../cmponents/Hooks/ActivityHook/ItemActivityHook";
import "./SingleItemProfileNotif.css";

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
        const res = await api.get(`/api/items-vendor/${id}/`, {
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
      }));
  }, [vendorActivityLogs]);

  if (loading) return <p className="mm-item-notification-message">Loading item...</p>;
  if (!item) return <p className="mm-item-notification-message">Item not found.</p>;

  return (
    <div
      className="mm-item-notification-layout"
      style={{ maxHeight: "165vh", overflowY: "hidden" }}
    >
      {/* LEFT SIDE */}
      <div className="mm-item-notification-main">
        <Header title="Item (Notification View)" subtitle={item.name} />

        {/* IMAGE + DETAILS */}
        <div
          className="mm-item-notification-card"
          style={{ backgroundColor: colors.primary[600], color: colors.gray[100] }}
        >
          <div className="mm-item-notification-details">
            <img
              src={resolveApiAssetUrl(item.image) || "/placeholder.png"}
              alt={item.name}
              className="mm-item-notification-image"
            />
            <div className="mm-item-notification-details-copy">
              <h2 className="mm-item-notification-title">{item.name}</h2>
              <p className="mm-item-notification-description">{item.description?.slice(0, 120)}...</p>
              <p className="mm-item-notification-price">KES {item.price}</p>
              <p className="mm-item-notification-meta">
                Stock: {item.in_stock} | Category: {item.category}
              </p>
              <p className="mm-item-notification-meta">Department: {item.department}</p>
              <Link
                to="/vendors-dashboard/add-item"
                state={{ activeTab: "price", itemId: item.id }}
                className="mm-item-notification-action"
              >
                Request Price Change
              </Link>
            </div>
          </div>
        </div>

        {/* CHART */}
        <div
          className="mm-item-notification-card"
          style={{  color: colors.gray[100] }}
        >
          <h2 className="mm-item-notification-chart-title">Vendor Activity Trend</h2>
          <div className="mm-item-notification-chart">
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
        className="mm-item-notification-activity"
        style={{
          backgroundColor: colors.primary[700],
          color: colors.gray[100],
          overflowY: "auto",
          maxHeight: "165vh",
        }}
      >
        <div className="mm-item-notification-activity-header" style={{
          backgroundColor: colors.primary[600]}}>
          <h4 className="mm-item-notification-activity-title">Recent Item Activities</h4>
          {vendorActivityLogs.length > 0 && (
            <button
              onClick={clearItemLogs}
              className="mm-item-notification-clear"
              aria-label="Clear all activity logs"
            >
              Clear All
            </button>
          )}
        </div>

        <ul className="mm-item-notification-list">
          {vendorActivityLogs.length > 0 ? (
            vendorActivityLogs.map((log) => (
              <li
                key={log.id}
                className="mm-item-notification-log"
              >
                <div className="mm-item-notification-log-copy">
                  <p>{log.description || log.action}</p>
                  <time className="mm-item-notification-time">{new Date(log.timestamp).toLocaleString()}</time>
                </div>
                <button
                  onClick={() => deleteSingleLog(log.id)}
                  className="mm-item-notification-delete"
                  aria-label="Delete log"
                >
                  🗑️
                </button>
              </li>
            ))
          ) : (
            <li className="mm-item-notification-empty">No activities found</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default SingleItemProfileNotif;
