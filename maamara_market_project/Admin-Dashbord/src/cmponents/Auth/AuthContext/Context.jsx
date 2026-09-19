// src/components/Auth/AuthContext/Context.jsx
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

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The central Axios client owns JWT refresh. A 401 from check-auth is
  // therefore retried by Api.jsx after the HttpOnly refresh cookie succeeds.
  const checkAuth = async () => {
    try {
      const response = await api.get("/api/check-auth/");
      const data = response.data;

      setIsAuthenticated(Boolean(data.isAuthenticated));
      setUser(data.user ?? null);
      return data;
    } catch (error) {
      console.error("Auth check failed:", error);
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
    setUser(userData ?? null);
  };

  const logout = async () => {
    try {
      await api.post("/api/logout/");
    } catch (error) {
      // The backend owns the cookies. Even if the request fails, clear local
      // React state so the UI cannot continue to present a logged-in session.
      console.error("Logout failed:", error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = "/";
    }
  };

  const value = useMemo(
    () => ({
      loading,
      isAuthenticated,
      user,
      login,
      logout,
      refreshAuth,
    }),
    [loading, isAuthenticated, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
