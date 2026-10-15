import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import MessagingLauncher from "../Messaging/MessagingLauncher";
import { useAuth } from "../Auth/AuthContext/Context";
import { setupNativePushNotifications, unregisterNativePushDevice } from "../Notifications/nativePushNotifications";
import api from "../../Services/Api";

const STORAGE_KEYS = {
  admin: "maamara-admin-preferences",
  vendor: "maamara-vendor-preferences",
};
const POLL_INTERVAL = 15000;

export const preferenceDefaults = {
  notifications: true,
  compactMode: false,
  browserAlerts: true,
};

const AdminPreferencesContext = createContext(null);

const readStoredPreferences = (role = "admin") => {
  if (typeof window === "undefined") return preferenceDefaults;
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEYS[role] || STORAGE_KEYS.admin) || "{}"
    );
    return { ...preferenceDefaults, ...stored };
  } catch {
    return preferenceDefaults;
  }
};

const getNotificationResults = (data) => (
  Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
);

const getConversationResults = (data) => (
  Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
);

export const AdminPreferencesProvider = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [toastNotification, setToastNotification] = useState(null);
  const toastTimerRef = useRef(null);
  const workspaceRole = location.pathname.startsWith("/vendors-dashboard") ? "vendor" : "admin";
  const [preferences, setPreferences] = useState(() => readStoredPreferences(workspaceRole));
  const notificationStateRef = useRef({
    initialized: false,
    notificationIds: new Set(),
    messageUnread: new Map(),
    supportPending: 0,
  });

  useEffect(() => {
    setPreferences(readStoredPreferences(workspaceRole));
  }, [workspaceRole]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(STORAGE_KEYS[workspaceRole], JSON.stringify(preferences));

    const isWorkspace =
      location.pathname.startsWith("/admin-dashboard") ||
      location.pathname.startsWith("/vendors-dashboard");

    document.documentElement.classList.toggle(
      "maamara-compact-workspace",
      isWorkspace && preferences.compactMode
    );
  }, [preferences, location.pathname, workspaceRole]);

  useEffect(() => () => {
    document.documentElement.classList.remove("maamara-compact-workspace");
  }, []);

  const updatePreference = async (key, value) => {
    const isNativeApp =
      typeof window !== "undefined" &&
      window.Capacitor?.isNativePlatform?.() === true;

    if (
      key === "browserAlerts" &&
      isNativeApp
    ) {
      return;
    }

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

    if (key === "notifications" && typeof window !== "undefined") {
      window.localStorage.setItem("maamara-push-notifications-enabled", String(Boolean(value)));
      if (isNativeApp) {
        if (value && isAuthenticated) {
          void setupNativePushNotifications();
        } else if (!value) {
          await unregisterNativePushDevice();
        }
      }
    }

    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const resetPreferences = () => {
    setPreferences({ ...preferenceDefaults });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("maamara-push-notifications-enabled", "true");
      if (window.Capacitor?.isNativePlatform?.() === true && isAuthenticated) {
        void setupNativePushNotifications();
      }
    }
  };

  const notifyBrowser = useCallback((title, options = {}) => {
    if (
      !preferences.browserAlerts ||
      typeof window === "undefined" ||
      window.Capacitor?.isNativePlatform?.() === true ||
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
    const isVendorWorkspace = location.pathname.startsWith("/vendors-dashboard");

    let active = true;
    let polling = false;

    const pollAdminAlerts = async () => {
      if (!active || polling) return;
      polling = true;

      try {
        const [notificationResponse, conversationResponse, supportResponse] =
          await Promise.allSettled([
            api.get("/api/notifications/"),
            isAdminWorkspace
              ? api.get("/api/messaging/conversations/")
              : Promise.resolve({ data: [] }),
            isAdminWorkspace
              ? api.get("/api/support/status-counts/")
              : Promise.resolve({ data: { pending: 0 } }),
          ]);

        if (!active) return;

        const notifications =
          notificationResponse.status === "fulfilled"
            ? getNotificationResults(notificationResponse.value.data)
            : [];

        const conversations =
          conversationResponse.status === "fulfilled"
            ? getConversationResults(conversationResponse.value.data)
            : [];

        const supportPending =
          supportResponse.status === "fulfilled"
            ? Number(supportResponse.value.data?.pending ?? 0)
            : notificationStateRef.current.supportPending;

        const state = notificationStateRef.current;

        if (!state.initialized) {
          // Do not treat an unauthenticated 401 as an empty baseline; wait for
          // the first successful authenticated response before detecting new items.
          if (notificationResponse.status !== "fulfilled") return;
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

        const newNotifications = notifications
          .filter((item) => item.id != null && !state.notificationIds.has(item.id))
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        // Show an in-app toast for every signed-in role, independent of browser
        // notification permission and native-platform status.
        if (preferences.notifications && newNotifications.length > 0) {
          setToastNotification(newNotifications[0]);
          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
          toastTimerRef.current = window.setTimeout(() => setToastNotification(null), 10000);
        }

        if (preferences.browserAlerts) {
          newNotifications
            .slice(0, 5)
            .forEach((item) => {
              notifyBrowser(item.title || item.display_title || "Maa Mara Market", {
                body: item.display_message || item.message || (
                  isVendorWorkspace
                    ? "You have a new vendor notification."
                    : isAdminWorkspace
                      ? "You have a new admin notification."
                      : "You have a new marketplace update."
                ),
                tag: `maamara-notification-${item.id}`,
              });
            });

          conversations.forEach((conversation) => {
            const unread = Number(conversation.unread_count || 0);
            const previousUnread = state.messageUnread.get(conversation.id) ?? 0;

            if (unread > previousUnread) {
              const latest = conversation.last_message;
              const sender =
                latest?.sender?.name ||
                latest?.sender?.username ||
                "New message";

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
  }, [location.pathname, preferences.browserAlerts, preferences.notifications, notifyBrowser]);

  const value = useMemo(
    () => ({ preferences, updatePreference, resetPreferences, notifyBrowser }),
    [preferences, notifyBrowser]
  );

  const openToastNotification = useCallback(async () => {
    const notification = toastNotification;
    if (!notification) return;
    setToastNotification(null);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    try {
      await api.post(`/api/notifications/${notification.id}/mark_seen/`, {}, { withCredentials: true });
    } catch {
      // Navigation should still work if marking the notification read fails.
    }
    const target = notification.url || (
      location.pathname.startsWith("/vendors-dashboard")
        ? "/vendors-dashboard"
        : location.pathname.startsWith("/admin-dashboard")
          ? "/admin-dashboard"
          : "/"
    );
    navigate(target);
  }, [toastNotification, location.pathname, navigate]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  return (
    <AdminPreferencesContext.Provider value={value}>
      {children}
      <MessagingLauncher />
      {toastNotification && preferences.notifications && (
        <div className="fixed right-4 top-4 z-[2500] w-[min(390px,calc(100vw-2rem))]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
            <div className="flex items-start gap-3 p-4">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700" aria-hidden="true">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </span>
              <button type="button" onClick={openToastNotification} className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-bold">
                  {toastNotification.display_title || toastNotification.title || "Maa Mara Market update"}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">
                  {toastNotification.display_message || toastNotification.message || "You have a new update."}
                </span>
                <span className="mt-2 block text-xs font-semibold text-blue-700">Open update</span>
              </button>
              <button type="button" onClick={() => setToastNotification(null)} className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Dismiss notification">×</button>
            </div>
          </div>
        </div>
      )}
    </AdminPreferencesContext.Provider>
  );
};

export const useAdminPreferences = () => {
  const context = useContext(AdminPreferencesContext);
  if (!context) {
    throw new Error("useAdminPreferences must be used within AdminPreferencesProvider");
  }
  return context;
};
