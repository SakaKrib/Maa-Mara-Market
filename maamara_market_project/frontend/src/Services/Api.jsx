import axios from "axios";
import { Capacitor } from "@capacitor/core";

// Keep the API host in build configuration rather than hard-coding it here.
// Native builds must provide VITE_API_URL; website builds remain same-origin.
const configuredApiOrigin = (import.meta.env.VITE_API_URL || "").trim();

const normalizeOrigin = (value) => value.replace(/\/+$/, "");

const resolveApiOrigin = () => {
  if (typeof window === "undefined") {
    return configuredApiOrigin ? normalizeOrigin(configuredApiOrigin) : "";
  }

  const isNative = Capacitor.isNativePlatform();

  // Native builds use their explicitly configured backend URL unchanged.
  // The browser deployment, however, is mounted below /maamara on a shared
  // hostname. Even if VITE_API_URL contains only the hostname, API requests
  // must retain Vite's public base path rather than escaping to /api at root.
  if (configuredApiOrigin) {
    const configuredUrl = new URL(configuredApiOrigin, window.location.origin);

    if (!isNative) {
      const publicBasePath = import.meta.env.BASE_URL || "/";
      if (publicBasePath.startsWith("/") && publicBasePath !== "/") {
        const normalizedBasePath = publicBasePath.replace(/\/+$/, "");
        const configuredPath = configuredUrl.pathname.replace(/\/+$/, "");
        if (!configuredPath || configuredPath === "/") {
          configuredUrl.pathname = normalizedBasePath;
        }
      }
    }

    return normalizeOrigin(configuredUrl.toString());
  }

  // Native apps must receive a backend origin from build configuration.
  if (isNative) {
    throw new Error(
      "VITE_API_URL is required for native builds. Set it in the build configuration."
    );
  }

  // Vite BASE_URL is /maamara/ for the shared-hostname website and /
  // for a standalone root deployment.
  const publicBaseUrl = import.meta.env.BASE_URL || "/";
  return normalizeOrigin(new URL(publicBaseUrl, window.location.origin).toString());
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
    const apiBasePath = apiOrigin.pathname.replace(/\/+$/, "");
    const assetUrl = new URL(rawValue, `${apiOrigin.origin}${apiBasePath}/`);

    // Preserve MaaMara's public path namespace for root-relative Django media.
    // This prevents media requests from falling through to Saka Krib.
    const alreadyPrefixedMedia = apiBasePath && assetUrl.pathname.startsWith(`${apiBasePath}/media/`);
    if (assetUrl.pathname.startsWith("/media/") || alreadyPrefixedMedia) {
      const mediaPath = alreadyPrefixedMedia
        ? assetUrl.pathname.slice(apiBasePath.length)
        : assetUrl.pathname;
      const normalizedPath = mediaPath.replace(/^\/(?:media\/)+/i, "/media/");
      return new URL(
        `${apiBasePath}${normalizedPath}${assetUrl.search}${assetUrl.hash}`,
        apiOrigin.origin
      ).toString();
    }

    return assetUrl.toString();
  } catch {
    return rawValue;
  }
};

const api = axios.create({ baseURL, withCredentials: true });

// Visitor identity is held in memory from /api/vistor-token/ so native WebViews
// can pass it explicitly to visitor-aware endpoints when cross-site cookies are
// withheld by the platform. It is never persisted in browser storage.
let visitorIdentity = "";
export const setVisitorIdentity = (value) => {
  visitorIdentity = typeof value === "string" ? value : "";
};
export const getVisitorIdentity = () => visitorIdentity;

let analyticsVisitorIdentity = "";
const ANALYTICS_VISITOR_STORAGE_KEY = "maaMaraAnalyticsVisitorIdentity";
const ANALYTICS_VISITOR_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const createAnalyticsVisitorId = () => (
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export const resolveAnalyticsVisitorIdentity = (serverIssuedId = "") => {
  // The persisted analytics ID is the long-lived browser identity. The server
  // visitor cookie can be recreated after logout, so it must not overwrite an
  // existing, unexpired analytics ID and split one browser into new visitors.
  let identity = "";

  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(window.localStorage.getItem(ANALYTICS_VISITOR_STORAGE_KEY) || "null");
      if (stored?.id && Number(stored.expiresAt) > Date.now()) {
        identity = String(stored.id);
      }
    } catch {
      // Replace malformed or unavailable storage entries below.
    }
  }

  if (!identity && typeof serverIssuedId === "string") {
    identity = serverIssuedId.trim();
  }
  if (!identity) identity = createAnalyticsVisitorId();
  analyticsVisitorIdentity = identity;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        ANALYTICS_VISITOR_STORAGE_KEY,
        JSON.stringify({ id: identity, expiresAt: Date.now() + ANALYTICS_VISITOR_MAX_AGE })
      );
    } catch {
      // In-memory tracking remains available when browser storage is blocked.
    }
  }
  return identity;
};

export const getAnalyticsVisitorIdentity = () => analyticsVisitorIdentity;

api.interceptors.request.use((config) => {
  const url = String(config.url || "");
  const method = String(config.method || "get").toLowerCase();

  if (visitorIdentity && /\/api\/(user-visitor-notifications|user-visitor-activity)\/?$/.test(url)) {
    config.params = { ...(config.params || {}), visitor_id: visitorIdentity };
  }

  // Keep guest cart requests attached to the server-issued visitor identity
  // in native WebViews where cross-origin cookies may not be available.
  if (visitorIdentity && /\/api\/cart(?:\/|$)/.test(url)) {
    if (method === "get") {
      config.params = { ...(config.params || {}), visitor_id: visitorIdentity };
    } else if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (!config.data.has("visitor_id")) config.data.append("visitor_id", visitorIdentity);
    } else if (config.data && typeof config.data === "object" && !Array.isArray(config.data)) {
      config.data = { ...config.data, visitor_id: config.data.visitor_id || visitorIdentity };
    } else if (config.data == null) {
      config.data = { visitor_id: visitorIdentity };
    }
  }

  return config;
});


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
      requestUrl.includes("/api/google/login/") ||
      requestUrl.includes("/api/apple/login/") ||
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
