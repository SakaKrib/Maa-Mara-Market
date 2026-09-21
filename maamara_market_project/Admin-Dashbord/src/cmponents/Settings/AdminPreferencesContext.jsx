import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "maamara-admin-preferences";

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

export const AdminPreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(readStoredPreferences);
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      const isAdminWorkspace = location.pathname.startsWith("/admin-dashboard");
      document.documentElement.classList.toggle("maamara-compact-workspace", isAdminWorkspace && preferences.compactMode);
    }
  }, [preferences, location.pathname]);

  const updatePreference = async (key, value) => {
    if (key === "browserAlerts" && value && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
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

  const notifyBrowser = (title, options = {}) => {
    if (!preferences.browserAlerts || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    try { new Notification(title, options); } catch { /* Browser notifications may be unavailable. */ }
  };

  const value = useMemo(
    () => ({ preferences, updatePreference, resetPreferences, notifyBrowser }),
    [preferences]
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
