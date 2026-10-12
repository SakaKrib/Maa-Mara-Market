import type { CapacitorConfig } from "@capacitor/cli";

// Keep the web app bundled locally in production. Do not configure a remote
// server.url here: the website and native app should share source code, not
// depend on loading the entire app from a remote website.
const config: CapacitorConfig = {
  appId: "com.mamaramarket.app",
  appName: "Maa Mara Market",
  webDir: "dist",
};

export default config;
