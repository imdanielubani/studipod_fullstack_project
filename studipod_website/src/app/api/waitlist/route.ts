import { isJsonContentType, readJsonBody } from "@/lib/api/request";
import { errorResponse, successResponse } from "@/lib/api/response";
import { HONEYPOT_FIELD, WAITLIST_MAX_BODY_BYTES } from "@/lib/constants";
import { getServerEnv } from "@/lib/env";
import { describeError, logger } from "@/lib/logger";
import { allowedOriginsFor, isAllowedOrigin } from "@/lib/security/origin";
import { getClientIp, getWaitlistRateLimiter, hashIdentifier } from "@/lib/security/rate-limit";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/security/turnstile";
import { parseWaitlistRequest } from "@/lib/validations/waitlist.schema";
import { registerForWaitlist } from "@/lib/waitlist/service";

/**
 * POST /api/waitlist — early-access registration.
 * Only POST is exported; Next.js answers any other method with 405.
 *
 * Order of checks (cheapest first): same-origin → content type → rate limit →
 * body size → validation → honeypot → Turnstile → persistence.
 *
 * Everything runs inside one try block so that any unexpected failure —
 * including invalid server configuration — still returns the generic JSON
 * error envelope and never exposes internals.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUCCESS_MESSAGE = "You're on the waitlist.";

/** In production, Turnstile tokens must have been issued on the canonical host. */
function expectedTurnstileHostname(): string | undefined {
  const { NODE_ENV, NEXT_PUBLIC_SITE_URL } = getServerEnv();
  if (NODE_ENV !== "production" || !NEXT_PUBLIC_SITE_URL) return undefined;
  try {
    return new URL(NEXT_PUBLIC_SITE_URL).hostname;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    const siteUrl = getServerEnv().NEXT_PUBLIC_SITE_URL;
    if (!isAllowedOrigin(request, allowedOriginsFor(request, siteUrl))) {
      logger.warn("waitlist.cross_site_request_blocked");
      return errorResponse("FORBIDDEN", "This request is not allowed.", 403);
    }

    if (!isJsonContentType(request.headers.get("content-type"))) {
      return errorResponse("UNSUPPORTED_MEDIA_TYPE", "Requests must be sent as JSON.", 415);
    }

    const clientIp = getClientIp(request.headers);
    const rateLimit = await getWaitlistRateLimiter().limit(await hashIdentifier(clientIp));
    if (!rateLimit.success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      logger.warn("waitlist.rate_limited");
      return errorResponse(
        "RATE_LIMITED",
        "Too many attempts. Please wait a few minutes and try again.",
        429,
        { headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    const body = await readJsonBody(request, WAITLIST_MAX_BODY_BYTES);
    if (!body.ok) {
      return body.reason === "too_large"
        ? errorResponse("PAYLOAD_TOO_LARGE", "The request was too large.", 413)
        : errorResponse("INVALID_INPUT", "The request could not be read.", 400);
    }

    const parsed = parseWaitlistRequest(body.value);
    if (!parsed.success) {
      return errorResponse(
        "INVALID_INPUT",
        "Please check the highlighted fields and try again.",
        422,
        { fieldErrors: parsed.fieldErrors },
      );
    }

    // Honeypot: respond exactly like a success so automated clients learn nothing.
    if (parsed.data[HONEYPOT_FIELD]) {
      logger.warn("waitlist.honeypot_triggered");
      return successResponse(SUCCESS_MESSAGE, 201);
    }

    if (isTurnstileEnabled()) {
      const verification = await verifyTurnstileToken({
        token: parsed.data.turnstileToken,
        remoteIp: clientIp,
        expectedHostname: expectedTurnstileHostname(),
      });
      if (!verification.success) {
        logger.warn("waitlist.bot_verification_failed", { reason: verification.reason });
        return verification.reason === "unavailable"
          ? errorResponse(
              "BOT_VERIFICATION_FAILED",
              "We couldn't verify your request right now. Please try again shortly.",
              503,
            )
          : errorResponse(
              "BOT_VERIFICATION_FAILED",
              "We couldn't verify that you're human. Please try again.",
              403,
            );
      }
    }

    const result = await registerForWaitlist(parsed.data);
    if (result.status === "duplicate") {
      return errorResponse(
        "ALREADY_REGISTERED",
        "This email address is already on the waitlist.",
        409,
      );
    }
    return successResponse(SUCCESS_MESSAGE, 201);
  } catch (error) {
    logger.error("waitlist.registration_failed", describeError(error));
    return errorResponse(
      "SERVER_ERROR",
      "Something went wrong on our side. Please try again shortly.",
      500,
    );
  }
}
