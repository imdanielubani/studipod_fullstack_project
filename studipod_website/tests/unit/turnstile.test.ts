import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as TurnstileModuleTypes from "@/lib/security/turnstile";

type TurnstileModule = typeof TurnstileModuleTypes;

/** Fresh import so the cached server environment picks up stubbed variables. */
async function loadTurnstile(secret: string | undefined): Promise<TurnstileModule> {
  vi.resetModules();
  if (secret) vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", secret);
  return import("@/lib/security/turnstile");
}

function siteverifyResponse(body: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("verifyTurnstileToken", () => {
  let turnstile: TurnstileModule;

  beforeEach(async () => {
    turnstile = await loadTurnstile("test-secret");
  });

  it("accepts a valid token issued for the waitlist action", async () => {
    const fetchImpl = siteverifyResponse({ success: true, action: "waitlist", hostname: "a.test" });
    const result = await turnstile.verifyTurnstileToken({
      token: "token",
      remoteIp: "203.0.113.7",
      fetchImpl,
    });

    expect(result).toEqual({ success: true });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({
      secret: "test-secret",
      response: "token",
      remoteip: "203.0.113.7",
    });
    expect(sent.idempotency_key).toEqual(expect.any(String));
  });

  it("does not forward an unknown client IP", async () => {
    const fetchImpl = siteverifyResponse({ success: true, action: "waitlist" });
    await turnstile.verifyTurnstileToken({ token: "token", remoteIp: "unknown", fetchImpl });
    const sent = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(sent.remoteip).toBeUndefined();
  });

  it("rejects a missing token without calling Cloudflare", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const result = await turnstile.verifyTurnstileToken({ token: undefined, fetchImpl });
    expect(result).toEqual({ success: false, reason: "missing-token" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects tokens Cloudflare reports as invalid", async () => {
    const fetchImpl = siteverifyResponse({
      success: false,
      "error-codes": ["invalid-input-response"],
    });
    expect(await turnstile.verifyTurnstileToken({ token: "bad", fetchImpl })).toEqual({
      success: false,
      reason: "invalid-token",
    });
  });

  it("rejects tokens issued for a different action", async () => {
    const fetchImpl = siteverifyResponse({ success: true, action: "login" });
    expect(await turnstile.verifyTurnstileToken({ token: "t", fetchImpl })).toEqual({
      success: false,
      reason: "action-mismatch",
    });
  });

  it("rejects tokens issued on another hostname when a hostname is expected", async () => {
    const fetchImpl = siteverifyResponse({
      success: true,
      action: "waitlist",
      hostname: "evil.example",
    });
    const result = await turnstile.verifyTurnstileToken({
      token: "t",
      expectedHostname: "studipod.example",
      fetchImpl,
    });
    expect(result).toEqual({ success: false, reason: "hostname-mismatch" });
  });

  it.each([
    ["an HTTP error", () => siteverifyResponse({}, 500)],
    ["a malformed body", () => siteverifyResponse({ unexpected: true })],
    ["a network failure", () => vi.fn<typeof fetch>().mockRejectedValue(new Error("timeout"))],
  ])("reports the verifier as unavailable on %s", async (_label, makeFetch) => {
    expect(await turnstile.verifyTurnstileToken({ token: "t", fetchImpl: makeFetch() })).toEqual({
      success: false,
      reason: "unavailable",
    });
  });
});

describe("isTurnstileEnabled", () => {
  it("is enabled only when the secret key is configured", async () => {
    expect((await loadTurnstile("secret")).isTurnstileEnabled()).toBe(true);
    vi.unstubAllEnvs();
    expect((await loadTurnstile(undefined)).isTurnstileEnabled()).toBe(false);
  });

  it("reports unavailable when called without a configured secret", async () => {
    const turnstile = await loadTurnstile(undefined);
    expect(await turnstile.verifyTurnstileToken({ token: "t" })).toEqual({
      success: false,
      reason: "unavailable",
    });
  });
});
