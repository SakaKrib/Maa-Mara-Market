// src/components/Auth/AuthContext/Context.js
"use client";
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

let accessTokenRef = null;

export const setGlobalAccessToken = token => {
  accessTokenRef = token;
};

export const getGlobalAccessToken = () => accessTokenRef;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const baseURL = 'http://127.0.0.1:8000';

  const checkAuth = async (retry = 1) => {
    try {
      const response = await fetch(`${baseURL}/api/check-auth/`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      setIsAuthenticated(data.isAuthenticated);
      setUser(data.user || null);

      if (data.access) {
        setAccessToken(data.access);
        setGlobalAccessToken(data.access);
      }

      // ✅ Only redirect authenticated admins/vendors
      // if (data.isAuthenticated && data.user?.role) {
      //   const role = data.user.role;
      //   if (role === 'admin' && window.location.pathname === '/') {
      //     navigate('/dashboard', { replace: true });
      //   } else if (role === 'vendor' && window.location.pathname === '/') {
      //     navigate('/vendors-dashboard', { replace: true });
      //   }
      // }

    } catch (error) {
      console.error("❌ Auth check failed:", error);
      if (retry > 0) await checkAuth(retry - 1);
      else {
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
      const response = await fetch(`${baseURL}/api/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(false);
        setUser(null);
        setAccessToken(null);
        setGlobalAccessToken(null);
      }
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
