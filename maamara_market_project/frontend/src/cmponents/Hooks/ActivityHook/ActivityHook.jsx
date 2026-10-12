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

  const deletedIdsRef = useRef(new Set());

  // Filter defensively as the socket is shared by several activity producers.
  // The backend remains authoritative for role and ownership checks.
  const filterVendorLogs = useCallback(
    (logs = []) => {
      const currentUserId = user?.id ?? user?.pk;
      return logs.filter((log) => {
        if (deletedIdsRef.current.has(log.id)) return false;
        const actorType = log.actor_type || log.actor_role;
        const logUserId = typeof log.user === "object" ? log.user?.id : log.user;
        if (actorType !== "vendor") return false;
        return currentUserId == null || logUserId == null
          || String(logUserId) === String(currentUserId);
      });
    },
    [user]
  );

  const deleteActivity = useCallback(async (activityId) => {
    await api.delete(`/api/activity-logs-item/${activityId}/delete/`, {
      withCredentials: true,
    });
    deletedIdsRef.current.add(activityId);
    setActivityLogs((current) => current.filter((log) => log.id !== activityId));
  }, []);

  const clearAllActivities = useCallback(async () => {
    await api.delete("/api/activity-logs-item/clear-all-logs/", {
      withCredentials: true,
    });
    setActivityLogs((current) => {
      current.forEach((log) => deletedIdsRef.current.add(log.id));
      return [];
    });
  }, []);

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
    deleteActivity,
    clearAllActivities,
  };
};
