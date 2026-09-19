import axios from "axios";

const FALLBACK_API_ORIGIN = "http://100.109.224.0:8000";
const BACKEND_PORT = "8000";

const resolveApiOrigin = () => {
  const configured = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location.host) {
    const { protocol, hostname, host } = window.location;

    // If the browser is already on Django's port, preserve the exact host.
    if (host.endsWith(`:${BACKEND_PORT}`)) {
      return `${protocol}//${host}`;
    }

    // Otherwise keep the browser's hostname/protocol and switch to Django.
    // This works for localhost, LAN and Tailscale browser access.
    return `${protocol}//${hostname}:${BACKEND_PORT}`;
  }

  return FALLBACK_API_ORIGIN;
};

export const baseURL = resolveApiOrigin();

const api = axios.create({
  baseURL,
  withCredentials: true,
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

const redirectToLoginOnce = () => {
  if (
    typeof window !== "undefined" &&
    window.location.pathname !== "/login"
  ) {
    window.location.assign("/login");
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Network/CORS errors have no HTTP response. Refreshing cannot fix them.
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";

    // Never recursively refresh the refresh endpoint itself.
    if (requestUrl.includes("/api/token/refresh/")) {
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
      redirectToLoginOnce();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }
);

export default api;
