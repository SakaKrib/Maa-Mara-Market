import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Vite is the frontend development server; serve the React app at "/".
  // Django owns "/static/" for backend static assets.
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/accounts": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/admin": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/media": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/static": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://backend:8000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
