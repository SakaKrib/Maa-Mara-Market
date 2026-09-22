import { useEffect, useState } from "react";
import api from "../../../Services/Api";

export const useVendorItemGrowthStats = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/vendor-analytics/?period=month", { withCredentials: true })
      .then((response) => setData(response.data))
      .catch(() => setError("Failed to load vendor item growth stats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading || error || !data) return {
    title: "Item Growth", value: 0, percentage: "N/A", percentageColor: "gray",
    duration: "Last 6 Months", link: "item-stats", chartData: [], loading, error
  };

  const chartData = (data.series?.items || []).map((stat) => ({
    name: new Date(stat.period).toLocaleDateString("en-KE", { month: "short", year: "2-digit" }),
    pv: stat.value || 0,
  }));
  const values = chartData.map((x) => x.pv);
  const latest = values.at(-1) || 0;
  const previous = values.at(-2) || 0;
  const change = previous ? ((latest - previous) / previous) * 100 : 0;

  return {
    title: "Item Growth",
    value: data.totals?.items || 0,
    percentage: `${change >= 0 ? "+" : ""}${Math.round(change)}%`,
    percentageColor: change > 50 ? "green" : change > 0 ? "blue" : change < 0 ? "red" : "gray",
    duration: "Last 6 Months",
    link: "item-stats",
    chartData,
    loading,
    error,
  };
};