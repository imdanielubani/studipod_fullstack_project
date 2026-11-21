import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNodeRedisScriptClient,
  createRedisRateLimiter,
  type RedisScriptClient,
} from "@/lib/security/redis-rate-limit";

const fakeRedis = vi.hoisted(() => {
  const listeners: Record<string, (value?: unknown) => void> = {};
  const client = {
    isOpen: false,
    on: vi.fn((event: string, listener: (value?: unknown) => void) => {
      listeners[event] = listener;
      return client;
    }),
    connect: vi.fn(async () => {
      client.isOpen = true;
    }),
    eval: vi.fn(async () => [1, 1, 1_000]),
    close: vi.fn(async () => {
      client.isOpen = false;
    }),
  };
  return { client, listeners, createClient: vi.fn(() => client) };
});

vi.mock("redis", () => ({ createClient: fakeRedis.createClient }));

function scriptClient(reply: unknown | (() => Promise<unknown>)): RedisScriptClient {
  return {
    eval: vi.fn(
      typeof reply === "function" ? (reply as () => Promise<unknown>) : async () => reply,
    ),
    close: vi.fn(async () => undefined),
  };
}

const options = { requests: 5, windowMs: 600_000, prefix: "test:prefix", now: () => 1_000 };

describe("createRedisRateLimiter", () => {
  it("maps an allowed reply to a successful result", async () => {
    const limiter = createRedisRateLimiter(scriptClient([1, 2, 601_000]), options);
    expect(await limiter.limit("abc")).toEqual({
      success: true,
      limit: 5,
      remaining: 3,
      resetAt: 601_000,
    });
  });

  it("maps a blocked reply to a failed result", async () => {
    const limiter = createRedisRateLimiter(scriptClient(["0", "5", "500000"]), options);
    expect(await limiter.limit("abc")).toEqual({
      success: false,
      limit: 5,
      remaining: 0,
      resetAt: 500_000,
    });
  });

  it("namespaces the key and passes the window parameters to the script", async () => {
    const client = scriptClient([1, 1, 601_000]);
    await createRedisRateLimiter(client, options).limit("hashed-ip");

    const [script, call] = vi.mocked(client.eval).mock.calls[0] ?? [];
    expect(script).toContain("ZREMRANGEBYSCORE");
    expect(call?.keys).toEqual(["test:prefix:hashed-ip"]);
    expect(call?.arguments.slice(0, 3)).toEqual(["1000", "600000", "5"]);
    expect(call?.arguments[3]).toMatch(/^1000-[0-9a-f-]{36}$/);
  });

  it.each([null, "OK", [1, 2], [1, "x", 3]])("rejects the malformed reply %j", async (reply) => {
    const limiter = createRedisRateLimiter(scriptClient(reply), options);
    await expect(limiter.limit("abc")).rejects.toThrow("Unexpected Redis rate limit reply");
  });

  it("times out when Redis does not answer", async () => {
    const limiter = createRedisRateLimiter(
      scriptClient(() => new Promise(() => undefined)),
      { ...options, timeoutMs: 20 },
    );
    await expect(limiter.limit("abc")).rejects.toThrow("timed out");
  });
});

describe("createNodeRedisScriptClient", () => {
  beforeEach(() => {
    fakeRedis.client.isOpen = false;
    fakeRedis.client.connect.mockClear();
    fakeRedis.client.eval.mockClear();
  });

  it("configures fail-fast behaviour and connects lazily, once", async () => {
    const client = createNodeRedisScriptClient("redis://:secret@redis.internal:6379");
    expect(fakeRedis.createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "redis://:secret@redis.internal:6379",
        disableOfflineQueue: true,
      }),
    );
    expect(fakeRedis.client.connect).not.toHaveBeenCalled();

    await Promise.all([
      client.eval("return 1", { keys: [], arguments: [] }),
      client.eval("return 1", { keys: [], arguments: [] }),
    ]);
    expect(fakeRedis.client.connect).toHaveBeenCalledTimes(1);
    expect(fakeRedis.client.eval).toHaveBeenCalledTimes(2);

    await client.close();
    expect(fakeRedis.client.close).toHaveBeenCalled();
  });

  it("retries the connection after a failed attempt", async () => {
    const client = createNodeRedisScriptClient("redis://localhost:6379");
    fakeRedis.client.connect.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(client.eval("return 1", { keys: [], arguments: [] })).rejects.toThrow(
      "ECONNREFUSED",
    );
    await client.eval("return 1", { keys: [], arguments: [] });
    expect(fakeRedis.client.connect).toHaveBeenCalledTimes(2);
  });

  it("logs connection errors once per outage, without connection details", () => {
    createNodeRedisScriptClient("redis://:secret@localhost:6379");
    const error = Object.assign(new Error("connect ECONNREFUSED secret"), {
      code: "ECONNREFUSED",
    });

    fakeRedis.listeners.error?.(error);
    fakeRedis.listeners.error?.(error);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(console.warn).mock.calls[0]?.[0])).not.toContain("secret");

    fakeRedis.listeners.ready?.();
    fakeRedis.listeners.error?.(error);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });
});
