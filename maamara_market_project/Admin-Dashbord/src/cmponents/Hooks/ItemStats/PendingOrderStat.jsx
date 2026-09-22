import { useEffect, useState } from "react";
import api from "../../../Services/Api";

export const useVendorPendingOrdersStats = () => {
  const [data, setData] = useState({
    total_pending_orders: 0,
    monthly_stats: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get("/api/pending-orders-stats/", {
          withCredentials: true,
        });

        const resData = response.data || {};
        setData({
          total_pending_orders: resData.total_pending_orders || 0,
          monthly_stats: Array.isArray(resData.monthly_stats)
            ? resData.monthly_stats
            : [],
        });
      } catch (err) {
        console.error("❌ Error fetching pending orders stats:", err);
        setError("Failed to load stats.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading || error) {
    return {
      title: "Pending Orders",
      value: 0,
      percentage: "N/A",
      percentageColor: "gray",
      duration: "Last 6 Months",
      link: "/orders",
      chartData: [],
      loading,
      error,
    };
  }

  const chartData = data.monthly_stats.map((stat) => ({
    name: stat.month || "Unknown",
    pv: stat.total_pending_orders || 0,
  }));

  const latest =
    data.monthly_stats.length > 0
      ? data.monthly_stats[data.monthly_stats.length - 1]
      : null;

  const percentageChange =
    latest && typeof latest.percentage_change === "number"
      ? latest.percentage_change.toFixed(1)
      : 0;

  const percentage = `${
    percentageChange > 0 ? "+" : ""
  }${percentageChange}%`;

  const percentageColor =
    percentageChange > 0
      ? "green"
      : percentageChange < 0
      ? "red"
      : "gray";

  return {
    title: "Pending Orders",
    value: data.total_pending_orders,
    percentage,
    percentageColor,
    duration: "Last 6 Months",
    link: "order-stats",
    chartData,
    loading,
    error,
  };
};
