import { registerAs } from '@nestjs/config';
import { readInt, readString } from './config.helpers';

export const databaseConfig = registerAs('database', () => ({
  // Runtime connection. In production this points at PgBouncer (transaction pooling).
  url: readString('DATABASE_URL'),
  // Direct PostgreSQL connection, used only by Prisma Migrate (bypasses PgBouncer).
  directUrl: readString('DIRECT_DATABASE_URL'),
  poolMax: readInt('DATABASE_POOL_MAX', 10),
  // Applied server-side (ALTER ROLE ... SET statement_timeout). PgBouncer rejects
  // statement_timeout sent as a client startup parameter.
  statementTimeoutMs: readInt('DATABASE_STATEMENT_TIMEOUT_MS', 15000),
}));
