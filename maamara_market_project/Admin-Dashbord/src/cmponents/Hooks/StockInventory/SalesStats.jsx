import { useEffect, useState } from "react";
import api from "../../../Services/Api";

const useDashboardStats = () => {
  const [stats, setStats] = useState({
    total_sales: 0,
    total_orders: 0,
    completed_orders: 0,
    pending_orders: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // axios response
      const response = await api.get("/api/sales/stats/");

      // axios data
      const data = response.data;

      setStats({
        total_sales: data.total_sales || 0,
        total_orders: data.total_orders || 0,
        completed_orders: data.completed_orders || 0,
        pending_orders: data.pending_orders || 0,
      });

    } catch (err) {
      console.log(err);
      setError(err.message || "Failed to fetch dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
};

export default useDashboardStats;