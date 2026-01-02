import { useEffect, useState } from "react";
import api from "../../../Services/Api";

const useVendorStatsBox = ({
  endpoint = "/api/item-stats/",
  vendorId = null,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = vendorId ? `${endpoint}?vendorId=${vendorId}` : endpoint;
        const response = await api.get(url, { withCredentials: true });

        setData(response.data);
        console.log("✅ Vendor Stats:", response.data);
      } catch (err) {
        console.error("❌ Error fetching vendor stats:", err);
        setError("Failed to load stats.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [endpoint, vendorId]);

  // ⏳ Loading or error states
  if (loading || error || !data) {
    return {
      title: "Monthly Views",
      value: 0,
      percentage: "N/A",
      percentageColor: "gray",
      duration: "",
      link: "/views",
      chartData: [],
      loading,
      error,
    };
  }

  // 🧭 Safely map monthly stats
  const chartData = Array.isArray(data.monthly_stats)
    ? data.monthly_stats.map((stat) => ({
        name: stat.month,
        pv: stat.total_views || 0,
      }))
    : [];

  // 📊 Calculate percentage change between last two months
  const lastIndex = chartData.length - 1;
  const thisMonthViews = chartData[lastIndex]?.pv || 0;
  const lastMonthViews = chartData[lastIndex - 1]?.pv || 0;

  let percentageChange = "N/A";
  let percentageColor = "gray";

  if (lastMonthViews > 0) {
    const change = ((thisMonthViews - lastMonthViews) / lastMonthViews) * 100;
    const roundedChange = Math.round(change);

    percentageChange = `${change >= 0 ? "+" : ""}${roundedChange}%`;

    if (change < 0) {
      percentageColor = "red";
    } else if (roundedChange < 50) {
      percentageColor = "gold";
    } else if (roundedChange < 80) {
      percentageColor = "blue";
    } else {
      percentageColor = "green";
    }
  }else if (chartData.length === 1) {
    // 👇 Add this fallback
    percentageChange = "+0%";
    percentageColor = "gray";
  }

  return {
    title: "Monthly Views",
    value: data.total_views || 0,
    percentage: percentageChange,
    percentageColor,
    duration: "Last 6 Months",
    link: "item-views",
    chartData,
    loading,
    error,
  };
};

export default useVendorStatsBox;
