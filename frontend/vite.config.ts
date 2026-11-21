import { defaultClientConditions, defaultServerConditions, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // `@projeyar/shared` را از منبع TypeScript بخوان، نه از dist ساخته‌شده؛ بی‌نیاز از build در توسعه
    conditions: ['projeyar-source', ...defaultClientConditions],
  },
  ssr: {
    resolve: { conditions: ['projeyar-source', ...defaultServerConditions] },
  },
  server: {
    port: 5173,
    proxy: {
      // بک‌اند NestJS (docs/backend/06 ۲). هم‌مبدأ تا کوکی تازه‌سازی HttpOnly و SameSite=Strict کار کند.
      '/v1': { target: 'http://localhost:3000', changeOrigin: false },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // هر ماژول lazy-load می‌شود؛ vendorهای بزرگ جدا می‌مانند تا chunk اولیه سبک باشد
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
});
