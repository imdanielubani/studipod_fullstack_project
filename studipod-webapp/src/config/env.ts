import { z } from 'zod';

/**
 * Public runtime configuration.
 *
 * Only NEXT_PUBLIC_* values belong here: they are inlined into the browser bundle at
 * build time, so they must never contain secrets. Each variable is referenced
 * explicitly because Next.js only inlines static `process.env.NAME` accesses.
 *
 * `next.config.ts` validates these during `next build`, so an image built without its
 * build arguments fails instead of shipping empty URLs.
 */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

/** Plain http/ws is allowed only for local development and CI hosts. */
const secureUnlessLocal = (secureProtocol: 'https:' | 'wss:') => (value: string) => {
  const url = new URL(value);
  return url.protocol === secureProtocol || LOCAL_HOSTNAMES.has(url.hostname);
};

const httpUrl = z
  .url({ protocol: /^https?$/ })
  .refine(secureUnlessLocal('https:'), 'Must use https:// outside localhost');
const socketUrl = z
  .url({ protocol: /^wss?$/ })
  .refine(secureUnlessLocal('wss:'), 'Must use wss:// outside localhost');

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: httpUrl,
  NEXT_PUBLIC_API_URL: httpUrl,
  NEXT_PUBLIC_WS_URL: socketUrl,
  NEXT_PUBLIC_LIVEKIT_URL: socketUrl,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  });

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => `${issue.path.join('.')} (${issue.message})`)
      .join(', ');
    throw new Error(`Invalid public environment configuration: ${fields}`);
  }

  return result.data;
}
