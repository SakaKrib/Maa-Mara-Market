import { useEffect, useState, useRef } from "react";
import api from "../../../../src/Services/Api"; 
import { useAuth } from "../../Auth/AuthContext/Context";

export const useVendorActivityLogs = () => {
  const { user } = useAuth();
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);   // show loading only first time
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  // First full fetch (shows loading)
  const initialFetch = async () => {
    if (!user) return;

    try {
      const response = await api.get("/api/activity-logs/", {
        withCredentials: true,
      });

      const vendorLogs = (response.data || []).filter((log) => {
        if (log.actor_role !== "vendor") return false;
        if (!log.user) return false;

        const logUserId =
          typeof log.user === "object" ? log.user.id : log.user;

        return logUserId === user.id;
      });

      setActivityLogs(vendorLogs);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch activity logs:", err);
      setError(err);
    } finally {
      setLoading(false); // only first time
    }
  };

  // Silent background refresh (no loading state)
  const backgroundRefresh = async () => {
    if (!user) return;

    try {
      const response = await api.get("/api/activity-logs/", {
        withCredentials: true,
      });

      const vendorLogs = (response.data || []).filter((log) => {
        if (log.actor_role !== "vendor") return false;
        if (!log.user) return false;

        const logUserId =
          typeof log.user === "object" ? log.user.id : log.user;

        return logUserId === user.id;
      });

      setActivityLogs(vendorLogs); // silent update
    } catch (err) {
      console.error("Background update failed:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    // First fetch (shows spinner)
    initialFetch();

    // Background refresh every 60 seconds (no loading, no flashing)
    intervalRef.current = setInterval(backgroundRefresh, 60000);

    return () => clearInterval(intervalRef.current);
  }, [user]);

  return { activityLogs, loading, error };
};
