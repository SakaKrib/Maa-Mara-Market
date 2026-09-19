export const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || (
  typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8000` : "http://127.0.0.1:8000"
);