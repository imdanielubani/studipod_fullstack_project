import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { WAITLIST_RATE_LIMIT } from "@/lib/constants";
import { getServerEnv } from "@/lib/env";
import { describeError, logger } from "@/lib/logger";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch milliseconds when the window resets. */
  resetAt: number;
}

export interface RateLimiter {
  limit(identifier: string): Promise<RateLimitResult>;
}

interface MemoryLimiterOptions {
  requests: number;
  windowMs: number;
  /** Upper bound on tracked identifiers so memory use stays bounded. */
  maxKeys?: number;
  now?: () => number;
}

/**
 * In-memory sliding-window limiter. Suitable for local development and as a
 * degraded-mode fallback only: in serverless or multi-instance deployments each
 * instance has its own memory, so this alone is NOT a distributed limit.
 */
export function createMemoryRateLimiter({
  requests,
  windowMs,
  maxKeys = 10_000,
  now = Date.now,
}: MemoryLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    async limit(identifier) {
      const current = now();
      const windowStart = current - windowMs;
      const recent = (hits.get(identifier) ?? []).filter((timestamp) => timestamp > windowStart);
      const success = recent.length < requests;
      const updated = success ? [...recent, current] : recent;

      hits.delete(identifier);
      hits.set(identifier, updated);
      if (hits.size > maxKeys) {
        const oldestKey = hits.keys().next().value;
        if (oldestKey !== undefined) hits.delete(oldestKey);
      }

      const oldest = updated[0] ?? current;
      return {
        success,
        limit: requests,
        remaining: Math.max(0, requests - updated.length),
        resetAt: oldest + windowMs,
      };
    },
  };
}

function createUpstashRateLimiter(url: string, token: string): RateLimiter {
  const ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(
      WAITLIST_RATE_LIMIT.requests,
      `${WAITLIST_RATE_LIMIT.windowSeconds} s`,
    ),
    prefix: "studipod:ratelimit:waitlist",
    analytics: false,
  });

  return {
    async limit(identifier) {
      const result = await ratelimit.limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    },
  };
}

/** Uses the primary (distributed) limiter, degrading to the fallback if it errors. */
function withFallback(primary: RateLimiter, fallback: RateLimiter): RateLimiter {
  return {
    async limit(identifier) {
      try {
        return await primary.limit(identifier);
      } catch (error) {
        logger.warn("rate_limit.store_unavailable", describeError(error));
        return fallback.limit(identifier);
      }
    },
  };
}

let waitlistLimiter: RateLimiter | null = null;

/** Rate limiter for waitlist submissions: Upstash Redis when configured, memory otherwise. */
export function getWaitlistRateLimiter(): RateLimiter {
  if (waitlistLimiter) return waitlistLimiter;

  const env = getServerEnv();
  const memory = createMemoryRateLimiter({
    requests: WAITLIST_RATE_LIMIT.requests,
    windowMs: WAITLIST_RATE_LIMIT.windowSeconds * 1000,
  });

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    waitlistLimiter = withFallback(
      createUpstashRateLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN),
      memory,
    );
  } else {
    if (env.NODE_ENV === "production") {
      logger.error("rate_limit.distributed_store_missing", {
        detail: "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production.",
      });
    }
    waitlistLimiter = memory;
  }
  return waitlistLimiter;
}

const IP_PATTERN = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * Best-effort client IP from proxy headers set by the hosting platform
 * (e.g. Vercel sets x-real-ip / x-forwarded-for). Invalid values are ignored.
 */
export function getClientIp(headers: Headers): string {
  const candidates = [
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("cf-connecting-ip"),
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && IP_PATTERN.test(value)) return value;
  }
  return "unknown";
}

/** One-way hash so raw IP addresses are never stored in the rate-limit store. */
export async function hashIdentifier(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
