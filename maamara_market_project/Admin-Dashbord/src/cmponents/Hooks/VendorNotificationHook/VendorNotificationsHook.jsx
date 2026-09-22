import { useEffect, useRef, useState } from "react";

export function useVendorNotificationsWS() {
  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // ✅ FIX: ALWAYS point to Django backend, not frontend (5173)
  const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  // Use the same hostname as the frontend so HttpOnly auth cookies are sent.
  const WS_BASE = `${wsScheme}://${window.location.hostname}:8000`;

  const WS_URL = WS_BASE + "/ws/vendor-notifications/";

  const connect = () => {
    if (!mountedRef.current) return;

    console.log("🌐 Connecting WS:", WS_URL);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WS connected: vendor-notifications");
      reconnectAttempt.current = 0;
      setLoading(false);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "notifications_update") {
          const list = Array.isArray(data.notifications)
            ? data.notifications
            : [];

          setNotifications(list);
          setUnseenCount(list.filter((n) => !n.seen).length);
        }
      } catch (err) {
        setError(err);
      }
    };

    ws.onerror = () => {
      console.log("❌ WS error");
      setError(new Error("WebSocket error"));
    };

    ws.onclose = () => {
      console.log("🔌 WS closed");

      if (!mountedRef.current) return;

      wsRef.current = null;

      const delay = Math.min(
        1000 * 2 ** reconnectAttempt.current,
        15000
      );

      reconnectAttempt.current += 1;
      reconnectTimer.current = setTimeout(connect, delay);
    };
  };

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    console.log("[WS NOTIFICATIONS UPDATED]", notifications);
  }, [notifications]);

  return {
    notifications,
    unseenCount,
    loading,
    error,
  };
}