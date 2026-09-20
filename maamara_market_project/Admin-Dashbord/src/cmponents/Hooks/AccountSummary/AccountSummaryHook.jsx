import { useCallback, useEffect, useState } from "react";
import api from "../../../Services/Api";

export default function useDashboardData(selectedDate = "") {
  const [data, setData] = useState({
    accounts: {},
    summary: {},
    payments: {},
    monthly_summary: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedDate ? { date: selectedDate } : undefined;
      const response = await api.get("/api/dashboard/summary/", {
        params,
        withCredentials: true,
      });
      const json = response.data || {};

      setData({
        accounts: json.accounts ?? {},
        summary: json.summary_cards ?? {},
        payments: json.payments_for_month ?? {},
        monthly_summary: json.monthly_summary ?? [],
      });
      setError(null);
    } catch (err) {
      console.error("Error loading account summary:", err);
      setError(err?.message || "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, loading, error, refetch: fetchDashboardData };
}
