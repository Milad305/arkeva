import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SwaggerModule } from '@nestjs/swagger';
import { createApp, openApiConfig } from '../bootstrap/app.js';
import { loadDotEnv, loadProcessConfig } from '../config/config.js';

// سند OpenAPI را بی بالا آوردن سرور در `backend/openapi.json` می‌نویسد (06 ۹). فایل در مخزن می‌ماند و تست قرارداد
// (`contract.int.test.ts`) ناهمخوانی آن با کد را رد می‌کند. پیکربندی از env پروفایل؛ اپ init نمی‌شود (نه صف، نه تیک).

export const OPENAPI_FILE = join(fileURLToPath(new URL('../../', import.meta.url)), 'openapi.json');

/** JSON پایدار: کلیدها به ترتیب الفبا تا تفاوت فقط تغییر واقعی باشد. */
export function stableJson(value: unknown): string {
  const sort = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(sort);
    if (input === null || typeof input !== 'object') return input;
    return Object.fromEntries(
      Object.keys(input)
        .sort()
        .map((key) => [key, sort((input as Record<string, unknown>)[key])]),
    );
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

async function main(): Promise<void> {
  loadDotEnv();
  const app = await createApp(loadProcessConfig(), { logs: false });
  try {
    const document = SwaggerModule.createDocument(app, openApiConfig());
    await writeFile(OPENAPI_FILE, stableJson(document));
    process.stdout.write(`openapi.json نوشته شد: ${Object.keys(document.paths).length} مسیر\n`);
  } finally {
    await app.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
