import { WAITLIST_API_PATH } from "@/lib/constants";
import type { WaitlistErrorResponse, WaitlistResponse } from "@/types/waitlist";

export interface WaitlistSubmission {
  fullName: string;
  email: string;
  examinationCategory?: string;
  /** Honeypot field — always empty for real users. */
  company?: string;
  /** Cloudflare Turnstile response token (single-use). */
  turnstileToken?: string;
}

const NETWORK_ERROR: WaitlistErrorResponse = {
  success: false,
  data: null,
  error: {
    code: "SERVER_ERROR",
    message: "We couldn't reach the server. Please check your connection and try again.",
  },
};

const UNEXPECTED_ERROR: WaitlistErrorResponse = {
  success: false,
  data: null,
  error: { code: "SERVER_ERROR", message: "Something went wrong. Please try again shortly." },
};

function isWaitlistResponse(value: unknown): value is WaitlistResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.success === true) return typeof candidate.data === "object";
  if (candidate.success === false) {
    const error = candidate.error as Record<string, unknown> | null;
    return typeof error?.code === "string" && typeof error.message === "string";
  }
  return false;
}

/**
 * Posts a waitlist registration and always resolves to a typed response
 * envelope — network failures and unexpected payloads become friendly errors.
 */
export async function submitWaitlist(
  submission: WaitlistSubmission,
  fetchImpl: typeof fetch = fetch,
): Promise<WaitlistResponse> {
  let response: Response;
  try {
    response = await fetchImpl(WAITLIST_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(submission),
      credentials: "same-origin",
    });
  } catch {
    return NETWORK_ERROR;
  }

  try {
    const body: unknown = await response.json();
    return isWaitlistResponse(body) ? body : UNEXPECTED_ERROR;
  } catch {
    return UNEXPECTED_ERROR;
  }
}
