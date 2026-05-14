import axios from "axios";

const baseURL = "http://127.0.0.1:8000";

// Create the Axios instance
const api = axios.create({
  baseURL,
  withCredentials: true, // ensures HttpOnly cookies (refresh token) are sent
});

// Track refresh state
let isRefreshing = false;
let failedQueue = [];

// Function to process queued requests after refresh attempt
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // ✅ Only handle 401 once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If a refresh is already in progress → queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (token) {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // ✅ Try refreshing token
        const refreshResponse = await axios.post(
          `${baseURL}/api/token/refresh/`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.access || null;

        // If we got a new access token, attach it
        // if (newAccessToken) {
        //   originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        // }

        if (newAccessToken) {
          api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // ✅ Distinguish between guest vs. logged-in user
        const wasLoggedIn = !!localStorage.getItem("user"); // or however you track auth
        if (wasLoggedIn) {
          console.error("🔒 Session expired. Redirecting to login.");
          window.location.href = "/login";
        } else {
          console.warn("Guest request hit 401, skipping refresh.");
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        
      }
    }

    return Promise.reject(error);
  }
);

export default api;
