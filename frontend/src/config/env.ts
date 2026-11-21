import { z } from 'zod';

// اعتبارسنجی متغیرهای محیطی با Zod (مطابق frontend-react.md بخش ۳)
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  VITE_APP_NAME: z.string().default('پروژه‌یار'),
  VITE_NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('متغیرهای محیطی نامعتبر:', parsed.error.flatten().fieldErrors);
  throw new Error('خطا در پیکربندی محیط. فایل .env را بررسی کنید.');
}

export const env = parsed.data;
export const isProd = env.VITE_NODE_ENV === 'production';
export const isDev = env.VITE_NODE_ENV === 'development';
