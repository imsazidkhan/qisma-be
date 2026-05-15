import { z } from 'zod';

/**
 * Environment variable schema.
 *
 * Every variable the app depends on is declared here.
 * The app **refuses to boot** if any required var is missing or malformed.
 *
 * This catches deploy misconfigurations (wrong Neon URL, missing JWT secret,
 * etc.) immediately at startup instead of at the first request.
 */
const envShape = z.object({
  // ─── Runtime ─────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // ─── HTTP / CORS (browsers: Expo Web, SPA on another origin) ─
  /** Comma-separated allowed `Origin` values. If unset, any origin is reflected (dev-friendly). */
  CORS_ORIGINS: z.string().optional(),
  /**
   * When `true`, Express **trust proxy** is enabled (one hop) so **`req.ip` / `@Ip()`** use
   * **`X-Forwarded-For`** behind a load balancer — required for meaningful **per-IP** limits on
   * **`POST /v1/contacts/sync`** (and OTP IP limits).
   */
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  /**
   * Optional public origin for absolute file URLs in upload responses, e.g.
   * `https://api.example.com`. If unset, upload responses use `Host` (+ optional
   * `X-Forwarded-*` when behind a reverse proxy).
   */
  PUBLIC_APP_URL: z.string().url().optional(),

  /**
   * Receipt / expense attachment storage: **`local`** (disk under `uploads/receipts/`) or **`s3`**
   * (S3-compatible API — **AWS S3**, **Cloudflare R2**, MinIO, …).
   */
  RECEIPT_STORAGE: z.enum(['local', 's3']).default('local'),
  /** Max receipt upload size in bytes (multipart **file**). Default **10 MB** if unset. */
  RECEIPT_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024)
    .optional(),
  /** S3-compatible bucket (R2: bucket name in dashboard). Required when **RECEIPT_STORAGE=s3**. */
  S3_BUCKET: z.string().min(1).optional(),
  /**
   * Region label for SigV4. R2 often uses **`auto`**.
   * @see https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
   */
  S3_REGION: z.string().min(1).default('auto'),
  /**
   * Custom S3 API endpoint for **R2** / MinIO, e.g.
   * `https://<account_id>.r2.cloudflarestorage.com`
   */
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  /**
   * Public base URL for objects after upload (no trailing slash).
   * R2: your public bucket domain or **r2.dev** / custom domain; AWS: CloudFront or `https://bucket.s3.region.amazonaws.com` style origin.
   */
  S3_PUBLIC_BASE_URL: z.string().url().optional(),

  // ─── Database ────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL must be a valid PostgreSQL connection string',
    ),

  // ─── Redis ───────────────────────────────────────────────────
  /** Hostname only (e.g. **`xxx.upstash.io`**). No **`http(s)://`**, **`redis-cli`**, or **`redis://` / `rediss://` URLs**. TLS = **`REDIS_TLS`**. */
  REDIS_HOST: z
    .string()
    .min(1)
    .default('localhost')
    .refine((h) => !/\s/.test(h), {
      message:
        'REDIS_HOST must be a hostname only (no spaces). Do not paste a shell command or full redis URL.',
    })
    .refine((h) => !/^https?:\/\//i.test(h), {
      message:
        'REDIS_HOST must not include https:// or http:// — use only xxx.upstash.io (TLS uses REDIS_TLS=true).',
    })
    .refine(
      (h) => !/^(redis|rediss):\/\//i.test(h) && !/^redis-cli\b/i.test(h),
      {
        message:
          'REDIS_HOST must be only the host (example: xxx.upstash.io). Use REDIS_PASSWORD for the secret part of redis:// URLs.',
      },
    ),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().nonnegative().default(0),
  // Set to 'true' for Upstash / any TLS-required managed Redis.
  REDIS_TLS: z.enum(['true', 'false']).default('false'),
  /**
   * Prefer **`4`** if **`connect ETIMEDOUT`** to Upstash persists but **`redis-cli`**
   * works — Node may be trying IPv6 first while only IPv4 routes succeed.
   */
  REDIS_FAMILY: z.enum(['4', '6']).optional(),

  // ─── JWT ─────────────────────────────────────────────────────
  // Secrets MUST be strong. We enforce a minimum length and explicitly
  // reject the placeholder values shipped in .env so production deploys
  // can't accidentally use them.
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')
    .refine(
      (v) => !v.includes('change-in-production'),
      'JWT_ACCESS_SECRET still contains the default placeholder — set a real secret',
    ),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
    .refine(
      (v) => !v.includes('change-in-production'),
      'JWT_REFRESH_SECRET still contains the default placeholder — set a real secret',
    ),

  /**
   * ISO 3166-1 alpha-2 default region for **`POST /v1/contacts/sync`** when uploaded
   * numbers omit country code **and** the caller’s stored `identifier` isn’t usable to infer region.
   * Example: `IN`, `US`, `BD`.
   */
  CONTACT_SYNC_DEFAULT_COUNTRY: z
    .string()
    .length(2, 'Must be ISO 3166-1 alpha-2 (e.g. IN, US)')
    .regex(/^[A-Za-z]{2}$/, 'Must be ASCII letters')
    .transform((c) => c.toUpperCase())
    .optional(),
});

export const envSchema = envShape.refine(
  (data) => {
    if (data.RECEIPT_STORAGE !== 's3') {
      return true;
    }
    return Boolean(
      data.S3_BUCKET &&
      data.S3_ACCESS_KEY_ID &&
      data.S3_SECRET_ACCESS_KEY &&
      data.S3_PUBLIC_BASE_URL,
    );
  },
  {
    message:
      'When RECEIPT_STORAGE is s3, set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_PUBLIC_BASE_URL (and S3_ENDPOINT for R2/MinIO).',
    path: ['RECEIPT_STORAGE'],
  },
);

export type EnvConfig = z.infer<typeof envShape>;

/**
 * Validation function consumed by `ConfigModule.forRoot({ validate })`.
 *
 * On failure, prints a human-readable list of every problem found
 * and re-throws to abort boot.
 */
export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    console.error(
      `\n❌ Invalid environment configuration:\n${issues}\n\n` +
        `Fix the above in your .env file (or deployment env vars) and restart.\n`,
    );

    throw new Error('Environment validation failed');
  }

  // In production, refuse to boot with default/weak secrets even if they
  // pass the length check (belt-and-suspenders).
  if (result.data.NODE_ENV === 'production') {
    if (result.data.JWT_ACCESS_SECRET === result.data.JWT_REFRESH_SECRET) {
      throw new Error(
        'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production',
      );
    }
  }

  return result.data;
}
