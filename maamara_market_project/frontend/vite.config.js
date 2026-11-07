import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isMobileBuild = env.VITE_BUILD_TARGET === "mobile";
  const publicBasePath = env.VITE_PUBLIC_BASE_PATH || "/maamara/";

  return {
    // MaaMara website testing is mounted below /maamara on the shared hostname.
    // Native bundles remain relative because Capacitor serves them locally.
    base: isMobileBuild ? "./" : publicBasePath,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      // Allow the shared Tailscale hostname when MaaMara is served below /maamara.
      allowedHosts: [
        "opondo-thinkpad-t14-gen-1.tail34bca9.ts.net",
      ],
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
