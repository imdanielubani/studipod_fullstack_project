/** Field limits shared by client and server validation and the database schema. */
export const WAITLIST_LIMITS = {
  fullNameMin: 2,
  fullNameMax: 100,
  emailMax: 254,
  categoryMax: 100,
  turnstileTokenMax: 2048,
} as const;

/** Maximum accepted request body for the waitlist endpoint, in bytes. */
export const WAITLIST_MAX_BODY_BYTES = 4 * 1024;

/** Sliding-window rate limit applied per client IP to waitlist submissions. */
export const WAITLIST_RATE_LIMIT = {
  requests: 5,
  windowSeconds: 60 * 10,
} as const;

/** Name of the hidden honeypot field. Real users never fill it in. */
export const HONEYPOT_FIELD = "company" as const;

export const WAITLIST_API_PATH = "/api/waitlist" as const;
