# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────
# Veloraq Auth Service — Production Dockerfile
#
# Multi-stage build optimized for:
#   • Small final image (~180 MB) via Alpine + production-only deps
#   • Fast rebuilds via aggressive layer caching (package files first)
#   • Security: non-root user, no dev dependencies in runtime
#   • Prisma 7 + pg adapter (no engine binaries needed)
# ─────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22-alpine

# ═════════════════════════════════════════════════════════════════════
# Stage 1: deps — install all dependencies (prod + dev)
# ═════════════════════════════════════════════════════════════════════
FROM node:${NODE_VERSION} AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Enable pnpm via corepack (pinned via package.json "packageManager" if set)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy only manifests first — maximum layer cache hits on code changes
COPY package.json pnpm-lock.yaml .npmrc ./

# Install with frozen lockfile for reproducibility
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ═════════════════════════════════════════════════════════════════════
# Stage 2: builder — generate Prisma client + compile TS → dist/
# ═════════════════════════════════════════════════════════════════════
FROM node:${NODE_VERSION} AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (typed) — required before TS compile
RUN pnpm exec prisma generate

# Compile TypeScript → dist/
RUN pnpm run build

# Prune dev dependencies → smaller runtime stage
RUN pnpm prune --prod

# ═════════════════════════════════════════════════════════════════════
# Stage 3: runner — minimal runtime image
# ═════════════════════════════════════════════════════════════════════
FROM node:${NODE_VERSION} AS runner

# OpenSSL for Prisma, wget for HEALTHCHECK
RUN apk add --no-cache libc6-compat openssl wget \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nestjs -u 1001

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Copy built artifacts + pruned deps + schema (for migrate deploy)
COPY --chown=nestjs:nodejs --from=builder /app/dist ./dist
COPY --chown=nestjs:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs --from=builder /app/package.json ./package.json
COPY --chown=nestjs:nodejs --from=builder /app/prisma ./prisma

USER nestjs

EXPOSE 3000

# Container health = app responds on /v1/health
# (endpoint to be added in next step)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/v1/health || exit 1

# Run migrations then start the server.
# Safe in production because `migrate deploy` only applies pending migrations.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
