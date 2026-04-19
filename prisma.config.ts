import process from 'node:process';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config();

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in .env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
