import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma CLI configuration (migrate, generate, studio, seed).
//
// Migrations always use the DIRECT PostgreSQL connection. PgBouncer in
// transaction mode does not support the session-level features Prisma Migrate
// needs (advisory locks, prepared statements across transactions).
//
// A placeholder URL keeps `prisma generate` and `prisma validate` usable in CI
// without a database; commands that connect will fail fast against it.
const PLACEHOLDER_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed/index.ts',
  },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? PLACEHOLDER_URL,
  },
});
