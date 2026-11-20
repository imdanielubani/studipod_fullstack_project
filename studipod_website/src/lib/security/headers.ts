/**
 * HTTP security header policy.
 *
 * Imported by both next.config.ts (static headers) and src/proxy.ts (per-request
 * CSP), so it must stay dependency-free: relative imports only, no "server-only".
 */

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

interface CspOptions {
  nonce: string;
  isDevelopment: boolean;
  /** Add upgrade-insecure-requests (only meaningful when served over HTTPS). */
  upgradeInsecureRequests: boolean;
}

/**
 * Strict, nonce-based Content-Security-Policy.
 *
 * - Scripts: only those carrying this request's nonce, plus scripts they load
 *   ('strict-dynamic' — this is how the Turnstile loader is permitted).
 *   No 'unsafe-inline'; 'unsafe-eval' only in development (React debugging).
 * - Styles: stylesheets and <style> elements need 'self' or the nonce. Inline
 *   style *attributes* are allowed because animation libraries set transforms
 *   and opacity through the style attribute; they cannot execute script.
 * - Framing: the site cannot be framed (frame-ancestors 'none'); it may only
 *   embed the Turnstile challenge frame.
 */
export function buildContentSecurityPolicy({
  nonce,
  isDevelopment,
  upgradeInsecureRequests,
}: CspOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", `'nonce-${nonce}'`],
    "style-src-elem": ["'self'", `'nonce-${nonce}'`],
    "style-src-attr": ["'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", TURNSTILE_ORIGIN],
    "frame-src": [TURNSTILE_ORIGIN],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(
    ([directive, sources]) => `${directive} ${sources.join(" ")}`,
  );
  if (upgradeInsecureRequests) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** CSP for JSON API responses, which never need to load or execute anything. */
export const API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'";

export interface HeaderEntry {
  key: string;
  value: string;
}

/** Headers applied to every response (see next.config.ts). */
export function securityHeaders({ isProduction }: { isProduction: boolean }): HeaderEntry[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Legacy clickjacking protection for browsers without CSP frame-ancestors.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: [
        "accelerometer=()",
        "browsing-topics=()",
        "camera=()",
        "display-capture=()",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "payment=()",
        "usb=()",
      ].join(", "),
    },
    // HSTS only in production; browsers ignore it over plain HTTP anyway.
    ...(isProduction
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
      : []),
  ];
}
