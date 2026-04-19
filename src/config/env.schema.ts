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
export const envSchema = z.object({
  // ─── Runtime ─────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // ─── Database ────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL must be a valid PostgreSQL connection string',
    ),

  // ─── Redis ───────────────────────────────────────────────────
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().nonnegative().default(0),
  // Set to 'true' for Upstash / any TLS-required managed Redis.
  REDIS_TLS: z.enum(['true', 'false']).default('false'),

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
});

export type EnvConfig = z.infer<typeof envSchema>;

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

    // eslint-disable-next-line no-console
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
