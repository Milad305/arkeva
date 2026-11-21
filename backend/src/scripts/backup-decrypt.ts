import { readFile, writeFile } from 'node:fs/promises';
import { loadDotEnv, loadProcessConfig } from '../config/config.js';
import { openBackup } from '../modules/backups/index.js';

// بازگشایی نسخهٔ پشتیبان پروژه برای پشتیبانی (F20 ۱۲: بازیابی فقط پشتیبانی، نه از رابط). خروجی ZIP است: meta.json،
// data/<جدول>.jsonl و files.json (کلید و هش فایل‌ها در ذخیره‌سازی). بازگرداندن ردیف‌ها دستی و طبق docs/backend/10-operations.md ۷.
//
//   pnpm --filter @projeyar/backend run backup:decrypt -- <نسخه.pyb> <خروجی.zip> <orgId>

async function main(): Promise<void> {
  const [input, output, orgId] = process.argv.slice(2).filter((arg) => arg !== '--');
  if (!input || !output || !orgId) {
    process.stderr.write('کاربرد: backup:decrypt <نسخه.pyb> <خروجی.zip> <orgId>\n');
    process.exitCode = 2;
    return;
  }
  loadDotEnv();
  const config = loadProcessConfig();
  const plain = openBackup(await readFile(input), config.backup.keys, orgId);
  await writeFile(output, plain);
  process.stdout.write(`باز شد: ${output} (${plain.length} بایت)\n`);
}

await main();
