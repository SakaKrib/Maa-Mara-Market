import { useEffect, useState, useCallback } from "react";
import api from "../../../Services/Api"; // adjust to your actual path

export default function useItemActivityLogs(id) {
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Memoize fetchActivityLogs so effect dependencies work correctly
  const fetchActivityLogs = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`api/activity-logs-item/-item?item=${id}`, {
        withCredentials: true,
      });
      setActivityLogs(Array.isArray(res.data.results) ? res.data.results : []);
    } catch (err) {
      console.error("❌ Failed to fetch activity logs:", err);
      setActivityLogs([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const deleteSingleLog = useCallback(
    async (logId) => {
      try {
        await api.delete(`api/activity-logs-item/${logId}/delete/`, {
          withCredentials: true,
        });
        setActivityLogs((prev) => prev.filter((log) => log.id !== logId));
      } catch (err) {
        console.error("❌ Failed to delete log:", err);
      }
    },
    []
  );

  const clearItemLogs = useCallback(async () => {
    if (!id) return;
    try {
      await api.delete(`api/activity-logs-item/clear-item-logs/?item=${id}`, {
        withCredentials: true,
      });
      setActivityLogs([]);
    } catch (err) {
      console.error("❌ Failed to clear item logs:", err);
    }
  }, [id]);

  const clearAllLogs = useCallback(async () => {
    try {
      await api.delete(`api/activity-logs-item/clear-all-logs/`, {
        withCredentials: true,
      });
      setActivityLogs([]);
    } catch (err) {
      console.error("❌ Failed to clear all logs:", err);
    }
  }, []);

  // Fetch logs on mount and when item ID changes
  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  // Auto-refresh logs every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchActivityLogs, 300000);
    return () => clearInterval(interval);
  }, [fetchActivityLogs]);

  return {
    activityLogs,
    loading,
    fetchActivityLogs,
    deleteSingleLog,
    clearItemLogs,
    clearAllLogs,
  };
}
