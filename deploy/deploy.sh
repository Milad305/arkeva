#!/usr/bin/env bash
# انتشار یک نسخه روی سرور (deploy/README.md؛ docs/backend/10 ۸). با کاربر arkeva اجرا شود:
#   /opt/arkeva/repo/deploy/deploy.sh            ← آخرین ساخت شاخهٔ main
#   /opt/arkeva/repo/deploy/deploy.sh <sha>      ← نسخهٔ مشخص (بازگشت به نسخهٔ قبل هم همین است)
#
# ترتیب: git pull (فایل‌های استقرار) ← کشیدن image‌ها ← migrate با نقش مالک ← بالا آوردن backend تازه
# ← بررسی سلامت ← جایگزینی اتمی فایل‌های پنل و لندینگ. اگر migrate شکست بخورد، تراکنشی است و نسخهٔ قبل
# همچنان سرویس می‌دهد؛ اسکریپت همان‌جا می‌ایستد.
set -euo pipefail

TAG="${1:-main}"
export TAG
export ARKEVA_HOME="${ARKEVA_HOME:-/opt/arkeva}"
export REGISTRY="${REGISTRY:-ghcr.io/milad305}"
REPO="$ARKEVA_HOME/repo"
COMPOSE=(docker compose -f "$REPO/deploy/compose.yml")
WEB_IMAGE="$REGISTRY/arkeva-web:$TAG"

step() { printf '\n== %s\n' "$*"; }

step "به‌روزرسانی فایل‌های استقرار از GitHub"
git -C "$REPO" pull --ff-only

step "کشیدن image‌ها ($TAG)"
"${COMPOSE[@]}" pull backend
docker pull "$WEB_IMAGE"

step "پایگاه داده"
"${COMPOSE[@]}" up -d postgres
"${COMPOSE[@]}" run --rm migrate

step "بک‌اند"
"${COMPOSE[@]}" up -d backend
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/ready >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
if [[ "${ready:-0}" != 1 ]]; then
  echo "بک‌اند آماده نشد. لاگ: docker compose -f $REPO/deploy/compose.yml logs --tail 100 backend" >&2
  exit 1
fi

step "فایل‌های پنل و لندینگ"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"; docker rm -f arkeva-web-extract >/dev/null 2>&1 || true' EXIT
docker create --name arkeva-web-extract "$WEB_IMAGE" >/dev/null
docker cp arkeva-web-extract:/panel "$tmp/panel"
docker cp arkeva-web-extract:/landing "$tmp/landing"
for site in frontend:panel landing:landing; do
  target="$ARKEVA_HOME/${site%%:*}"
  rm -rf "$target.new" && mv "$tmp/${site##*:}" "$target.new"
  chmod -R a+rX "$target.new"
  # جایگزینی تقریباً اتمی: پوشهٔ قدیمی یک نسخه نگه داشته می‌شود
  rm -rf "$target.old"
  if [[ -d "$target" ]]; then mv "$target" "$target.old"; fi
  mv "$target.new" "$target"
done

step "پاک‌سازی image‌های بی‌استفاده"
docker image prune -f >/dev/null

step "تمام شد: نسخهٔ $TAG"
"${COMPOSE[@]}" ps
