import "server-only";
import { z } from "zod";

/**
 * Server-side environment validation. Values are parsed lazily on first use
 * (not at import time) so that `next build` and static pages do not require
 * runtime secrets, while any request that needs them fails fast and clearly.
 */
/** Optional string where an empty value (e.g. `KEY=` in .env) means "not configured". */
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1, { error: "DATABASE_URL is required." })
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      error: "DATABASE_URL must be a PostgreSQL connection string.",
    }),
  NEXT_PUBLIC_SITE_URL: optionalString,
  // Distributed rate limiting (required in production; see SECURITY.md).
  UPSTASH_REDIS_REST_URL: optionalString.refine(
    (value) => value === undefined || value.startsWith("https://"),
    { error: "UPSTASH_REDIS_REST_URL must be an https:// URL." },
  ),
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  // Standard Redis (e.g. self-hosted on a VPS). Takes precedence over Upstash.
  REDIS_URL: optionalString.refine(
    (value) => value === undefined || value.startsWith("redis://") || value.startsWith("rediss://"),
    { error: "REDIS_URL must start with redis:// or rediss://." },
  ),
  // Cloudflare Turnstile. The secret key never leaves the server.
  CLOUDFLARE_TURNSTILE_SECRET_KEY: optionalString,

  // --- Daily waitlist digest email (all optional; the digest is off until set) ---
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalString.refine(
    (value) => value === undefined || (/^\d+$/.test(value) && Number(value) <= 65535),
    { error: "SMTP_PORT must be a port number." },
  ),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  /** Sender, e.g. "StudiPod Waitlist <hello@studipod.com>" (must be the SMTP mailbox). */
  SMTP_FROM: optionalString,
  /** Digest recipient; defaults to the public contact address. */
  WAITLIST_DIGEST_TO: optionalString,
  /** Shared secret required to trigger the digest endpoint (32+ characters). */
  CRON_SECRET: optionalString.refine((value) => value === undefined || value.length >= 32, {
    error: "CRON_SECRET must be at least 32 characters.",
  }),
  /** Read-only reporting connection for the digest; falls back to DATABASE_URL. */
  DIGEST_DATABASE_URL: optionalString.refine(
    (value) => value === undefined || /^postgres(ql)?:\/\//.test(value),
    { error: "DIGEST_DATABASE_URL must be a PostgreSQL connection string." },
  ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Names only — never print values, which may contain credentials.
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Invalid server environment configuration:\n- ${problems.join("\n- ")}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
