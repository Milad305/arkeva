---
name: projeyar-deploy
description: >-
  Handles Docker image builds, subpath frontend configuration (/panel/), PostgreSQL 3-role RLS setup, zero-downtime deployment scripts, and encrypted backup decryption for Projeyar in deploy/. Use when modifying Dockerfiles, CI workflows, nginx configs, subpath routing, or server operations.
---

# Projeyar Deployment & Server Operations (`deploy/`)

این مهارت قواعد عملیاتی استقرار پروژه‌یار بر اساس [`deploy/README.md`](../../../deploy/README.md)، [`docs/backend/10-operations.md`](../../../docs/backend/10-operations.md) و `.github/workflows/build-images.yml` را پوشش می‌دهد.

## ۱. معماری استقرار سرور دمو و پروداکشن

```text
nginx میزبان
 ├─ /         ──► /opt/arkeva/landing   (لندینگ ایستا)
 ├─ /panel/   ──► /opt/arkeva/frontend  (پنل React ساخته‌شده با VITE_BASE_PATH=/panel/)
 └─ /v1/      ──► 127.0.0.1:3000        (کانتینر backend با APP_ROLE=all؛ هم‌مبدأ با پنل)
                        │
                        ▼ شبکهٔ داخلی ایزوله (بدون اینترنت و بدون پورت بیرونی)
                  postgres:17           (/opt/arkeva/postgres/data)
```

- **ساخت خارج از سرور:** سرور دمو منابع محدودی دارد (~1GB RAM)، بنابراین بیلد روی سرور انجام نمی‌شود؛ GitHub Actions با هر push به `main` دو ایمیج `ghcr.io/milad305/arkeva-backend` و `ghcr.io/milad305/arkeva-web` می‌سازد و `deploy/deploy.sh` فقط pull می‌کند.
- **الزام هم‌مبدأ بودن `/v1/`:** مسیر API باید دقیقاً `/v1/` روی همان دامنه/IP پنل باشد (نه `/api/`)، چون کوکی `HttpOnly` تازه‌سازی نشست روی مسیر `/v1/auth` محدود شده است.
- **قواعد زیرمسیر `/panel/` در فرانت‌اند:**
  - `VITE_BASE_PATH` فقط متغیر محیطی زمان build است (`deploy/web.Dockerfile`)، نه داخل فایل `.env`.
  - مسیریاب از `ROUTER_BASENAME` و ساخت لینک‌های کامل کپی/اشتراک فقط از `appLink(...)` در `frontend/src/shared/utils/appUrl.ts` استفاده می‌کنند.

---

## ۲. تفکیک سه‌گانهٔ نقش‌های PostgreSQL (حیاتی برای امنیت RLS)

| نقش دیتابیس | کاربرد | ویژگی امنیتی |
|---|---|---|
| `postgres` | سوپریوزر | فقط برای اجرای یک‌بارهٔ `db:bootstrap`؛ هرگز در برنامه استفاده نمی‌شود. |
| `projeyar_owner` | مالک جداول و schemaی `pgboss` | فقط در زمان اجرای `db:migrate` و `db:seed` (`DB_MIGRATION_URL`). |
| `projeyar_app` | نقش اجرای برنامه (`DB_URL`) | دارای `NOBYPASSRLS` و غیرمالک جداول. سرویس `RlsRoleCheck` در بالا آمدن بک‌اند بررسی می‌کند که اگر `DB_URL` سوپریوزر، مالک جدول یا `BYPASSRLS` باشد، برنامه متوقف شود تا RLS هرگز بی‌صدا خاموش نماند. |

---

## ۳. فرمان‌های عملیاتی و پشتیبان

- **انتشار نسخهٔ جدید روی سرور:**
  ```bash
  bash /opt/arkeva/repo/deploy/deploy.sh [optional-commit-sha]
  ```
  ترتیب اجرا: `git pull` ← دریافت ایمیج‌ها ← اجرای تراکنشی `migrate` ← بالا آوردن `backend` و انتظار تا سبز شدن `http://127.0.0.1:3000/ready` ← جایگزینی فایل‌های ایستای پنل و لندینگ. (Migrationها باید همیشه گسترش‌دهنده/سازگار به عقب باشند.)
- **رمزگشایی نسخهٔ پشتیبان پروژه (`.pyb`، مخصوص پشتیبانی):**
  ```bash
  pnpm --filter @projeyar/backend run backup:decrypt -- <input.pyb> <output.zip> <orgId>
  ```
- **وضعیت `NODE_ENV=production`:**
  1. درگاه پیامک `sms.ir` برای OTP و مسیر خودخدمت ثبت‌نام سازمان جدید (`/register`) پیاده‌سازی شده‌اند (جایگزین `db:seed` در محیط عملیاتی).
  2. ارائه‌دهندهٔ ایمیل هنوز `console` است و در صورت نیاز به ارسال واقعی ایمیل باید پیکربندی شود.
