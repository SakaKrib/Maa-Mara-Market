import axios from "axios";

/*
 * Single API client for the entire frontend.
 *
 * Priority:
 * 1. Explicit VITE_API_URL / VITE_BASE_URL when deployed behind a known API.
 * 2. The browser's current host with Django's backend port in local/Tailscale use.
 * 3. The configured Tailscale backend as the final fallback.
 *
 * Do not hard-code the frontend origin here. Cookies are sent through the
 * shared Axios client and JWT refresh is handled centrally below.
 */
const FALLBACK_API_ORIGIN = "http://100.109.224.0:8000";
const BACKEND_PORT = "8000";

const getApiOrigin = () => {
  const configured = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location.host) {
    if (window.location.port === BACKEND_PORT) {
      return window.location.origin;
    }

    return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
  }

  return FALLBACK_API_ORIGIN;
};

export const baseURL = getApiOrigin();

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Serialize refresh requests. If several API calls receive 401 together,
// exactly one refresh request is sent and the others wait for it.
let isRefreshing = false;
let refreshPromise = null;
let failedQueue = [];

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Network/CORS/server-unreachable errors have no response. Do not try
    // token refresh repeatedly when the backend itself cannot be reached.
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    // Never refresh recursively.
    if (originalRequest.url?.includes("/api/token/refresh/")) {
      return Promise.reject(error);
    }

    if (error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(originalRequest));
    }

    isRefreshing = true;
    refreshPromise = axios.post(
      `${baseURL}/api/token/refresh/`,
      {},
      { withCredentials: true }
    );

    try {
      await refreshPromise;
      processQueue();
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }
);

export default api;
