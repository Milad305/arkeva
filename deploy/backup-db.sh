#!/usr/bin/env bash
# پشتیبان کامل پایگاه داده (docs/backend/10 ۷: سطح زیرساخت، جدا از پشتیبان پروژهٔ برنامه).
# روزانه با cron کاربر arkeva (deploy/README.md):
#   30 3 * * * /usr/bin/bash /opt/arkeva/repo/deploy/backup-db.sh >> /opt/arkeva/backups/backup.log 2>&1
# بازیابی فقط توسط مدیر سیستم و اول روی محیط آزمایشی: pg_restore -d projeyar <فایل>
set -euo pipefail

ARKEVA_HOME="${ARKEVA_HOME:-/opt/arkeva}"
KEEP_DAYS="${KEEP_DAYS:-14}"
target="$ARKEVA_HOME/backups/projeyar-$(date -u +%Y%m%dT%H%MZ).dump"

docker compose -f "$ARKEVA_HOME/repo/deploy/compose.yml" exec -T postgres \
  pg_dump -U postgres -d projeyar --format=custom --compress=6 > "$target.part"
mv "$target.part" "$target"
chmod 600 "$target"
find "$ARKEVA_HOME/backups" -name 'projeyar-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "$(date -u +%FT%TZ) ok $(du -h "$target" | cut -f1) $target"
