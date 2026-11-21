import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

/**
 * تست‌های واحد فرانت (ابزارها و هوک‌ها). معیارهای پذیرش (AC-xx-nn) در تست‌های بک‌اند‌اند (`CLAUDE.md` بخش ۶ بند ۴)؛
 * ماک‌ها و تست‌هایشان با برش ۲۰ کنار رفتند (1405/08/27).
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      restoreMocks: true,
    },
  }),
);
