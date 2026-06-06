import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Buffer } from 'buffer';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'buffer',
      path: 'path-browserify',
    },
  },
  define: {
    global: {
      Buffer: Buffer,
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    hmr: {
      host: "127.0.0.1",
      port: 5173,
      protocol: "ws",
    }
  }
});
