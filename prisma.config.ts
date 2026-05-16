import process from 'node:process';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env for local CLI invocations (migrate, studio, etc.).
// In production, DATABASE_URL is provided directly by the platform.
config();

// Prisma 7 requires `datasource.url` to be present in this config file
// (it can no longer live in `schema.prisma`). At build time (`prisma generate`)
// the URL is unused, so we fall back to a placeholder to keep the build happy.
//
// **`prisma migrate deploy`** uses this URL. Neon / Supabase **poolers** (PgBouncer
// transaction mode) often **cannot acquire advisory locks** → `P1002` timeouts.
// Set **`DIRECT_DATABASE_URL`** to Neon's **direct** (non-pooler) connection string;
// the Nest app still uses **`DATABASE_URL`** (pooled) via `PrismaService`.
const migrateConnectionUrl =
  process.env['DIRECT_DATABASE_URL']?.trim() ||
  process.env['DATABASE_URL'];
const isBuildTime = process.env['PRISMA_GENERATE_BUILD'] === '1';

if (!migrateConnectionUrl && !isBuildTime) {
  const msg =
    'DATABASE_URL is not set (or DIRECT_DATABASE_URL for migrations). ' +
    'Configure in your deployment platform or .env for local development.';
  process.stderr.write(`\n[prisma.config] FATAL: ${msg}\n\n`);
  throw new Error(msg);
}

const databaseUrl =
  migrateConnectionUrl ??
  'postgresql://placeholder:placeholder@placeholder:5432/placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
