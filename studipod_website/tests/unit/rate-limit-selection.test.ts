import { describe, expect, it, vi } from "vitest";

/**
 * Store selection order: REDIS_URL → Upstash → in-memory, with fallback to
 * memory whenever the configured store errors.
 */

async function loadRateLimit() {
  vi.resetModules();
  return import("@/lib/security/rate-limit");
}

function mockRedisModule(evalImpl: () => Promise<unknown>) {
  const createClient = vi.fn(() => ({
    isOpen: true,
    on: vi.fn(),
    connect: vi.fn(),
    eval: vi.fn(evalImpl),
    close: vi.fn(),
  }));
  vi.doMock("redis", () => ({ createClient }));
  return createClient;
}

describe("getWaitlistRateLimiter store selection", () => {
  it("uses standard Redis when REDIS_URL is set, even if Upstash is configured", async () => {
    const createClient = mockRedisModule(async () => [0, 5, 99_000]);
    vi.stubEnv("REDIS_URL", "redis://:secret@redis.internal:6379");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example-redis.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    const { getWaitlistRateLimiter } = await loadRateLimit();
    const result = await getWaitlistRateLimiter().limit("hashed-ip");

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ url: "redis://:secret@redis.internal:6379" }),
    );
    expect(result).toEqual({ success: false, limit: 5, remaining: 0, resetAt: 99_000 });
  });

  it("falls back to the in-memory limiter when Redis errors", async () => {
    mockRedisModule(async () => {
      throw new Error("Redis unavailable");
    });
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");

    const { getWaitlistRateLimiter } = await loadRateLimit();
    expect((await getWaitlistRateLimiter().limit("hashed-ip")).success).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("rate_limit.store_unavailable"),
    );
  });

  it("does not report a missing distributed store in production when Redis is set", async () => {
    mockRedisModule(async () => [1, 1, 1]);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("REDIS_URL", "rediss://:secret@redis.example:6380");

    const { getWaitlistRateLimiter } = await loadRateLimit();
    getWaitlistRateLimiter();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("rejects REDIS_URL values that are not redis:// or rediss://", async () => {
    vi.stubEnv("REDIS_URL", "http://redis.internal:6379");
    const { getWaitlistRateLimiter } = await loadRateLimit();
    expect(() => getWaitlistRateLimiter()).toThrow(/REDIS_URL/);
  });
});
