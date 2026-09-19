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

  const checkAuth = async () => {
    try {
      const { data } = await api.get("/api/check-auth/");

      setIsAuthenticated(Boolean(data.isAuthenticated));
      setUser(data.user || null);
      return data;
    } catch (error) {
      // A failed refresh is handled by Api.jsx. At this point the session
      // is genuinely unavailable, so reset local auth state.
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
