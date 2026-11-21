import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// تست واحد: بدون پایگاه داده (docs/backend/09 ۱). SWC برای متادیتای دکوراتور Nest لازم است.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { conditions: ['projeyar-source', 'module', 'node'] },
  ssr: { resolve: { conditions: ['projeyar-source', 'module', 'node'] } },
  test: {
    environment: 'node',
    // بستهٔ مشترک از منبع، نه dist کهنه (Vite شرط‌های SSR را جدا می‌خواهد و فقط ماژول inline را از منبع می‌خواند)
    server: { deps: { inline: [/packages[\/]shared/] } },
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
});
