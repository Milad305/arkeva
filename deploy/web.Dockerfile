# syntax=docker/dockerfile:1.7
# فایل‌های ایستای وب: پنل (frontend/dist) و لندینگ. این image اجرا نمی‌شود؛ deploy.sh فایل‌هایش را
# با docker create و docker cp به /opt/arkeva/frontend و /opt/arkeva/landing می‌ریزد و nginx میزبان سرو می‌کند.
# ساخت از ریشهٔ مخزن: docker build -f deploy/web.Dockerfile --build-arg PANEL_BASE_PATH=/panel/ .

ARG NODE_IMAGE=node:24-slim

FROM ${NODE_IMAGE} AS build
ENV CI=true PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN npm install -g pnpm@11.20.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "prozheh-yar-frontend..."

COPY packages/shared packages/shared
COPY frontend frontend
# روی IP پنل زیر /panel/ است؛ پس از دامنه (panel.arkeva.ir) با PANEL_BASE_PATH=/ ساخته می‌شود.
# API هم‌مبدأ زیر /v1 تا کوکی تازه‌سازی (Path=/v1/auth، SameSite=Strict) کار کند.
ARG PANEL_BASE_PATH=/panel/
ENV VITE_BASE_PATH=${PANEL_BASE_PATH} VITE_API_BASE_URL=/v1 VITE_NODE_ENV=production
RUN pnpm --filter prozheh-yar-frontend run build

FROM scratch
COPY --from=build /repo/frontend/dist /panel
COPY landing /landing
# فقط برای اینکه docker create کار کند؛ هرگز اجرا نمی‌شود
CMD ["/none"]
