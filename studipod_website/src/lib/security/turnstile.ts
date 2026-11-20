import "server-only";
import { TURNSTILE_ACTION, TURNSTILE_VERIFY_TIMEOUT_MS } from "@/lib/constants";
import { getServerEnv } from "@/lib/env";
import { describeError, logger } from "@/lib/logger";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileOutcome =
  | { success: true }
  | {
      success: false;
      reason:
        "missing-token" | "invalid-token" | "action-mismatch" | "hostname-mismatch" | "unavailable";
    };

interface SiteverifyResponse {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

function isSiteverifyResponse(value: unknown): value is SiteverifyResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { success?: unknown }).success === "boolean"
  );
}

/** Turnstile is enforced whenever the server-side secret key is configured. */
export function isTurnstileEnabled(): boolean {
  return Boolean(getServerEnv().CLOUDFLARE_TURNSTILE_SECRET_KEY);
}

interface VerifyOptions {
  token: string | undefined;
  remoteIp?: string;
  /** When set, the token must have been issued on this hostname. */
  expectedHostname?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Verifies a Turnstile token with Cloudflare's siteverify endpoint.
 * The secret is only ever sent server-to-server. Tokens are single-use and
 * must carry the expected action (and hostname, in production).
 */
export async function verifyTurnstileToken({
  token,
  remoteIp,
  expectedHostname,
  fetchImpl = fetch,
}: VerifyOptions): Promise<TurnstileOutcome> {
  const secret = getServerEnv().CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secret) return { success: false, reason: "unavailable" };
  if (!token) return { success: false, reason: "missing-token" };

  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp && remoteIp !== "unknown" ? remoteIp : undefined,
        idempotency_key: crypto.randomUUID(),
      }),
      signal: AbortSignal.timeout(TURNSTILE_VERIFY_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      logger.warn("turnstile.siteverify_http_error", { status: response.status });
      return { success: false, reason: "unavailable" };
    }

    const data: unknown = await response.json();
    if (!isSiteverifyResponse(data)) return { success: false, reason: "unavailable" };
    if (!data.success) return { success: false, reason: "invalid-token" };
    if (data.action !== TURNSTILE_ACTION) return { success: false, reason: "action-mismatch" };
    if (expectedHostname && data.hostname !== expectedHostname) {
      return { success: false, reason: "hostname-mismatch" };
    }
    return { success: true };
  } catch (error) {
    logger.warn("turnstile.siteverify_failed", describeError(error));
    return { success: false, reason: "unavailable" };
  }
}
