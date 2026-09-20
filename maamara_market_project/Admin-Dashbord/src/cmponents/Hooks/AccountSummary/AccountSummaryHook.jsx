import { useCallback, useEffect, useState } from "react";
import api, { getWebSocketUrl } from "../../../Services/Api";

export default function useDashboardData(selectedDate = "") {
  const [data, setData] = useState({
    accounts: {},
    summary: {},
    payments: {},
    monthly_summary: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);


  useEffect(() => {
    let socket;
    let reconnectTimer;
    let attempts = 0;
    let closed = false;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(getWebSocketUrl("/ws/admin/accounts/"));

      socket.onopen = () => { attempts = 0; };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "account.changed") fetchDashboardData(true);
        } catch (err) {
          console.error("Invalid accounts WebSocket message:", err);
        }
      };
      socket.onclose = (event) => {
        if (closed || event.code === 4403) return;
        const delay = Math.min(1000 * 2 ** attempts, 15000);
        attempts += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
      socket.onerror = () => socket.close();
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, [fetchDashboardData]);

  return { data, loading, error, refetch: fetchDashboardData };
}
