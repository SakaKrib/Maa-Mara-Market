import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Buffer } from 'buffer'; // Import Buffer correctly

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'buffer',
      path: 'path-browserify', // Browser-compatible path module
    },
  },
  define: {
    global: {
      Buffer: Buffer, // Properly define Buffer
    },
  },
});

