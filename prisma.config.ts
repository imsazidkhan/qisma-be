import process from 'node:process';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env for local CLI invocations (migrate, studio, etc.).
// In Docker builds there is no .env; DATABASE_URL is provided at runtime.
config();

// Placeholder used only at build time (`prisma generate`), which doesn't
// connect to the DB. Real runtime migrations use the actual env var
// provided by the deployment platform (Render, etc.).
const databaseUrl =
  process.env['DATABASE_URL'] ??
  'postgresql://placeholder:placeholder@placeholder:5432/placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
