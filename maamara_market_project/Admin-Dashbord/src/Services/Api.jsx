import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "http://100.109.224.0:8000");

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Serialize concurrent refresh attempts so only one refresh request is sent.
let isRefreshing = false;
let refreshPromise = null;
let failedQueue = [];

const processQueue = (error = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    if (
      originalRequest.url?.includes("/api/token/refresh/") ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    if (error.response.status !== 401) {
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
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }
);

export default api;
