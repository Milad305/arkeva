import { z } from 'zod';

// اعتبارسنجی متغیرهای محیطی با Zod (مطابق frontend-react.md بخش ۳)
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  VITE_APP_NAME: z.string().default('پروژه‌یار'),
  VITE_NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // اگر true، baseQuery هیچ fetch واقعی نمی‌کند و داده از transformResponse (mock) می‌آید.
  // برای فاز demo قبل از آماده‌شدن بک‌اند.
  VITE_USE_MOCK_API: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => {
      if (v === undefined) return true; // پیش‌فرض: mock تا وقتی بک‌اند آماده شود
      if (typeof v === 'boolean') return v;
      return v === 'true';
    }),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('متغیرهای محیطی نامعتبر:', parsed.error.flatten().fieldErrors);
  throw new Error('خطا در پیکربندی محیط. فایل .env را بررسی کنید.');
}

export const env = parsed.data;
export const isProd = env.VITE_NODE_ENV === 'production';
export const isDev = env.VITE_NODE_ENV === 'development';
