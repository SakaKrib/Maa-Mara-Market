import { useEffect, useState, useRef, useCallback } from "react";
import api from "../../../../src/Services/Api";
import { useAuth } from "../../Auth/AuthContext/Context";

export const useVendorActivityLogs = ({ all = false } = {}) => {
  const { user } = useAuth();

  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  // The backend now applies the vendor-store scope. Keep customer,
  // vendor, and administrator activities tied to this vendor's items.
  // Do not filter by actor_role here because customer actions are valid
  // store activities (for example, a customer adding an item to a cart).
  const filterVendorLogs = useCallback(
    (logs = []) => logs,
    []
  );

  // -----------------------------
  // INITIAL FETCH
  // -----------------------------
  const initialFetch = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get(
        "/api/activity-logs/",
        {
          withCredentials: true,
          params: { scope: "vendor", ...(all ? { all: "true" } : {}) },
        }
      );

      const vendorLogs = filterVendorLogs(
        response.data || []
      );

      setActivityLogs(vendorLogs);
      setError(null);
    } catch (err) {
      console.error(
        "Failed to fetch activity logs:",
        err
      );
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, filterVendorLogs, all]);

  // -----------------------------
  // WEBSOCKET
  // -----------------------------
  const connectWebSocket = useCallback(() => {
    if (!user) return;

    const protocol =
      window.location.protocol === "https:"
      ? "wss"
      : "ws";

    const ws = new WebSocket(
      `${protocol}://${window.location.host}/ws/activity-logs/`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Activity WS connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (
          data.type !== "activity_logs_update"
        ) {
          return;
        }

        const incoming = filterVendorLogs(
          data.logs || []
        );

        setActivityLogs((prev) => {
          const merged = [
            ...incoming,
            ...prev,
          ];

          // remove duplicates
          const unique = merged.filter(
            (log, index, arr) =>
              index ===
              arr.findIndex(
                (l) => l.id === log.id
              )
          );

          return unique
            .sort(
              (a, b) =>
                new Date(b.timestamp) -
                new Date(a.timestamp)
            )
            .slice(0, all ? undefined : 100);
        });
      } catch (err) {
        console.error(
          "WS parse error:",
          err
        );
      }
    };

    ws.onclose = () => {
      console.log(
        "❌ Activity WS disconnected"
      );

      reconnectRef.current =
        setTimeout(() => {
          connectWebSocket();
        }, 3000);
    };

    ws.onerror = (err) => {
      console.error(
        "Activity WS error:",
        err
      );
      ws.close();
    };
  }, [user, filterVendorLogs, all]);

  // -----------------------------
  // LIFECYCLE
  // -----------------------------
  useEffect(() => {
    if (!user) return;

    initialFetch();
    connectWebSocket();

    return () => {
      clearTimeout(
        reconnectRef.current
      );

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [
    user,
    initialFetch,
    connectWebSocket,
  ]);

  return {
    activityLogs,
    loading,
    error,
  };
};
