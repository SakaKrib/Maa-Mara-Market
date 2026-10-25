import { useCallback, useEffect, useState } from "react";
import api from "../../../../../Services/Api";

// Monthly sales for the vendor dashboard. Every paid sale counts, and each one
// carries the stage it has reached on the way to payment (awaiting delivery
// confirmation, ready for payout, payout processing, paid out).
export const useMonthlySales = () => {
  const [overview, setOverview] = useState({ months: [], totals: {}, items: [], stage_labels: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [updatedAt, setUpdatedAt] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const response = await api.get("/api/vendor/sales-overview/", { params: { months: 6 }, withCredentials: true });
      setOverview(response.data || { months: [], totals: {}, items: [], stage_labels: {} });
      setUpdatedAt(new Date());
      setError(null);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Unable to load your sales.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Statuses keep moving, so the figures follow them: refresh every minute while
  // the page is open and whenever the vendor returns to the tab.
  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const months = Array.isArray(overview.months) ? overview.months : [];
  const chartData = months.map((month) => ({
    name: month.label,
    pv: Number(month.total) || 0,
    ...month,
  }));

  let percentage = "0%";
  if (chartData.length >= 2) {
    const last = chartData[chartData.length - 1].pv;
    const prev = chartData[chartData.length - 2].pv;
    const change = prev > 0 ? ((last - prev) / prev) * 100 : last > 0 ? 100 : 0;
    const capped = Math.min(Math.max(change, -100), 999);
    percentage = `${capped >= 0 ? "+" : ""}${capped.toFixed(1)}%`;
  }

  const total = Number(overview.totals?.total || 0).toFixed(2);

  return {
    title: "Monthly Sales",
    value: total,
    percentage,
    duration: "Last 6 Months",
    link: "vendor-sales",
    chartData,
    overview,
    refresh,
    updatedAt,
    loading,
    error,
  };
};
