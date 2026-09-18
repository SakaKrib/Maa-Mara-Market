import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

export default defineConfig({
  // Vite serves the React app at the site root during development.
  // Django keeps /static/ for backend static assets.
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
    watch: {
      // Docker bind mounts can miss native filesystem events on some hosts.
      // Polling keeps HMR reliable during local development.
      usePolling: true,
      interval: 300,
    },
    proxy: {
      "/api": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
    },
  },
});
