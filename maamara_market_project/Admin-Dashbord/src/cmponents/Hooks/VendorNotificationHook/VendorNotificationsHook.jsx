import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../../src/Services/Api";

export function useVendorNotifications({ enabled = true } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const loadNotifications = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await api.get("/api/notifications/", {
        withCredentials: true,
      });

      const payload = response.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
          ? payload.results
          : [];

      if (!mountedRef.current) return;

      setNotifications(list);
      setUnseenCount(list.filter((notification) => !notification.seen).length);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      setNotifications([]);
      setUnseenCount(0);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 15000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [enabled, loadNotifications]);

  return { notifications, unseenCount, loading, error };
}
