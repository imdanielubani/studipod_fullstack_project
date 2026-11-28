import { ApiError, CLIENT_ERROR_CODES } from '@/services/http/api-error';

import { isWorkEmail, maskEmail } from '../lib/email';
import { AUTH_ERROR_CODES, type AuthApi, type Session, type SignInChallenge } from './contract';

/**
 * DEVELOPMENT-ONLY in-memory implementation of the admin authentication contract.
 *
 * It lets every screen state be exercised before the backend module exists.
 * It is loaded only when NODE_ENV is not "production" and NEXT_PUBLIC_AUTH_MOCK=true
 * (see ./index.ts), so production bundles never contain it.
 * Scenarios are listed in docs/api/admin-authentication-contract.md.
 */

export const MOCK_PASSWORD = 'correct-horse-battery';
export const MOCK_VALID_CODE = '123456';
export const MOCK_EXPIRED_CODE = '000000';
export const MOCK_RESET_TOKENS = { valid: 'valid-reset-token', expired: 'expired-reset-token' };

const DEFAULT_LATENCY_MS = 500;
const MAX_ATTEMPTS = 5;
const CODE_LIFETIME_MS = 10 * 60_000;
const RESEND_COOLDOWN_MS = 45_000;
const LOCK_MS = 15 * 60_000;
const ACCESS_TOKEN_LIFETIME_MS = 10 * 60_000;
const SESSION_STORAGE_KEY = 'studipod-admin:mock-refresh-session';

type Challenge = { email: string; attemptsRemaining: number; codeExpiresAt: number };

const failedSignIns = new Map<string, number>();
const lockedUntil = new Map<string, number>();
const challenges = new Map<string, Challenge>();

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function fail(status: number, code: string, message: string, meta?: Record<string, unknown>) {
  return new ApiError({ status, code, message, meta, requestId: `req_mock_${randomId(6)}` });
}

function randomId(length: number): string {
  return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, length);
}

function nameFromEmail(email: string): { firstName: string; lastName: string } {
  const [first = 'Admin', last = 'User'] = (email.split('@')[0] ?? '').split(/[._-]+/);
  const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  return { firstName: title(first), lastName: title(last) };
}

function buildSession(email: string): Session {
  const now = Date.now();
  return {
    accessToken: `mock.${randomId(24)}`,
    accessTokenExpiresAt: iso(now + ACCESS_TOKEN_LIFETIME_MS),
    administrator: {
      id: `adm_${randomId(12)}`,
      email,
      ...nameFromEmail(email),
      roles: ['super-admin'],
      permissions: ['*'],
    },
    lastSignIn: { at: iso(now - 26 * 60 * 60_000), location: 'Lagos, NG' },
  };
}

