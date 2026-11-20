import { beforeEach, vi } from "vitest";

/**
 * Test environment defaults. Integration tests use the local PostgreSQL from
 * docker-compose.yml (or the service container in CI) unless DATABASE_URL is set.
 */
process.env.DATABASE_URL ??=
  "postgresql://studipod:studipod_local_dev@localhost:5433/studipod?schema=public";

// External services are opt-in per test; never call real Upstash/Cloudflare by default.
delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
delete process.env.CLOUDFLARE_TURNSTILE_SITE_KEY;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

beforeEach(() => {
  // Keep test output readable; structured server logs are asserted where relevant.
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
