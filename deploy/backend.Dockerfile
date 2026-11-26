# syntax=docker/dockerfile:1.7
# image بک‌اند (docs/backend/10 ۴): ساخت با pnpm و SWC ← اجرا روی node:24-slim (glibc برای sharp و argon2).
# یک image، نقش با فرمان: dist/main.js [all|api|worker|migrate]، dist/scripts/db-bootstrap.js، dist/scripts/seed.js
# ساخت از ریشهٔ مخزن: docker build -f deploy/backend.Dockerfile .
# Chromium برای PDF گزارش عمداً نیست (سرور ۱ گیگابایتی؛ deploy/README.md) ← خروجی PDF گزارش failed می‌شود.

ARG NODE_IMAGE=node:24-slim

FROM ${NODE_IMAGE} AS build
ENV CI=true PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN npm install -g pnpm@11.20.0
WORKDIR /repo

# اول فقط manifestها تا لایهٔ وابستگی‌ها با هر تغییر کد دوباره ساخته نشود
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@projeyar/backend..."

COPY packages/shared packages/shared
COPY backend backend
# prebuild پکیج مشترک را هم می‌سازد
RUN pnpm --filter @projeyar/backend run build
# فقط وابستگی‌های اجرا؛ پکیج مشترک (dist) درون node_modules کپی می‌شود
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @projeyar/backend deploy --prod --legacy /out \
 && rm -rf /out/src /out/test /out/*.config.ts /out/tsconfig.json /out/eslint.config.js /out/.swcrc

FROM ${NODE_IMAGE} AS runtime
# NODE_ENV در compose تعیین می‌شود (دمو: development)؛ فرایند همیشه UTC (10 ۲)
ENV NODE_ENV=production TZ=UTC PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
ENTRYPOINT ["node"]
CMD ["dist/main.js", "all"]