function readStoredEmail(): string | null {
  try {
    return globalThis.sessionStorage?.getItem(SESSION_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function storeEmail(email: string | null): void {
  try {
    if (email) globalThis.sessionStorage?.setItem(SESSION_STORAGE_KEY, email);
    else globalThis.sessionStorage?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the mock session simply does not survive reloads.
  }
}

function newChallenge(email: string): SignInChallenge {
  const now = Date.now();
  const challengeId = `chl_${randomId(16)}`;
  challenges.set(challengeId, {
    email,
    attemptsRemaining: MAX_ATTEMPTS - 1,
    codeExpiresAt: now + CODE_LIFETIME_MS,
  });
  return {
    challengeId,
    maskedEmail: maskEmail(email),
    codeExpiresAt: iso(now + CODE_LIFETIME_MS),
    resendAvailableAt: iso(now + RESEND_COOLDOWN_MS),
  };
}

function accessDenied(email: string, reason: 'NOT_STAFF' | 'NO_ADMIN_ROLE') {
  return fail(403, AUTH_ERROR_CODES.accessDenied, 'This account cannot use the admin console.', {
    reason,
    email,
    attemptedAt: iso(Date.now()),
    accessRequestToken: reason === 'NO_ADMIN_ROLE' ? `arq_${randomId(16)}` : null,
  });
}

function assertNotLocked(email: string): void {
  const until = lockedUntil.get(email);
  if (until && until > Date.now()) {
    throw fail(423, AUTH_ERROR_CODES.accountLocked, 'Account temporarily locked.', {
      lockedUntil: iso(until),
    });
  }
}

/** `latencyMs` simulates network time so loading states are visible (tests pass 0). */
export function createMockAuthApi({ latencyMs = DEFAULT_LATENCY_MS } = {}): AuthApi {
  const delay = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, latencyMs));

  return {
    async signIn({ email, password }) {
      await delay();
      const normalised = email.trim().toLowerCase();
      if (normalised === 'offline@studipod.com') {
        throw new ApiError({
          status: 0,
          code: CLIENT_ERROR_CODES.network,
          message: 'The server could not be reached.',
        });
      }
      if (normalised === 'locked@studipod.com') {
        lockedUntil.set(normalised, Date.now() + LOCK_MS - 8_000);
      }
      assertNotLocked(normalised);

      if (password !== MOCK_PASSWORD) {
        const failures = (failedSignIns.get(normalised) ?? 0) + 1;
        failedSignIns.set(normalised, failures);
        if (failures >= MAX_ATTEMPTS) {
          failedSignIns.delete(normalised);
          lockedUntil.set(normalised, Date.now() + LOCK_MS);
          assertNotLocked(normalised);
        }
        throw fail(401, AUTH_ERROR_CODES.invalidCredentials, 'Incorrect email or password.', {
          attemptsRemaining: MAX_ATTEMPTS - failures,
        });
      }

      failedSignIns.delete(normalised);
      if (!isWorkEmail(normalised)) throw accessDenied(normalised, 'NOT_STAFF');
      if (normalised === 'no-role@studipod.com') throw accessDenied(normalised, 'NO_ADMIN_ROLE');
      return newChallenge(normalised);
    },

    async verifyCode({ challengeId, code }) {
      await delay();
      const challenge = challenges.get(challengeId);
      if (!challenge) {
        throw fail(410, AUTH_ERROR_CODES.challengeExpired, 'Sign in again to get a new code.');
      }
      if (code === MOCK_EXPIRED_CODE || challenge.codeExpiresAt <= Date.now()) {
        throw fail(410, AUTH_ERROR_CODES.codeExpired, 'This code has expired.');
      }
      if (code !== MOCK_VALID_CODE) {
        if (challenge.attemptsRemaining <= 0) {
          challenges.delete(challengeId);
          throw fail(410, AUTH_ERROR_CODES.challengeExpired, 'Sign in again to get a new code.');
        }
        challenges.set(challengeId, {
          ...challenge,
          attemptsRemaining: challenge.attemptsRemaining - 1,
        });
        throw fail(400, AUTH_ERROR_CODES.codeIncorrect, 'That code is incorrect.', {
          attemptsRemaining: challenge.attemptsRemaining,
        });
      }
      challenges.delete(challengeId);
      storeEmail(challenge.email);
      return buildSession(challenge.email);
    },

    async resendCode({ challengeId }) {
      await delay();
      const challenge = challenges.get(challengeId);
      if (!challenge) {
        throw fail(410, AUTH_ERROR_CODES.challengeExpired, 'Sign in again to get a new code.');
      }
      const now = Date.now();
      challenges.set(challengeId, {
        ...challenge,
        attemptsRemaining: MAX_ATTEMPTS - 1,
        codeExpiresAt: now + CODE_LIFETIME_MS,
      });
      return {
        codeExpiresAt: iso(now + CODE_LIFETIME_MS),
        resendAvailableAt: iso(now + RESEND_COOLDOWN_MS),
      };
    },

    async refresh() {
      await delay();
      const email = readStoredEmail();
      if (!email) throw fail(401, AUTH_ERROR_CODES.unauthenticated, 'Not signed in.');
      return { ...buildSession(email), lastSignIn: null };
    },

    async signOut() {
      await delay();
      storeEmail(null);
    },

    async forgotPassword() {
      // Always succeeds: the response never reveals whether an account exists.
      await delay();
    },

    async validateResetToken({ token }) {
      await delay();
      if (token !== MOCK_RESET_TOKENS.valid) {
        throw fail(410, AUTH_ERROR_CODES.resetLinkInvalid, 'This link has expired.');
      }
      return { email: 'daniel.ubani@studipod.com' };
    },

    async resetPassword({ token, password }) {
      await delay();
      if (token !== MOCK_RESET_TOKENS.valid) {
        throw fail(410, AUTH_ERROR_CODES.resetLinkInvalid, 'This link has expired.');
      }
      if (password.toLowerCase().includes('password')) {
        throw fail(422, AUTH_ERROR_CODES.passwordPolicy, 'Choose a password you have not used.', {
          rule: 'RECENTLY_USED',
        });
      }
      storeEmail(null);
    },

    async requestAccess() {
      await delay();
    },
  };
}
