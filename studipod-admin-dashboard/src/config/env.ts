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

const optionalUrl = z.url({ protocol: /^https?$/ });
const optionalEmail = z.email();

export type PublicLinks = {
  /** Candidate web app, offered to candidate accounts that reach the console. */
  webAppUrl: string | null;
  /** Mailbox that reaches the Super Admins, for "Contact a Super Admin" links. */
  adminSupportEmail: string | null;
  /** Help centre for administrators, linked from the account menu. */
  adminHelpCentreUrl: string | null;
};

/**
 * Optional public links. Each value is validated on its own and resolves to null
 * when missing or invalid, so an unset link hides its control instead of failing.
 */
export function getPublicLinks(): PublicLinks {
  const webApp = optionalUrl.safeParse(process.env.NEXT_PUBLIC_WEBAPP_URL);
  const support = optionalEmail.safeParse(process.env.NEXT_PUBLIC_ADMIN_SUPPORT_EMAIL);
  const helpCentre = optionalUrl.safeParse(process.env.NEXT_PUBLIC_ADMIN_HELP_URL);
  return {
    webAppUrl: webApp.success ? webApp.data : null,
    adminSupportEmail: support.success ? support.data : null,
    adminHelpCentreUrl: helpCentre.success ? helpCentre.data : null,
  };
}
