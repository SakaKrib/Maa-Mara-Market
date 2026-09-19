import axios from "axios";

const FALLBACK_API_URL = "http://100.109.224.0:8000";

const resolveApiBaseURL = () => {
  if (typeof window === "undefined") {
    return FALLBACK_API_URL;
  }

  const configured = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  // If the browser is already serving the backend, preserve its exact host/port.
  if (window.location.port === "8000") {
    return window.location.origin;
  }

  // The frontend normally runs on Vite's port while Django runs on 8000.
  // Keep the browser's hostname (including a Tailscale host/IP) and switch
  // only to Django's API port.
  if (window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return FALLBACK_API_URL;
};

const baseURL = resolveApiBaseURL();

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// =====================
// REFRESH CONTROL STATE
// =====================
let isRefreshing = false;
let refreshPromise = null;
let failedQueue = [];

// =====================
// PROCESS QUEUE
// =====================
const processQueue = (error = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  failedQueue = [];
};

// =====================
// RESPONSE INTERCEPTOR
// =====================
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Network/CORS/DNS failures have no response. Do not attempt token
    // refresh for them because there is no evidence that authentication
    // caused the failure.
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    // Never refresh the refresh endpoint itself.
    if (originalRequest.url?.includes("/token/refresh/")) {
      return Promise.reject(error);
    }

    if (error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // If another request is already refreshing, wait for that same refresh
    // operation rather than issuing multiple refresh requests.
    if (isRefreshing && refreshPromise) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(originalRequest));
    }

    isRefreshing = true;

    refreshPromise = api.post(
      "/api/token/refresh/",
      {},
      { withCredentials: true }
    );

    try {
      await refreshPromise;
      processQueue();
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);

      // The API uses HttpOnly cookies, so the client cannot clear the JWT
      // itself. Returning the refresh error lets the auth context handle the
      // unauthenticated state without creating a redirect loop.
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }
);

export default api;
export { baseURL };
