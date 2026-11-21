import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// تست یکپارچگی روی PostgreSQL واقعی (docs/backend/09 ۱). هر فایل پایگاه دادهٔ موقت خودش را
// از TEST_DB_ADMIN_URL می‌سازد؛ Docker لازم نیست (تصمیم 1405/08/21: PostgreSQL محلی).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { conditions: ['projeyar-source', 'module', 'node'] },
  ssr: { resolve: { conditions: ['projeyar-source', 'module', 'node'] } },
  test: {
    environment: 'node',
    // بستهٔ مشترک از منبع، نه dist کهنه (Vite شرط‌های SSR را جدا می‌خواهد و فقط ماژول inline را از منبع می‌خواند)
    server: { deps: { inline: [/packages[\/]shared/] } },
    include: ['test/integration/**/*.int.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
