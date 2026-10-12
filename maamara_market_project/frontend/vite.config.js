import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isMobileBuild = env.VITE_BUILD_TARGET === "mobile";

  return {
    // Website builds keep root-relative URLs. Native bundles use relative
    // asset paths because the app is served from the platform WebView.
    base: isMobileBuild ? "./" : "/",
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
        "/media": {
          target: "http://backend:8000",
          changeOrigin: true,
        },
        // Google OAuth endpoints run in Django as root-level URLs.
        "/accounts": {
          target: "http://backend:8000",
          changeOrigin: true,
        },
        "/google": {
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
  };
});
