import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      document.documentElement.classList.toggle("maamara-compact-workspace", preferences.compactMode);
    }
  }, [preferences]);

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

  const value = useMemo(
    () => ({ preferences, updatePreference, resetPreferences }),
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
