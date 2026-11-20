import { isJsonContentType, readJsonBody } from "@/lib/api/request";
import { errorResponse, successResponse } from "@/lib/api/response";
import { WAITLIST_MAX_BODY_BYTES } from "@/lib/constants";
import { describeError, logger } from "@/lib/logger";
import { parseWaitlistRequest } from "@/lib/validations/waitlist.schema";
import { registerForWaitlist } from "@/lib/waitlist/service";

/**
 * POST /api/waitlist — early-access registration.
 * Only POST is exported; Next.js answers any other method with 405.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return errorResponse("UNSUPPORTED_MEDIA_TYPE", "Requests must be sent as JSON.", 415);
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

  try {
    const result = await registerForWaitlist(parsed.data);
    if (result.status === "duplicate") {
      return errorResponse(
        "ALREADY_REGISTERED",
        "This email address is already on the waitlist.",
        409,
      );
    }
    return successResponse("You're on the waitlist.", 201);
  } catch (error) {
    logger.error("waitlist.registration_failed", describeError(error));
    return errorResponse(
      "SERVER_ERROR",
      "Something went wrong on our side. Please try again shortly.",
      500,
    );
  }
}
