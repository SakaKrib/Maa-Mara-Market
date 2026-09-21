import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../Services/Api";

const STORAGE_KEY = "maamara-admin-preferences";
const POLL_INTERVAL = 15000;

export const preferenceDefaults = {
  notifications: true,
  compactMode: false,
  browserAlerts: true,
};

const AdminPreferencesContext = createContext(null);

const readStoredPreferences = () => {
  if (typeof window === "undefined") return preferenceDefaults;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...preferenceDefaults, ...stored };
  } catch {
    return preferenceDefaults;
  }
};

const getNotificationResults = (data) => {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
};

const getConversationResults = (data) => (
  Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
);

export const AdminPreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(readStoredPreferences);
  const location = useLocation();
  const notificationStateRef = useRef({
    initialized: false,
    notificationIds: new Set(),
    messageUnread: new Map(),
    supportPending: 0,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      const isAdminWorkspace = location.pathname.startsWith("/admin-dashboard");
      document.documentElement.classList.toggle(
        "maamara-compact-workspace",
        isAdminWorkspace && preferences.compactMode
      );
    }
  }, [preferences, location.pathname]);

  const updatePreference = async (key, value) => {
    if (
      key === "browserAlerts" &&
      value &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "denied") value = false;
      } catch {
        value = false;
      }
    }
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const resetPreferences = () => setPreferences(preferenceDefaults);

  const notifyBrowser = useCallback((title, options = {}) => {
    if (
      !preferences.browserAlerts ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    try {
      new Notification(title, options);
    } catch {
      // Browser notifications may be unavailable.
    }
  }, [preferences.browserAlerts]);

  useEffect(() => {
    const isAdminWorkspace = location.pathname.startsWith("/admin-dashboard");
    if (!isAdminWorkspace) {
      notificationStateRef.current = {
        initialized: false,
        notificationIds: new Set(),
        messageUnread: new Map(),
        supportPending: 0,
      };
      return undefined;
    }

    let active = true;
    let polling = false;

    const pollAdminAlerts = async () => {
      if (!active || polling) return;
      polling = true;

      try {
        const [notificationResponse, conversationResponse, supportResponse] = await Promise.allSettled([
          api.get("/api/notifications/"),
          api.get("/api/messaging/conversations/"),
          api.get("/api/support/status-counts/"),
        ]);

        if (!active) return;

        const notifications = notificationResponse.status === "fulfilled"
          ? getNotificationResults(notificationResponse.value.data)
          : [];

        const conversations = conversationResponse.status === "fulfilled"
          ? getConversationResults(conversationResponse.value.data)
          : [];

        const supportPending = supportResponse.status === "fulfilled"
          ? Number(supportResponse.value.data?.pending ?? 0)
          : notificationStateRef.current.supportPending;

        const state = notificationStateRef.current;

        if (!state.initialized) {
          state.notificationIds = new Set(notifications.map((item) => item.id));
          state.messageUnread = new Map(
            conversations.map((conversation) => [
              conversation.id,
              Number(conversation.unread_count || 0),
            ])
          );
          state.supportPending = supportPending;
          state.initialized = true;
          return;
        }

        if (preferences.browserAlerts) {
          const newNotifications = notifications
            .filter((item) => item.id != null && !state.notificationIds.has(item.id))
            .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

          newNotifications.slice(0, 5).forEach((item) => {
            notifyBrowser(item.title || "Maa Mara Market", {
              body: item.message || "You have a new admin notification.",
              tag: `maamara-notification-${item.id}`,
            });
          });

          conversations.forEach((conversation) => {
            const unread = Number(conversation.unread_count || 0);
            const previousUnread = state.messageUnread.get(conversation.id) ?? 0;

            if (unread > previousUnread) {
              const latest = conversation.last_message;
              const sender = latest?.sender?.name || latest?.sender?.username || "New message";
              notifyBrowser(`New message from ${sender}`, {
                body: latest?.body || "You have a new message.",
                tag: `maamara-message-${conversation.id}`,
              });
            }
          });

          if (supportPending > state.supportPending) {
            const added = supportPending - state.supportPending;
            notifyBrowser("New support request", {
              body: `${added} new support request${added === 1 ? "" : "s"} waiting in the admin inbox.`,
              tag: "maamara-support-request",
            });
          }
        }

        state.notificationIds = new Set(notifications.map((item) => item.id));
        state.messageUnread = new Map(
          conversations.map((conversation) => [
            conversation.id,
            Number(conversation.unread_count || 0),
          ])
        );
        state.supportPending = supportPending;
      } catch (error) {
        console.error("Admin browser notification polling failed:", error);
      } finally {
        polling = false;
      }
    };

    pollAdminAlerts();
    const intervalId = window.setInterval(pollAdminAlerts, POLL_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [location.pathname, preferences.browserAlerts, notifyBrowser]);

  const value = useMemo(
    () => ({ preferences, updatePreference, resetPreferences, notifyBrowser }),
    [preferences, notifyBrowser]
  );

  return (
    <AdminPreferencesContext.Provider value={value}>
      {children}
    </AdminPreferencesContext.Provider>
  );
};

export const useAdminPreferences = () => {
  const context = useContext(AdminPreferencesContext);
  if (!context) throw new Error("useAdminPreferences must be used within AdminPreferencesProvider");
  return context;
};
