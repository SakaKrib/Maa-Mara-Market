import axios from "axios";
import { Capacitor } from "@capacitor/core";

// Keep the API host in build configuration rather than hard-coding it here.
// Native builds must provide VITE_API_URL; website builds remain same-origin.
const configuredApiOrigin = (import.meta.env.VITE_API_URL || "").trim();

const normalizeOrigin = (value) => value.replace(/\/+$/, "");

const resolveApiOrigin = () => {
  if (configuredApiOrigin) {
    return normalizeOrigin(configuredApiOrigin);
  }

  if (typeof window === "undefined") {
    return "";
  }

  // Native apps must receive their backend origin from the build configuration.
  // Do not hard-code development or production hosts in shared application code.
  if (Capacitor.isNativePlatform()) {
    throw new Error(
      "VITE_API_URL is required for native builds. Set it in the build configuration."
    );
  }

  // Preserve same-origin website behavior. Vite proxies /api, /media and /ws
  // to Django during local website development.
  return `${window.location.protocol}//${window.location.host}`;
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
    // Resolve API-owned media against the configured API origin so bundled
    // mobile builds don't accidentally request media from their local origin.
    if (assetUrl.pathname.startsWith("/media/")) {
      const normalizedPath = assetUrl.pathname.replace(/^\/(?:media\/)+/i, "/media/");
      return new URL(
        `${normalizedPath}${assetUrl.search}${assetUrl.hash}`,
        `${apiOrigin.origin}/`
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


// Start Google OAuth with a CSRF-protected POST. Keep the origin and URL
// construction here so auth components do not duplicate API/base-URL logic.
export const startGoogleLogin = async () => {
  if (typeof document === "undefined" || !baseURL) {
    throw new Error("Google sign-in is not available in this environment.");
  }

  const { data } = await api.get("/api/get-csrf-token/");
  const csrfToken = data?.csrfToken;
  if (!csrfToken) {
    throw new Error("Unable to obtain a security token for Google sign-in.");
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${baseURL}/accounts/google/login/`;
  form.style.display = "none";

  const tokenInput = document.createElement("input");
  tokenInput.type = "hidden";
  tokenInput.name = "csrfmiddlewaretoken";
  tokenInput.value = csrfToken;
  form.appendChild(tokenInput);

  document.body.appendChild(form);
  form.submit();
};

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
