import { useCallback, useEffect, useState } from "react";
import api, { getWebSocketUrl } from "../../../Services/Api";

export const usePendingReturns = () => {
  const [returns, setReturns] = useState([]);
  const [data, setData] = useState({ results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReturns = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get("/api/returns/pending/", {
        withCredentials: true,
      });
      const payload = response.data || {};
      const list = Array.isArray(payload) ? payload : payload.results || [];

      setReturns(list);
      setData(Array.isArray(payload) ? { results: payload } : payload);
      setError(null);
    } catch (err) {
      console.error("Error fetching pending returns:", err);
      if (!silent) {
        setReturns([]);
        setData({ results: [] });
        setError(err?.response?.data || "Failed to fetch pending returns");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns(false);
  }, [fetchReturns]);

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let attempts = 0;
    let closed = false;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(getWebSocketUrl("/ws/admin/vendor-requests/"));

      socket.onopen = () => { attempts = 0; };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "vendor_request.changed" && message.resource === "return") {
            fetchReturns(true);
          }
        } catch (err) {
          console.error("Invalid return request WebSocket message:", err);
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
  }, [fetchReturns]);

  return { returns, loading, isLoading: loading, error, data, refetch: fetchReturns };
};
