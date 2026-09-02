import path from 'path';

import react from '@vitejs/plugin-react';

import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  preview: {
    host: '0.0.0.0',
    allowedHosts: ['queuesensehs.onrender.com'],
  },
});