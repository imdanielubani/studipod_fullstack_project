import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { createSmtpMailer, getSmtpSettings } from "@/lib/digest/mailer";
import { sendWaitlistDigest } from "@/lib/digest/service";
import { getServerEnv } from "@/lib/env";
import { describeError, logger } from "@/lib/logger";
import { isValidBearerToken } from "@/lib/security/bearer";

/**
 * GET|POST /api/internal/waitlist-digest — emails the daily waitlist digest.
 *
 * Called by a scheduler (a Dokploy schedule/cron on a VPS, or Vercel Cron),
 * never by browsers. Requires `Authorization: Bearer <CRON_SECRET>`; it is
 * disabled entirely until CRON_SECRET and the SMTP settings are configured.
 * GET is accepted because Vercel Cron issues GET requests.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

function failure(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message } },
    { status, headers: NO_STORE },
  );
}

async function handleDigest(request: Request) {
  try {
    const env = getServerEnv();
    if (!env.CRON_SECRET) {
      return failure(503, "NOT_CONFIGURED", "The digest is not configured.");
    }
    if (!isValidBearerToken(request.headers.get("authorization"), env.CRON_SECRET)) {
      logger.warn("waitlist_digest.unauthorized");
      return failure(401, "UNAUTHORIZED", "Unauthorized.");
    }

    const smtp = getSmtpSettings(env);
    if (!smtp) {
      return failure(503, "NOT_CONFIGURED", "Email delivery is not configured.");
    }

    const result = await sendWaitlistDigest({
      mailer: createSmtpMailer(smtp),
      recipient: env.WAITLIST_DIGEST_TO ?? siteConfig.links.contactEmail,
      siteUrl: siteConfig.url,
    });
    logger.info("waitlist_digest.completed", {
      status: result.status,
      entryCount: result.status === "sent" ? result.entryCount : 0,
    });
    return NextResponse.json({ success: true, data: result, error: null }, { headers: NO_STORE });
  } catch (error) {
    logger.error("waitlist_digest.failed", describeError(error));
    return failure(500, "SERVER_ERROR", "The digest could not be sent.");
  }
}

export const GET = handleDigest;
export const POST = handleDigest;
