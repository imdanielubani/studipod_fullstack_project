import "server-only";

/**
 * Cross-site request protection for state-changing API routes.
 *
 * The waitlist API uses no cookies or sessions, so classic CSRF (riding a
 * victim's session) does not apply; this check still blocks other sites from
 * submitting to the endpoint from a visitor's browser. Browsers always send
 * Fetch Metadata and/or Origin on cross-site POSTs, so both are verified.
 */
export function isAllowedOrigin(request: Request, allowedOrigins: readonly string[]): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  const origin = request.headers.get("origin");
  if (!origin) {
    // Non-browser clients (curl, server-to-server) omit Origin; they are still
    // subject to rate limiting, validation and bot verification.
    return true;
  }
  return allowedOrigins.includes(origin);
}

/** Origins allowed to call the API: the request's own origin and the configured site URL. */
export function allowedOriginsFor(request: Request, siteUrl: string | undefined): string[] {
  const origins = new Set<string>([new URL(request.url).origin]);
  if (siteUrl) {
    try {
      origins.add(new URL(siteUrl).origin);
    } catch {
      // Ignore a malformed configuration value; the request origin still applies.
    }
  }
  return [...origins];
}
