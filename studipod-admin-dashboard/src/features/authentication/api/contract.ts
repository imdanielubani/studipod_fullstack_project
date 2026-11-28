import { z } from 'zod';

/**
 * Administrator authentication contract expected from studipod-backend.
 *
 * STATUS: proposed. The backend authentication module is not implemented yet;
 * these paths, payloads and error codes are the dashboard's requirements for it
 * and are documented in docs/api/admin-authentication-contract.md. Change them
 * here only together with that document and the backend.
 *
 * Paths are relative to NEXT_PUBLIC_API_URL (for example https://api.studipod.com/api/v1).
 */
export const AUTH_ENDPOINTS = {
  signIn: 'admin/auth/sign-in',
  verifyCode: 'admin/auth/sign-in/verify',
  resendCode: 'admin/auth/sign-in/resend-code',
  refresh: 'admin/auth/refresh',
  signOut: 'admin/auth/sign-out',
  forgotPassword: 'admin/auth/password/forgot',
  validateResetToken: 'admin/auth/password/reset/validate',
  resetPassword: 'admin/auth/password/reset',
  accessRequests: 'admin/auth/access-requests',
} as const;

/** Stable error codes the screens branch on. */
export const AUTH_ERROR_CODES = {
  invalidCredentials: 'INVALID_CREDENTIALS',
  accountLocked: 'ACCOUNT_LOCKED',
  accessDenied: 'ADMIN_ACCESS_DENIED',
  codeIncorrect: 'CODE_INCORRECT',
  codeExpired: 'CODE_EXPIRED',
  challengeExpired: 'CHALLENGE_EXPIRED',
  resendTooSoon: 'RESEND_TOO_SOON',
  resetLinkInvalid: 'RESET_LINK_INVALID',
  passwordPolicy: 'PASSWORD_POLICY_VIOLATION',
  unauthenticated: 'UNAUTHENTICATED',
  rateLimited: 'RATE_LIMITED',
} as const;

const isoDateTime = z.iso.datetime({ offset: true });

export const signInChallengeSchema = z.object({
  challengeId: z.string().min(1),
  /** Email with the local part masked, for example "d••••@studipod.com". */
  maskedEmail: z.string().min(1),
  codeExpiresAt: isoDateTime,
  resendAvailableAt: isoDateTime,
});
export type SignInChallenge = z.infer<typeof signInChallengeSchema>;

export const codeResentSchema = signInChallengeSchema.pick({
  codeExpiresAt: true,
  resendAvailableAt: true,
});
export type CodeResent = z.infer<typeof codeResentSchema>;

export const administratorSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  roles: z.array(z.string()),
  /** Effective `resource:action` permissions resolved by the backend. */
  permissions: z.array(z.string()),
});
export type Administrator = z.infer<typeof administratorSchema>;

const signInEventSchema = z.object({
  at: isoDateTime,
  location: z.string().nullable().optional(),
});

export const sessionSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: isoDateTime,
  administrator: administratorSchema,
  /** When and where this session signed in (account menu footer). */
  currentSignIn: signInEventSchema.nullable().optional(),
  /** Previous successful sign-in, shown once after signing in. */
  lastSignIn: signInEventSchema.nullable().optional(),
});
export type Session = z.infer<typeof sessionSchema>;

export const resetTokenInfoSchema = z.object({ email: z.email() });
export type ResetTokenInfo = z.infer<typeof resetTokenInfoSchema>;

/** `meta` of ADMIN_ACCESS_DENIED: credentials were valid but the account is not an admin. */
export const accessDeniedMetaSchema = z.object({
  reason: z.enum(['NOT_STAFF', 'NO_ADMIN_ROLE']),
  email: z.email(),
  attemptedAt: isoDateTime,
  /** Short-lived token that lets a staff member without a role request access. */
  accessRequestToken: z.string().min(1).nullable().optional(),
});
export type AccessDeniedMeta = z.infer<typeof accessDeniedMetaSchema>;

export const attemptsMetaSchema = z.object({ attemptsRemaining: z.number().int().min(0) });
export const lockedMetaSchema = z.object({ lockedUntil: isoDateTime });
export const resendMetaSchema = z.object({ resendAvailableAt: isoDateTime });
export const passwordPolicyMetaSchema = z.object({
  rule: z.enum(['TOO_SHORT', 'TOO_LONG', 'RECENTLY_USED', 'CONTAINS_PERSONAL_INFO', 'BREACHED']),
});
export type PasswordPolicyRule = z.infer<typeof passwordPolicyMetaSchema>['rule'];

/** Operations the dashboard needs. Implemented over HTTP, or by the development mock. */
export interface AuthApi {
  signIn(input: { email: string; password: string }): Promise<SignInChallenge>;
  verifyCode(input: { challengeId: string; code: string }): Promise<Session>;
  resendCode(input: { challengeId: string }): Promise<CodeResent>;
  /** Exchanges the HttpOnly refresh cookie for a new session. Rejects with 401 when signed out. */
  refresh(): Promise<Session>;
  signOut(input: { accessToken: string | null }): Promise<void>;
  forgotPassword(input: { email: string }): Promise<void>;
  validateResetToken(input: { token: string }): Promise<ResetTokenInfo>;
  resetPassword(input: { token: string; password: string }): Promise<void>;
  requestAccess(input: { accessRequestToken: string }): Promise<void>;
}
