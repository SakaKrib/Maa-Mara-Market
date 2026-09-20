import { useCallback, useEffect, useState } from "react";
import api from "../../../Services/Api";

export default function useDashboardData(selectedDate = "") {
  const [data, setData] = useState({
    accounts: {},
    summary: {},
    payments: {},
    monthly_summary: [], // ✅ ADD THIS
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
      try {
        setLoading(true);

        const params = selectedDate ? { date: selectedDate } : undefined;
        const res = await api.get("/api/dashboard/summary/", { params, withCredentials: true });
        const json = res.data;

        setData({
          accounts: json.accounts ?? {},
          summary: json.summary_cards ?? {},
          payments: json.payments_for_month ?? {},
          monthly_summary: json.monthly_summary ?? [], // ✅ ADD THIS
        });

        // console.log("Dashboard API data:", json);
        // console.log("Monthly summary:", json.monthly_summary);

      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

  }, [selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, loading, error, refetch: fetchDashboardData };
}

