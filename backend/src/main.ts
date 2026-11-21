import 'reflect-metadata';
import { createApp } from './bootstrap/app.js';
import { runMigrations } from './bootstrap/migrate.js';
import { APP_ROLES, type AppConfig, type AppRole, loadDotEnv, loadProcessConfig } from './config/config.js';

// یک image، چند نقش (docs/backend/01 ۲): `node dist/main.js [api|worker|all|migrate]`.
const env = loadDotEnv();
// فقط نام پروفایل و فایل‌ها، هرگز مقدار (07 ۱۰)
process.stdout.write(`env profile: ${env.profile} (${env.files.join(', ') || 'no env file'})
`);
const base = loadProcessConfig();
const argRole = process.argv[2];
if (argRole !== undefined && !(APP_ROLES as readonly string[]).includes(argRole)) throw new Error(`نقش ${argRole} شناخته نیست`);
const role = (argRole as AppRole | undefined) ?? base.role;
// نقش خط فرمان بر APP_ROLE برنده است تا Jobs بداند کارگر اجرا کند یا فقط بفرستد
const config: AppConfig = { ...base, role };

if (role === 'migrate') {
  const applied = await runMigrations(config);
  process.stdout.write(applied.length ? `migrations applied: ${applied.join(', ')}\n` : 'database is up to date\n');
} else if (role === 'api' || role === 'all') {
  const app = await createApp(config);
  await app.listen(config.port);
} else if (role === 'worker') {
  // همان اپ بی‌گوش‌دادن HTTP: کارگرهای صف و زمان‌بند (08؛ Jobs نقش را از پیکربندی می‌خواند)
  const app = await createApp(config);
  await app.init();
}
