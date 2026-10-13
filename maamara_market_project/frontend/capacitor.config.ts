import type { CapacitorConfig } from "@capacitor/cli";

// Keep the web app bundled locally in production. Do not configure a remote
// server.url here: the website and native app should share source code, not
// depend on loading the entire app from a remote website.
const config: CapacitorConfig = {
  appId: "com.mamaramarket.app",
  appName: "Maa Mara Market",
  webDir: "dist",
  plugins: {
    StatusBar: {
      // Keep Android system icons visible over a light status-bar background.
      overlaysWebView: true,
      style: "DARK",
      backgroundColor: "#FFFFFFFF",
    },
  },
};

export default config;
