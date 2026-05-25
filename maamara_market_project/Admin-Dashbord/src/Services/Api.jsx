import axios from "axios";

const baseURL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL,
  withCredentials: true, // REQUIRED for cookies
});

// Track refresh state
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Queue requests while refreshing
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      isRefreshing = true;

      try {
        // Refresh cookies (NO token returned)
        await axios.post(
          `${baseURL}/api/token/refresh/`,
          {},
          { withCredentials: true }
        );

        processQueue();

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        // Clear session + redirect
        window.location.href = "/login";

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;