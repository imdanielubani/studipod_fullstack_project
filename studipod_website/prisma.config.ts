import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (migrations, generate, studio).
 *
 * Migrations use DIRECT_URL when provided — a direct, non-pooled connection is
 * required by `prisma migrate` when the runtime DATABASE_URL points at a pooler
 * (e.g. PgBouncer / Supabase / Neon pooled endpoints).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
