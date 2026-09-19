"use client";
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

let accessTokenRef = null;

export const setGlobalAccessToken = token => {
  accessTokenRef = token;
};

export const getGlobalAccessToken = () => accessTokenRef;

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || (
  typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : 'http://127.0.0.1:8000'
);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async (retry = 1) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/check-auth/`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Auth check failed with status ${response.status}`);
      }

      const data = await response.json();

      setIsAuthenticated(Boolean(data.isAuthenticated));
      setUser(data.user || null);

      if (data.access) {
        setAccessToken(data.access);
        setGlobalAccessToken(data.access);
      }

    } catch (error) {
      console.error("❌ Auth check failed:", error);
      if (retry > 0) {
        await checkAuth(retry - 1);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setAccessToken(null);
        setGlobalAccessToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    setGlobalAccessToken(accessToken);
  }, [accessToken]);

  const refreshAuth = async () => {
    setLoading(true);
    await checkAuth();
  };

  const logout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }

      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
      setGlobalAccessToken(null);
      window.location.href = '/customer-login';
    } catch (error) {
      console.error("❌ Logout error:", error);
    }
  };

  const login = (userData, token) => {
    setIsAuthenticated(true);
    setUser(userData);
    setAccessToken(token);
    setGlobalAccessToken(token);
  };

  const contextValue = useMemo(() => ({
    isAuthenticated,
    user,
    accessToken,
    setAccessToken,
    loading,
    logout,
    refreshAuth,
    login
  }), [isAuthenticated, user, accessToken, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
