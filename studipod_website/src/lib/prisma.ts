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
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  reportingPrisma?: PrismaClient;
};

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

function createPrismaClient(connectionString: string, maxConnections: number): PrismaClient {
  const { NODE_ENV } = getServerEnv();
  const adapter = new PrismaPg({ connectionString, ...POOL_OPTIONS, max: maxConnections });
  return new PrismaClient({
    adapter,
    log: NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/** Runtime client used by the website (in production: the insert-only role). */
export function getPrisma(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient(getServerEnv().DATABASE_URL, POOL_OPTIONS.max);
  return globalForPrisma.prisma;
}

/**
 * Reporting client for the waitlist digest. Uses DIGEST_DATABASE_URL (a
 * read-only reporting role in production) and falls back to DATABASE_URL.
 */
export function getReportingPrisma(): PrismaClient {
  const { DIGEST_DATABASE_URL, DATABASE_URL } = getServerEnv();
  globalForPrisma.reportingPrisma ??= createPrismaClient(DIGEST_DATABASE_URL ?? DATABASE_URL, 2);
  return globalForPrisma.reportingPrisma;
}
