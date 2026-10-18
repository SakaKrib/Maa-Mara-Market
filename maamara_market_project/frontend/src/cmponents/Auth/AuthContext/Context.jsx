"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "../../../Services/Api";
import { Capacitor } from "@capacitor/core";
import { unregisterNativePushDevice } from "../../Notifications/nativePushNotifications";

const AuthContext = createContext(null);
let authCheckPromise = null;

const requestAuthCheck = () => {
  if (!authCheckPromise) {
    authCheckPromise = api.get("/api/check-auth/").finally(() => {
      authCheckPromise = null;
    });
  }
  return authCheckPromise;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVisitor, setIsVisitor] = useState(false);
  const [authType, setAuthType] = useState("anonymous");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshAuthRef = useRef(null);

  const applyAuthResponse = (data) => {
    const visitor = data?.authType === "visitor";
    const authenticatedUser =
      Boolean(data?.isAuthenticated) &&
      !visitor &&
      Boolean(data?.user?.id);

    setIsVisitor(visitor);
    setAuthType(
      visitor
        ? "visitor"
        : authenticatedUser
          ? data?.authType || "user"
          : "anonymous"
    );
    setIsAuthenticated(authenticatedUser);
    setUser(authenticatedUser ? data.user : null);

    return data;
  };

  const checkAuth = async () => {
    try {
      const { data } = await requestAuthCheck();
      return applyAuthResponse(data);
    } catch (error) {
      // A network/server failure is not proof that the user's session ended.
      // Preserve the last known identity unless the server explicitly rejects it.
      if (error?.response?.status === 401) {
        setIsAuthenticated(false);
        setIsVisitor(false);
        setAuthType("anonymous");
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  const refreshAuth = async () => checkAuth();
  refreshAuthRef.current = refreshAuth;

  // Mobile WebViews can suspend networking while the screen is off. Re-check
  // the existing cookie session only when the app becomes visible again.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    let wasHidden = document.visibilityState === "hidden";
    let resumeTimer;

    const scheduleResumeCheck = () => {
      if (!wasHidden || document.visibilityState === "hidden") return;
      wasHidden = false;
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        void refreshAuthRef.current?.();
      }, 250);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
        return;
      }
      scheduleResumeCheck();
    };

    const handleBlur = () => {
      wasHidden = true;
    };
    const handleFocus = () => scheduleResumeCheck();
    const handlePageShow = () => scheduleResumeCheck();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.clearTimeout(resumeTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const login = (userData) => {
    setIsAuthenticated(Boolean(userData?.id));
    setIsVisitor(false);
    setAuthType("user");
    setUser(userData || null);
  };

  const logout = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await unregisterNativePushDevice();
      }
      await api.post("/api/logout/");
    } finally {
      setIsAuthenticated(false);
      setIsVisitor(false);
      setAuthType("anonymous");
      setUser(null);
      if (typeof window !== "undefined") window.location.assign("/customer-login");
    }
  };

  const value = useMemo(
    () => ({
      loading,
      isAuthenticated,
      isVisitor,
      authType,
      user,
      login,
      logout,
      refreshAuth,
    }),
    [loading, isAuthenticated, isVisitor, authType, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
