# استقرار سرور دمو (IP و HTTP)

> سرور: Ubuntu 24.04، حدود ۱ گیگابایت RAM و ۲ گیگابایت swap، IP `45.149.79.158`. مبنا: `docs/backend/10-operations.md`.
> **حالت فعلی: دمو با دادهٔ نمونه.** دادهٔ واقعی وارد نکنید (بخش «محدودیت‌های حالت دمو» را ببینید).

## ۱. تصویر کلی

```
مرورگر ──► nginx میزبان :80
             ├─ /         ← /opt/arkeva/landing     (لندینگ)
             ├─ /panel/   ← /opt/arkeva/frontend    (پنل React، ساخته‌شده با base=/panel/)
             └─ /v1/      ← 127.0.0.1:3000          (کانتینر backend، APP_ROLE=all)
                                  │ شبکهٔ داخلی db (بی اینترنت، بی پورت بیرونی)
                                  ▼
                             کانتینر postgres:17  ← /opt/arkeva/postgres/data
```

- **ساخت روی سرور انجام نمی‌شود.** GitHub Actions (`.github/workflows/build-images.yml`) با هر push به `main` دو image می‌سازد:
  `ghcr.io/milad305/arkeva-backend` و `ghcr.io/milad305/arkeva-web` (فایل‌های پنل و لندینگ). سرور فقط pull می‌کند.
- API باید زیر **`/v1/`** و هم‌مبدأ با پنل باشد، نه `/api/`: کوکی تازه‌سازی ورود فقط روی مسیر `/v1/auth` تنظیم می‌شود.
- api و worker یک فرایند‌اند (`APP_ROLE=all`) تا حافظه برسد. سقف حافظه: پستگرس ۲۵۶ و backend ۵۱۲ مگابایت.
- Chromium در image نیست، پس **خروجی PDF گزارش مدیریتی `failed` می‌شود.** بقیهٔ برنامه کار می‌کند.

| مسیر روی سرور | محتوا | مالک و دسترسی |
|---|---|---|
| `/opt/arkeva/repo` | مخزن (فقط برای فایل‌های `deploy/`) | arkeva |
| `/opt/arkeva/admin/postgres.env`، `db-admin.env` | رمز کاربر مدیر پستگرس | arkeva، 600 |
| `/opt/arkeva/backend/backend.env` | پیکربندی و رازهای بک‌اند | arkeva، 600 |
| `/opt/arkeva/backend/storage` | فایل‌های بارگذاری‌شده و پشتیبان پروژه‌ها | uid 1000 (کاربر node کانتینر) |
| `/opt/arkeva/postgres/data` | دادهٔ پستگرس | خود کانتینر |
| `/opt/arkeva/backups` | دامپ روزانهٔ پایگاه داده | arkeva، 700 |
| `/opt/arkeva/frontend`، `/opt/arkeva/landing` | فایل‌های ایستا (`deploy.sh` می‌ریزد) | arkeva |

## ۲. یک‌بار: آماده‌سازی

### ۲.۱ روی سیستم خودتان
1. تغییرها را commit و به `main` push کنید.
2. در GitHub، بخش Actions، اجرای `build-images` باید سبز شود (حدود ۵ دقیقه).
3. یک **Personal access token (classic)** فقط با دسترسی `read:packages` بسازید. سرور با آن image‌ها را می‌کشد.
   در هیچ فایلی از مخزن نگذاریدش.

### ۲.۲ روی سرور
همهٔ فرمان‌ها با کاربر `arkeva`، مگر آن‌هایی که `sudo` دارند.

```bash
# دسترسی به ghcr.io (باید 401 برگرداند، نه timeout یا 403)
curl -sI https://ghcr.io/v2/ | head -1

# arkeva بتواند docker اجرا کند (با کاربر sudo‌دار؛ بعد یک‌بار خروج و ورود دوباره)
sudo usermod -aG docker arkeva

# پوشه‌ها
sudo mkdir -p /opt/arkeva/{landing,backend/storage,postgres/data,backups}
sudo chown -R arkeva:arkeva /opt/arkeva/{admin,backend,backups,frontend,landing,repo}
sudo chown -R 1000:1000 /opt/arkeva/backend/storage
chmod 700 /opt/arkeva/admin /opt/arkeva/backups

# آخرین نسخهٔ فایل‌های استقرار
git -C /opt/arkeva/repo pull --ff-only
```

### ۲.۳ رازها
با این فرمان‌ها رازها ساخته و در فایل‌ها گذاشته می‌شوند. هیچ‌کدام روی صفحه چاپ نمی‌شود.

```bash
cd /opt/arkeva
PG=$(openssl rand -hex 24); OWNER=$(openssl rand -hex 24); APP=$(openssl rand -hex 24)
sed "s/CHANGE_ME_POSTGRES/$PG/" repo/deploy/env/postgres.env.example > admin/postgres.env
sed "s/CHANGE_ME_POSTGRES/$PG/" repo/deploy/env/db-admin.env.example > admin/db-admin.env
sed -e "s/CHANGE_ME_OWNER/$OWNER/" -e "s/CHANGE_ME_APP/$APP/" \
    -e "s/k1:CHANGE_ME_JWT_AT_LEAST_32_CHARS/k1:$(openssl rand -hex 32)/" \
    -e "s#k1:CHANGE_ME_BASE64_32_BYTES#k1:$(openssl rand -base64 32)#" \
    repo/deploy/env/backend.env.example > backend/backend.env
chmod 600 admin/*.env backend/backend.env
unset PG OWNER APP
grep -c CHANGE_ME admin/*.env backend/backend.env   # همه باید 0 باشند
```

