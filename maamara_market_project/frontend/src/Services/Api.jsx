import axios from "axios";

const FALLBACK_API_ORIGIN = "http://100.109.224.0:8000";

const resolveApiOrigin = () => {
  const configured = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return FALLBACK_API_ORIGIN;
};

export const baseURL = resolveApiOrigin();

export const getWebSocketUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return baseURL.replace(/^http/i, "ws") + normalizedPath;
};

export const resolveApiAssetUrl = (value) => {
  if (!value) return null;

  const rawValue = String(value).trim();
  if (!rawValue) return null;

  // Local/blob/data URLs are already browser-resolvable.
  if (/^(blob:|data:)/i.test(rawValue)) return rawValue;

  try {
    const apiOrigin = new URL(baseURL);
    const assetUrl = new URL(rawValue, `${apiOrigin.origin}/`);

    // Django can return absolute media URLs based on the request Host header.
    // On mobile that host can be localhost or an HTTP origin, which makes the
    // image unreachable or blocked as mixed content. Media owned by this API
    // should always use the same API origin that served the request.
    if (assetUrl.pathname.startsWith("/media/")) {
      return new URL(
        `${assetUrl.pathname}${assetUrl.search}${assetUrl.hash}`,
        `${apiOrigin.origin}/`
      ).toString();
    }

    return assetUrl.toString();
  } catch {
    return rawValue;
  }
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

    if (
      requestUrl.includes("/api/token/refresh/") ||
      requestUrl.includes("/api/login/") ||
      requestUrl.includes("/api/get-csrf-token/")
    ) {
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
