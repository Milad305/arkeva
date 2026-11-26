
# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
    && corepack prepare pnpm@11.20.0 --activate

WORKDIR /workspace

# --------------------------------------------------
# Build stage
# --------------------------------------------------
FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend ./backend
COPY frontend ./frontend
COPY packages ./packages

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @projeyar/shared run build \
    && pnpm --filter @projeyar/backend run build

# Create isolated production dependencies
RUN pnpm --filter @projeyar/backend --prod deploy --legacy /prod/backend

# Replace workspace symlink with a self-contained shared package
RUN rm -f /prod/backend/node_modules/@projeyar/shared \
    && mkdir -p /prod/backend/node_modules/@projeyar/shared \
    && cp packages/shared/package.json /prod/backend/node_modules/@projeyar/shared/ \
    && cp -a packages/shared/dist/. /prod/backend/node_modules/@projeyar/shared/dist/

# Ensure compiled backend output is included
RUN mkdir -p /prod/backend/dist \
    && cp -a backend/dist/. /prod/backend/dist/

# --------------------------------------------------
# Production runtime
# --------------------------------------------------
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV REPORT_BROWSER_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        ca-certificates \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build --chown=node:node /prod/backend/ ./

USER node

EXPOSE 3000

ENTRYPOINT ["node", "dist/main.js"]
