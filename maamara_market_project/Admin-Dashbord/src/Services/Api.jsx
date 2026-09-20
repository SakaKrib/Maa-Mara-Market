import axios from "axios";

const FALLBACK_API_ORIGIN = "http://100.109.224.0:8000";

const resolveApiOrigin = () => {
  const configured =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BASE_URL ||
    FALLBACK_API_ORIGIN;

  return configured.replace(/\/$/, "");
};

export const baseURL = resolveApiOrigin();

export const getWebSocketUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return baseURL.replace(/^http/i, "ws") + normalizedPath;
};

export const resolveApiAssetUrl = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value, `${baseURL}/`).toString();
};

const api = axios.create({ baseURL, withCredentials: true });

let isRefreshing = false;
let refreshPromise = null;
let failedQueue = [];

const processQueue = (error = null) => {
  const queue = failedQueue;
  failedQueue = [];
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
};

const refreshAuthentication = () => {
  if (!refreshPromise) {
    refreshPromise = api.post("/api/token/refresh/");
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";

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

    try {
      await refreshAuthentication();
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
