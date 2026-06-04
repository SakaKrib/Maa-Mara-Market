import axios from "axios";

const baseURL = "http://127.0.0.1:8000";

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

    if (!error.response) {
      return Promise.reject(error);
    }

    // Ignore refresh endpoint itself (prevents loops)
    if (originalRequest.url?.includes("/token/refresh/")) {
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If refresh already running → queue request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      isRefreshing = true;

      // SINGLE refresh promise (CRITICAL FIX)
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

        // clear auth state
        window.location.href = "/login";

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  }
);

export default api;