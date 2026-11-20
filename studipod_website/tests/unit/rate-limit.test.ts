import { describe, expect, it, vi } from "vitest";
import { createMemoryRateLimiter, getClientIp, hashIdentifier } from "@/lib/security/rate-limit";

describe("createMemoryRateLimiter", () => {
  const windowMs = 60_000;

  it("allows requests up to the limit, then blocks", async () => {
    const limiter = createMemoryRateLimiter({ requests: 3, windowMs, now: () => 1_000 });
    const results = [];
    for (let attempt = 0; attempt < 4; attempt += 1) results.push(await limiter.limit("ip-a"));

    expect(results.map((result) => result.success)).toEqual([true, true, true, false]);
    expect(results[2]?.remaining).toBe(0);
    expect(results[3]?.resetAt).toBe(1_000 + windowMs);
  });

  it("allows requests again once the window has passed", async () => {
    let now = 0;
    const limiter = createMemoryRateLimiter({ requests: 1, windowMs, now: () => now });

    expect((await limiter.limit("ip-a")).success).toBe(true);
    expect((await limiter.limit("ip-a")).success).toBe(false);
    now = windowMs + 1;
    expect((await limiter.limit("ip-a")).success).toBe(true);
  });

  it("tracks identifiers independently", async () => {
    const limiter = createMemoryRateLimiter({ requests: 1, windowMs, now: () => 0 });
    expect((await limiter.limit("ip-a")).success).toBe(true);
    expect((await limiter.limit("ip-b")).success).toBe(true);
    expect((await limiter.limit("ip-a")).success).toBe(false);
  });

  it("evicts the least recently used identifier when the key cap is reached", async () => {
    const limiter = createMemoryRateLimiter({ requests: 1, windowMs, maxKeys: 2, now: () => 0 });
    await limiter.limit("ip-a");
    await limiter.limit("ip-b");
    await limiter.limit("ip-c"); // evicts ip-a

    expect((await limiter.limit("ip-a")).success).toBe(true);
  });
});

describe("getWaitlistRateLimiter", () => {
  async function loadModule() {
    vi.resetModules();
    return import("@/lib/security/rate-limit");
  }

  it("uses the in-memory limiter when Redis is not configured", async () => {
    const { getWaitlistRateLimiter } = await loadModule();
    const limiter = getWaitlistRateLimiter();
    expect(getWaitlistRateLimiter()).toBe(limiter);
    expect((await limiter.limit("id")).success).toBe(true);
  });

  it("logs an error when running in production without a distributed store", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { getWaitlistRateLimiter } = await loadModule();
    getWaitlistRateLimiter();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("rate_limit.distributed_store_missing"),
    );
  });

  describe("with Upstash configured", () => {
    function mockUpstash(limit: () => Promise<unknown>) {
      vi.doMock("@upstash/redis", () => ({ Redis: class {} }));
      vi.doMock("@upstash/ratelimit", () => ({
        Ratelimit: class {
          static slidingWindow() {
            return {};
          }
          limit = limit;
        },
      }));
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example-redis.upstash.io");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    }

    it("maps the Upstash result", async () => {
      mockUpstash(() => Promise.resolve({ success: false, limit: 5, remaining: 0, reset: 42 }));
      const { getWaitlistRateLimiter } = await loadModule();
      expect(await getWaitlistRateLimiter().limit("id")).toEqual({
        success: false,
        limit: 5,
        remaining: 0,
        resetAt: 42,
      });
    });

    it("falls back to the in-memory limiter when Redis errors", async () => {
      mockUpstash(() => Promise.reject(new Error("redis unavailable")));
      const { getWaitlistRateLimiter } = await loadModule();
      expect((await getWaitlistRateLimiter().limit("id")).success).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("rate_limit.store_unavailable"),
      );
    });
  });
});

describe("getClientIp", () => {
  it("prefers x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" });
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("uses the first x-forwarded-for entry", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" });
    expect(getClientIp(headers)).toBe("198.51.100.1");
  });

  it("accepts IPv6 addresses", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("ignores malformed values and falls back to 'unknown'", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "<script>" }))).toBe("unknown");
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});

describe("hashIdentifier", () => {
  it("is deterministic, fixed-length hex and does not contain the input", async () => {
    const first = await hashIdentifier("203.0.113.7");
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(await hashIdentifier("203.0.113.7")).toBe(first);
    expect(first).not.toContain("203.0");
  });

  it("produces different hashes for different inputs", async () => {
    expect(await hashIdentifier("203.0.113.7")).not.toBe(await hashIdentifier("203.0.113.8"));
  });
});
