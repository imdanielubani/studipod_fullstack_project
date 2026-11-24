import { z } from 'zod';

/**
 * Public runtime configuration.
 *
 * Only NEXT_PUBLIC_* values belong here: they are inlined into the browser bundle
 * at build time, so they must never contain secrets. Each variable is referenced
 * explicitly because Next.js only inlines static `process.env.NAME` accesses.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_WS_URL: z.url({ protocol: /^wss?$/ }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  });

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid public environment configuration: ${fields}`);
  }

  return result.data;
}
