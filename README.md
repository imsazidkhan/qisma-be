# Qisma API

GitHub repository: [qisma-be](https://github.com/imsazidkhan/qisma-be).

Production API for **Qisma** — **NestJS**, **PostgreSQL**, **Redis**. Ships phone **OTP** + **JWT** auth, **groups** & invites, **contacts** sync, **expenses** (splits, receipts, comments), uploads, and related endpoints.

---

## Features

- **OTP flow** — phone-based one-time passwords with cryptographically secure generation (`crypto.randomInt`)
- **JWT authentication** — short-lived access tokens + long-lived refresh tokens with rotation & reuse detection
- **Groups & expenses** — memberships, invites, activity feeds, expense lifecycle, receipt uploads, balances & analytics-oriented caching
- **Multi-layer rate limiting** — IP → cooldown → phone (atomic Redis Lua scripts)
- **Idempotency** — prevents duplicate processing on network retries
- **Token family revocation** — reusing a rotated refresh token revokes the entire family + all user sessions
- **Structured JSON logging** — pino with automatic secret redaction and request correlation IDs
- **Graceful shutdown** — SIGTERM handlers cleanly close DB/Redis connections
- **Health checks** — `/v1/health` reports database + Redis status
- **Full Swagger docs** — `/docs`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js 22 |
| Framework | NestJS 11 |
| Database | PostgreSQL (Neon) + Prisma 7 |
| Cache / Rate limit | Redis (Upstash) + ioredis |
| Auth | JWT (`jsonwebtoken`) + Passport |
| Validation | class-validator + zod (env schema) |
| Logging | pino + nestjs-pino |
| Docs | Swagger / OpenAPI |

---

## Quick Start

### Prerequisites
- Node.js 22+
- pnpm 10+
- PostgreSQL instance (local or Neon)
- Redis instance (local or Upstash)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template and fill in values
cp .env.example .env

# 3. Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Apply database migrations
npx prisma migrate deploy

# 5. Start dev server (`nest start --watch`; compiles on the fly)
pnpm start:dev

# Production-style run (requires a fresh build first)
pnpm build && pnpm start:prod
```

The app will be live at `http://localhost:3000`:
- **API:** `http://localhost:3000/v1/...`
- **Swagger:** `http://localhost:3000/docs`
- **Health:** `http://localhost:3000/v1/health`

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/otp/send` | Request OTP for a phone number |
| `POST` | `/v1/otp/verify` | Verify OTP → receive access + refresh tokens |
| `POST` | `/v1/auth/refresh` | Rotate tokens using refresh token |
| `POST` | `/v1/auth/logout` | Revoke refresh token |
| `GET` | `/v1/health` | Liveness + dependency status |

See [Swagger docs](http://localhost:3000/docs) for complete request/response schemas and error codes.

### Groups & invites (frontend)

Product-level contract for envelopes, **`GET /v1/users/me/groups`** (home), **`active` / `pending`**, polling vs navigation, admin roster behaviour, and optional invite retention: **[docs/FE_GROUPS_INVITES_CONTRACT.md](docs/FE_GROUPS_INVITES_CONTRACT.md)**. Optional TypeScript/helpers: **`client-integration/group-invites/`**.

---

## Docker

```bash
docker build -t qisma-be .
docker run --rm -p 3000:3000 --env-file .env qisma-be
```

Multi-stage build produces a ~180 MB image with non-root user, Prisma-generated client, and production-only dependencies.

---

## Deployment

Deployable to any Docker-compatible platform. Suggested stack:
- **App host:** [Render](https://render.com) (free tier)
- **Postgres:** [Neon](https://neon.tech) (free 0.5 GB)
- **Redis:** [Upstash](https://upstash.com) (free 10k commands/day)

All three offer free tiers suitable for development and low-traffic production.

---

## Environment Variables

| Name | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` \| `production` \| `test` |
| `PORT` | No | Server port (default `3000`) |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `REDIS_HOST` | **Yes** | Redis hostname |
| `REDIS_PORT` | **Yes** | Redis port (default `6379`) |
| `REDIS_PASSWORD` | No | Redis auth password |
| `REDIS_DB` | No | Redis database index (default `0`) |
| `REDIS_TLS` | No | `true` for Upstash / managed Redis |
| `JWT_ACCESS_SECRET` | **Yes** | Min 32 chars, no default placeholder |
| `JWT_REFRESH_SECRET` | **Yes** | Min 32 chars, must differ from access secret in production |
| `CORS_ORIGINS` | No | Comma-separated browser `Origin` values (e.g. `http://localhost:8081` for Expo Web). If unset, the server reflects the request origin so local web clients are not blocked by CORS. Set explicitly in production. |

App fails to boot if any required variable is missing or malformed — see `src/config/env.schema.ts`.

---

## License

UNLICENSED — internal project.
