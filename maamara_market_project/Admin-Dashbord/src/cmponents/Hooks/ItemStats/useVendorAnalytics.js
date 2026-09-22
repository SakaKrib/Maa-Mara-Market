import { useEffect, useMemo, useState } from "react";
import api from "../../../Services/Api";

export const PERIOD_OPTIONS = [
  { value: "day", label: "Daily", description: "Last 30 days" },
  { value: "week", label: "Weekly", description: "Last 12 weeks" },
  { value: "month", label: "Monthly", description: "Last 6 months" },
];

const useVendorAnalytics = (metric = "views", initialPeriod = "month") => {
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    api.get(`/api/vendor-analytics/?period=${period}`, { withCredentials: true })
      .then((response) => {
        if (active) setData(response.data);
      })
      .catch(() => {
        if (active) setError("Failed to load analytics data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [period]);

  const series = useMemo(
    () => (data?.series?.[metric] || []).map((entry) => ({
      name: new Date(entry.period).toLocaleDateString("en-KE", period === "month"
        ? { month: "short", year: "2-digit" }
        : period === "week"
          ? { day: "2-digit", month: "short" }
          : { day: "2-digit", month: "short" }),
      pv: Number(entry.value) || 0,
      date: new Date(entry.period),
    })),
    [data, metric, period]
  );

  return {
    period,
    setPeriod,
    data,
    series,
    value: Number(data?.totals?.[metric]) || 0,
    loading,
    error,
  };
};

export default useVendorAnalytics;
