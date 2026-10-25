import { useEffect, useState } from "react";
import api from "../../../../../Services/Api";

// Monthly sales for the vendor dashboard. Every paid sale counts, and each one
// carries the stage it has reached on the way to payment (awaiting delivery
// confirmation, ready for payout, payout processing, paid out).
export const useMonthlySales = () => {
  const [overview, setOverview] = useState({ months: [], totals: {}, items: [], stage_labels: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get("/api/vendor/sales-overview/", { params: { months: 6 }, withCredentials: true })
      .then((response) => {
        if (active) setOverview(response.data || { months: [], totals: {}, items: [], stage_labels: {} });
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.detail || "Unable to load your sales.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
    loading,
    error,
  };
};
