import { useEffect, useState } from "react";
import api from "../../../Services/Api";

export const useVendorItemGrowthStats = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/vendor-item-growth/", { withCredentials: true });
        setData(response.data);
      } catch (err) {
        console.error("❌ Error fetching vendor item growth:", err);
        setError("Failed to load vendor item growth stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading || error || !data) {
    return {
      title: "Item Growth",
      value: 0,
      percentage: "N/A",
      percentageColor: "gray",
      duration: "",
      link: "/items",
      chartData: [],
      loading,
      error,
    };
  }

  // Map monthly stats for chart display
  const chartData = Array.isArray(data.monthly_stats)
    ? data.monthly_stats.map((stat) => ({
        name: stat.month,
        pv: stat.total_items || 0,
      }))
    : [];

  // Get percentage change from last month
  const last = data.monthly_stats?.at(-1)?.percentage_change || 0;
  const percentageChange = `${last >= 0 ? "+" : ""}${last}%`;

  // Assign color dynamically
  let percentageColor = "gray";
  if (last > 50) percentageColor = "green";
  else if (last > 0) percentageColor = "blue";
  else if (last < 0) percentageColor = "red";

  return {
    title: "Item Growth",
    value: data.total_items || 0,
    percentage: percentageChange,
    percentageColor,
    duration: "Last 6 Months",
    link: "item-stats",
    chartData,
    loading,
    error,
  };
};
