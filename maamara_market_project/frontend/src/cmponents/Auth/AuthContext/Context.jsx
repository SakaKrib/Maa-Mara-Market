"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../../../Services/Api";
import { Capacitor } from "@capacitor/core";
import { setupNativePushNotifications, unregisterNativePushDevice } from "../../Notifications/nativePushNotifications";

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

  const applyAuthResponse = (data) => {
    const visitor = data?.authType === "visitor";
    const authenticatedUser =
      Boolean(data?.isAuthenticated) &&
      !visitor &&
      Boolean(data?.user?.id);

    setIsVisitor(visitor);
    setAuthType(visitor ? "visitor" : authenticatedUser ? (data?.authType || "user") : "anonymous");
    setIsAuthenticated(authenticatedUser);
    setUser(authenticatedUser ? data.user : null);

    return data;
  };

  const checkAuth = async () => {
    try {
      const { data } = await requestAuthCheck();
      return applyAuthResponse(data);
    } catch (error) {
      setIsAuthenticated(false);
      setIsVisitor(false);
      setAuthType("anonymous");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated || !user?.id || !Capacitor.isNativePlatform()) return undefined;
    let cleanup;
    let cancelled = false;
    setupNativePushNotifications().then((removeListeners) => {
      if (cancelled) {
        removeListeners?.();
      } else {
        cleanup = removeListeners;
      }
    }).catch((error) => {
      console.warn("Native push setup failed:", error);
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [loading, isAuthenticated, user?.id]);



  const refreshAuth = async () => {
    setLoading(true);
    return checkAuth();
  };

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
