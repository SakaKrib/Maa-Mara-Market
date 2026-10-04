// src/hooks/useNotifications.js
import { useEffect, useState } from "react";
import api from "../../../Services/Api";

export const useUserExtras = () => {
    const [notifications, setNotifications] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loadingExtras, setLoadingExtras] = useState(true);
  
    useEffect(() => {
      const fetchExtras = async () => {
        try {
          const [notifRes, actRes] = await Promise.all([
            api.get("/api/user-visitor-notifications/", { withCredentials: true }),
            api.get("/api/user-visitor-activity/", { withCredentials: true }),
          ]);
  
          setNotifications(notifRes.data.results || []);
          setActivities(actRes.data.results || []);
        } catch (error) {
          console.error("❌ Error fetching notifications or activities:", error);
        } finally {
          setLoadingExtras(false);
        }
      };
  
      fetchExtras();
    }, []);
  
    const markNotificationRead = async (notificationId) => {
      await api.post(
        "/api/notifications/" + notificationId + "/mark_seen/",
        {},
        { withCredentials: true }
      );
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, seen: true, is_read: true }
            : notification
        )
      );
    };

    return { notifications, activities, loadingExtras, markNotificationRead };
  };
