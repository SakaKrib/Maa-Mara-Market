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
      // A network/server hiccup is not a logout: keep the current identity.
      // Only an explicit "not authenticated" answer (above) clears the user.
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  // Quietly re-verify (and renew) the session when the app/tab comes back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkAuth();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);



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
