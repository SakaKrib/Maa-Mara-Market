import { useEffect, useState } from "react";
import api from "../../../Services/Api";

export default function useDashboardData() {
  const [data, setData] = useState({
    accounts: {},
    summary: {},
    payments: {},
    monthly_summary: [], // ✅ ADD THIS
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const res = await api.get("/api/dashboard/summary/");
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

    fetchDashboardData();
  }, []);

  return { data, loading, error };
}

