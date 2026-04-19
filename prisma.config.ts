import process from 'node:process';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env for local CLI invocations (migrate, studio, etc.).
// In production, DATABASE_URL is provided directly by the platform.
config();

// Prisma 7 requires `datasource.url` to be present in this config file
// (it can no longer live in `schema.prisma`). At build time (`prisma generate`)
// the URL is unused, so we fall back to a placeholder to keep the build happy.
// At runtime (`prisma migrate deploy`), the real DATABASE_URL must be provided
// by the deployment platform (Render, Railway, etc.) — if it's missing, we
// fail loudly instead of silently using the placeholder.
const runtimeUrl = process.env['DATABASE_URL'];
const isBuildTime = process.env['PRISMA_GENERATE_BUILD'] === '1';

if (!runtimeUrl && !isBuildTime) {
  const msg =
    'DATABASE_URL is not set. Configure it in your deployment platform ' +
    '(Render Environment tab) or in .env for local development.';
  // Force-flush to stderr so the platform log stream captures it before
  // Prisma CLI wraps/suppresses the error in its own message.
  process.stderr.write(`\n[prisma.config] FATAL: ${msg}\n\n`);
  throw new Error(msg);
}

const databaseUrl =
  runtimeUrl ??
  'postgresql://placeholder:placeholder@placeholder:5432/placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
