import "server-only";
import { createClient } from "redis";
import { describeError, logger } from "@/lib/logger";
import type { RateLimiter, RateLimitResult } from "@/lib/security/rate-limit";

/**
 * Sliding-window rate limiting on a standard (self-hosted) Redis server,
 * e.g. a Redis service in Dokploy on the same VPS, reached via REDIS_URL.
 *
 * Each identifier is a sorted set of request timestamps. A Lua script prunes
 * expired entries, counts, conditionally records the new request and sets the
 * key's expiry in ONE atomic step, so concurrent requests cannot exceed the
 * limit. Keys expire automatically, so Redis holds no stale data.
 */

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)
local allowed = 0
if count < limit then
  redis.call('ZADD', key, now, member)
  count = count + 1
  allowed = 1
end
redis.call('PEXPIRE', key, window)

local reset = now + window
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
if oldest[2] then
  reset = tonumber(oldest[2]) + window
end
return { allowed, count, reset }
`;

/** The single Redis capability the limiter needs (eases testing and swapping clients). */
export interface RedisScriptClient {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
  close(): Promise<void>;
}

interface RedisLimiterOptions {
  requests: number;
  windowMs: number;
  prefix: string;
  /** Fail (and let the caller fall back) if Redis does not answer in time. */
  timeoutMs?: number;
  now?: () => number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Redis rate limit timed out")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function parseReply(reply: unknown): [number, number, number] {
  if (!Array.isArray(reply) || reply.length !== 3) {
    throw new Error("Unexpected Redis rate limit reply");
  }
  const values = reply.map((value) => Number(value));
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("Unexpected Redis rate limit reply");
  }
  return values as [number, number, number];
}

export function createRedisRateLimiter(
  client: RedisScriptClient,
  { requests, windowMs, prefix, timeoutMs = 1500, now = Date.now }: RedisLimiterOptions,
): RateLimiter {
  return {
    async limit(identifier): Promise<RateLimitResult> {
      const current = now();
      const member = `${current}-${crypto.randomUUID()}`;
      const reply = await withTimeout(
        client.eval(SLIDING_WINDOW_SCRIPT, {
          keys: [`${prefix}:${identifier}`],
          arguments: [String(current), String(windowMs), String(requests), member],
        }),
        timeoutMs,
      );
      const [allowed, count, resetAt] = parseReply(reply);
      return {
        success: allowed === 1,
        limit: requests,
        remaining: Math.max(0, requests - count),
        resetAt,
      };
    },
  };
}

/**
 * node-redis connection for REDIS_URL (redis:// or rediss:// for TLS).
 *
 * - Connects lazily on first use and reconnects with capped backoff.
 * - Offline queueing is disabled, so commands fail fast while Redis is down
 *   (the caller then falls back) instead of piling up in memory.
 * - Connection errors are logged once per outage, not on every retry.
 */
export function createNodeRedisScriptClient(url: string): RedisScriptClient {
  const client = createClient({
    url,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries: number) => Math.min(250 * 2 ** retries, 10_000),
    },
  });

  let outageLogged = false;
  client.on("error", (error: unknown) => {
    if (outageLogged) return;
    outageLogged = true;
    logger.warn("rate_limit.redis_connection_error", describeError(error));
  });
  client.on("ready", () => {
    outageLogged = false;
  });

  let connecting: Promise<unknown> | null = null;

  return {
    async eval(script, options) {
      if (!client.isOpen) {
        connecting ??= client.connect().catch((error: unknown) => {
          connecting = null;
          throw error;
        });
        await connecting;
      }
      return client.eval(script, options);
    },
    async close() {
      if (client.isOpen) await client.close();
    },
  };
}
