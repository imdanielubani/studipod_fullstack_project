import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createNodeRedisScriptClient,
  createRedisRateLimiter,
  type RedisScriptClient,
} from "@/lib/security/redis-rate-limit";

/**
 * Runs the sliding-window Lua script against a real Redis server
 * (docker-compose locally, a service container in CI).
 */
const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://:studipod_local_dev@localhost:6380";
const PREFIX = `studipod:test:${crypto.randomUUID()}`;

let client: RedisScriptClient;

beforeAll(async () => {
  client = createNodeRedisScriptClient(TEST_REDIS_URL);
  try {
    await client.eval("return 1", { keys: [], arguments: [] });
  } catch {
    throw new Error(
      "Redis integration tests need Redis. Run `npm run db:up`, or set TEST_REDIS_URL.",
    );
  }
});

afterAll(async () => {
  await client.eval(
    "for _, key in ipairs(redis.call('KEYS', ARGV[1])) do redis.call('DEL', key) end return 1",
    { keys: [], arguments: [`${PREFIX}:*`] },
  );
  await client.close();
});

describe("Redis sliding-window rate limiter", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const limiter = createRedisRateLimiter(client, {
      requests: 3,
      windowMs: 60_000,
      prefix: PREFIX,
    });
    const results = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      results.push(await limiter.limit("sequential"));
    }

    expect(results.map((result) => result.success)).toEqual([true, true, true, false]);
    expect(results.map((result) => result.remaining)).toEqual([2, 1, 0, 0]);
    expect(results[3]?.resetAt).toBeGreaterThan(Date.now());
  });

  it("is atomic under concurrent requests", async () => {
    const limiter = createRedisRateLimiter(client, {
      requests: 5,
      windowMs: 60_000,
      prefix: PREFIX,
    });
    const results = await Promise.all(
      Array.from({ length: 20 }, () => limiter.limit("concurrent")),
    );
    expect(results.filter((result) => result.success)).toHaveLength(5);
  });

  it("frees capacity once requests leave the window", async () => {
    let now = Date.now();
    const limiter = createRedisRateLimiter(client, {
      requests: 1,
      windowMs: 1_000,
      prefix: PREFIX,
      now: () => now,
    });

    expect((await limiter.limit("window")).success).toBe(true);
    expect((await limiter.limit("window")).success).toBe(false);
    now += 1_001;
    expect((await limiter.limit("window")).success).toBe(true);
  });

  it("tracks identifiers independently and sets an expiry on every key", async () => {
    const limiter = createRedisRateLimiter(client, {
      requests: 1,
      windowMs: 60_000,
      prefix: PREFIX,
    });
    expect((await limiter.limit("ip-a")).success).toBe(true);
    expect((await limiter.limit("ip-b")).success).toBe(true);

    const ttl = await client.eval("return redis.call('PTTL', KEYS[1])", {
      keys: [`${PREFIX}:ip-a`],
      arguments: [],
    });
    expect(Number(ttl)).toBeGreaterThan(0);
    expect(Number(ttl)).toBeLessThanOrEqual(60_000);
  });
});
