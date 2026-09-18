import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // or vue/svelte/etc
import path from "path";
//import { baseUrl } from './src/cmponents/Constant/Constant';

export default defineConfig({
  base: "/static/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: '192.168.8.106', // This sets the frontend to use 127.0.0.1
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.8.106:8000', // your backend server
        changeOrigin: true,
      }
    }
  }
});

