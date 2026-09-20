import { useCallback, useEffect, useState } from "react";
import api, { getWebSocketUrl } from "../../../Services/Api";

export const useVendorPayoutHistory = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayouts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get("/api/vendor-payout-history/", {
        withCredentials: true,
      });
      setPayouts(Array.isArray(response.data) ? response.data : response.data?.results || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching payout history:", err);
      if (!silent) setError("Failed to fetch payouts");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts(false);
  }, [fetchPayouts]);

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let attempts = 0;
    let closed = false;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(getWebSocketUrl("/ws/admin/payouts/"));
      socket.onopen = () => { attempts = 0; };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "payout.changed") fetchPayouts(true);
        } catch (err) {
          console.error("Invalid payout WebSocket message:", err);
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
  }, [fetchPayouts]);

  return { payouts, loading, error, refetch: fetchPayouts };
};
