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

  const checkAuth = async (retry = 1) => {
    try {
      const response = await api.get("/api/check-auth/");
      const data = response.data;

      setIsAuthenticated(Boolean(data.isAuthenticated));
      setUser(data.user ?? null);
    } catch (error) {
      console.error("Auth check failed:", error);

      if (retry > 0) {
        await checkAuth(retry - 1);
        return;
      }

      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const refreshAuth = async () => {
    setLoading(true);
    await checkAuth();
  };

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData ?? null);
  };

  const logout = async () => {
    try {
      await api.post("/api/logout/");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Backend owns the authentication cookies. React only mirrors state.
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
