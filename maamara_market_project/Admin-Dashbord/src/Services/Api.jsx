import axios from "axios";

const DEFAULT_API_ORIGIN = "http://100.109.224.0:8000";

const resolveBaseURL = () => {
  const configured = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");

  if (typeof window === "undefined") return DEFAULT_API_ORIGIN;

  // If the browser is directly serving the Django API, preserve the exact
  // browser origin, including its existing port.
  if (window.location.port === "8000") {
    return window.location.origin;
  }

  // Normal Vite development: keep the browser's host/IP but use Django's API port.
  // This works for localhost, LAN addresses, and Tailscale addresses.
  if (window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return DEFAULT_API_ORIGIN;
};

const baseURL = resolveBaseURL();

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let refreshPromise = null;
let failedQueue = [];

const processQueue = (error = null) => {
  const queue = failedQueue;
  failedQueue = [];

  queue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
};

const refreshTokens = () => {
  if (!refreshPromise) {
    refreshPromise = axios.post(
      `${baseURL}/api/token/refresh/`,
      {},
      {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Network/CORS errors have no response. Do not turn them into
    // authentication failures or redirect loops.
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const requestURL = originalRequest.url || "";
    if (requestURL.includes("/api/token/refresh/")) {
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

    try {
      await refreshTokens();
      processQueue();
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export { baseURL };
export default api;
