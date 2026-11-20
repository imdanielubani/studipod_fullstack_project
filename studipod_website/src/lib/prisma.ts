import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env";

/**
 * Prisma client singleton (server-only).
 *
 * - Uses the node-postgres driver adapter (Prisma 7 query compiler).
 * - Cached on globalThis so development hot reloads reuse one connection pool.
 * - Created lazily so builds and static rendering never need DATABASE_URL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Conservative pool limits: a waitlist needs few connections, and bounded
 * pools/timeouts stop a slow or abusive burst from exhausting the database.
 */
const POOL_OPTIONS = {
  max: 5,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 5_000,
  query_timeout: 10_000,
} as const;

function createPrismaClient(): PrismaClient {
  const { DATABASE_URL, NODE_ENV } = getServerEnv();
  const adapter = new PrismaPg({ connectionString: DATABASE_URL, ...POOL_OPTIONS });
  return new PrismaClient({
    adapter,
    log: NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export function getPrisma(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