**`BACKUP_KEYS` را از `backend/backend.env` بردارید و جدا از سرور نگه دارید** (مثلاً در مدیر رمز). بدون آن،
هیچ پشتیبان رمزشدهٔ پروژه باز نمی‌شود.

### ۲.۴ ورود به ghcr.io
```bash
docker login ghcr.io -u Milad305     # رمز = همان token با read:packages
```

### ۲.۵ پایگاه داده، نخستین بار
```bash
cd /opt/arkeva/repo
C="docker compose -f deploy/compose.yml"
$C pull backend postgres
$C up -d postgres
$C run --rm bootstrap    # نقش‌های projeyar_owner و projeyar_app و پایگاه دادهٔ projeyar
$C run --rm migrate      # ۲۸ migration با نقش مالک
$C run --rm seed         # فقط دمو: سازمان، کاربران و پروژه‌های نمونه
```

سه نقش جدا، مطابق `docs/backend/05` ۴.۳:
- `postgres`: سوپریوزر. فقط خود پستگرس و `bootstrap` از آن استفاده می‌کنند.
- `projeyar_owner`: مالک جدول‌ها، برای migration و seed.
- `projeyar_app`: نقش برنامه، `NOBYPASSRLS`. برنامهٔ در حال اجرا فقط با این وصل می‌شود.

### ۲.۶ انتشار نخست و nginx
```bash
bash /opt/arkeva/repo/deploy/deploy.sh

sudo cp /opt/arkeva/repo/deploy/nginx/arkeva-ip.conf /etc/nginx/sites-available/arkeva
sudo ln -sf /etc/nginx/sites-available/arkeva /etc/nginx/sites-enabled/arkeva
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl enable --now nginx && sudo systemctl reload nginx
```

### ۲.۷ آزمون
```bash
curl -s http://127.0.0.1:3000/ready              # {"status":"ready",...}
curl -sI http://45.149.79.158/panel/ | head -1   # 200
free -h && docker stats --no-stream
```

در مرورگر `http://45.149.79.158/panel/` را باز کنید. ورود با کاربر نمونه (رمز `Projeyar1404`) و کد `123456`.

### ۲.۸ پشتیبان روزانهٔ پایگاه داده
```bash
crontab -e
# این خط:
30 3 * * * /usr/bin/bash /opt/arkeva/repo/deploy/backup-db.sh >> /opt/arkeva/backups/backup.log 2>&1
```
دامپ‌ها ۱۴ روز روی همان سرور می‌مانند. اگر سرور از دست برود، این‌ها هم از دست می‌روند؛ گاهی یک نسخه را بیرون بکشید.

## ۳. به‌روزرسانی‌های بعدی
1. push به `main` و منتظر ماندن تا Actions سبز شود.
2. روی سرور: `bash /opt/arkeva/repo/deploy/deploy.sh`

`deploy.sh` به این ترتیب کار می‌کند: `git pull`، کشیدن image‌ها، `migrate`، بالا آوردن backend تازه، صبر تا `/ready`، و در آخر جایگزینی فایل‌های پنل و لندینگ.
اگر migration شکست بخورد، تراکنشی است و نسخهٔ قبلی همچنان سرویس می‌دهد.

**بازگشت به نسخهٔ قبل:** `bash deploy/deploy.sh <sha کامل commit قبلی>`. migrationها برنمی‌گردند،
چون طبق `docs/backend/05` ۶ گسترش‌دهنده‌اند و نسخهٔ قبلی با آن‌ها کار می‌کند.

**لاگ:** `docker compose -f /opt/arkeva/repo/deploy/compose.yml logs -f --tail 100 backend`

## ۴. محدودیت‌های حالت دمو
- `NODE_ENV=development`. فقط در این حالت seed، کد ثابت `OTP_DEV_CODE` و کوکی بی‌`Secure` روی HTTP مجازند.
- **هر کسی که رمز کاربران نمونه را بداند وارد می‌شود.** برای بستنش خط `OTP_DEV_CODE` را از `backend.env` حذف کنید و
  `docker compose ... up -d backend` بزنید. کد ورود از آن پس فقط در لاگ است: `logs backend | grep OTP`.
- ارائه‌دهندهٔ پیامک در حالت دمو پیش‌فرض `console` است؛ با تنظیم `SMS_PROVIDER=sms.ir` همراه `OTP_SMS_KEY`، `OTP_TEMPLATE_ID` و `OTP_TEMPLATE_PARAM` درگاه واقعی قالب OTP فعال می‌شود.
- Swagger خاموش است (`SWAGGER_ENABLED=false`).

## ۵. مرحلهٔ بعد: دامنه و HTTPS (production)
1. رکوردهای DNS از نوع A: `arkeva.ir`، `panel.arkeva.ir` و `api.arkeva.ir` به `45.149.79.158`.
2. ساخت پنل در ریشه: در Actions، `build-images` را دستی با `panel_base_path=/` اجرا کنید.
   پنل روی `panel.arkeva.ir` همچنان `/v1/` را هم‌مبدأ سرو می‌کند. `api.arkeva.ir` برای اپ موبایل است.
3. یک پیکربندی nginx جدا برای هر دامنه، سپس `sudo apt install certbot python3-certbot-nginx` و `sudo certbot --nginx`.
4. در `backend.env`: `COOKIE_SECURE=true` و `PUBLIC_BASE_URL=https://panel.arkeva.ir`.
5. برای `NODE_ENV=production` باید `SMS_PROVIDER=sms.ir` (با `OTP_SMS_KEY` و `OTP_TEMPLATE_ID`) تنظیم شود و دو کار باز در کد هنوز تأیید طراحی می‌خواهند: **راه ساخت نخستین سازمان و مدیر** (seed در production اجرا نمی‌شود) و **ارائه‌دهندهٔ ایمیل واقعی / خط پیامک متنی غیراُتی‌پی**.
