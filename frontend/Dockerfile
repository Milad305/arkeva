
# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
    && corepack prepare pnpm@11.20.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend ./frontend
COPY packages ./packages

RUN pnpm install --frozen-lockfile

ARG VITE_API_BASE_URL=/v1
ARG VITE_NODE_ENV=production

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_NODE_ENV=$VITE_NODE_ENV

RUN pnpm --filter prozheh-yar-frontend run build

# --------------------------------------------------
# Production runtime
# --------------------------------------------------
FROM nginx:stable-alpine AS runtime

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build \
    /workspace/frontend/dist/ \
    /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
