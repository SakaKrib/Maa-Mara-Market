"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../../../Services/Api";

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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyAuthResponse = (data) => {
    const authenticated = Boolean(data?.isAuthenticated);
    setIsAuthenticated(authenticated);
    setUser(authenticated ? data?.user ?? null : null);
    return data;
  };

  const checkAuth = async () => {
    try {
      const { data } = await requestAuthCheck();
      return applyAuthResponse(data);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  const refreshAuth = async () => {
    setLoading(true);
    return checkAuth();
  };

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData || null);
  };

  const logout = async () => {
    try {
      await api.post("/api/logout/");
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      if (typeof window !== "undefined") window.location.assign("/");
    }
  };

  const value = useMemo(
    () => ({ loading, isAuthenticated, user, login, logout, refreshAuth }),
    [loading, isAuthenticated, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
