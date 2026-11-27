import { defaultClientConditions, defaultServerConditions, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  // زیرمسیر استقرار (مثلاً /panel/ روی IP؛ deploy/web.Dockerfile). فقط متغیر محیطی هنگام build، نه فایل .env؛
  // پیش‌فرض ریشه. مسیریاب و پیوندها از BASE_URL می‌خوانند (src/shared/utils/appUrl.ts).
  base: process.env.VITE_BASE_PATH || '/',
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
  host: '127.0.0.1',
  port: 5173,
  proxy: {
    // NestJS Backend
    '/v1': {
      target: 'http://127.0.0.1:3000',
      changeOrigin: false,
    },
    '/api': {
      target: 'http://127.0.0.1:3000',
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
