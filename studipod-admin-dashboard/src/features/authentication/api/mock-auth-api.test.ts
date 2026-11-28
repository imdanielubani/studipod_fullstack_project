import { describe, expect, it } from 'vitest';

import { ApiError } from '@/services/http/api-error';

import { AUTH_ERROR_CODES, sessionSchema, signInChallengeSchema } from './contract';
import {
  createMockAuthApi,
  MOCK_EXPIRED_CODE,
  MOCK_PASSWORD,
  MOCK_RESET_TOKENS,
  MOCK_VALID_CODE,
} from './mock-auth-api';

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.catch((e: unknown) => e);
  if (!(error instanceof ApiError)) throw new Error('Expected an ApiError');
  return error;
}

describe('development auth mock', () => {
  const api = createMockAuthApi({ latencyMs: 0 });

  it('returns a challenge that satisfies the contract', async () => {
    const challenge = await api.signIn({
      email: 'daniel.ubani@studipod.com',
      password: MOCK_PASSWORD,
    });
    expect(signInChallengeSchema.parse(challenge).maskedEmail).toBe('d••••@studipod.com');
  });

  it('counts down attempts and then locks the account', async () => {
    const email = 'counter@studipod.com';
    const first = await rejection(api.signIn({ email, password: 'wrong' }));
    expect(first.code).toBe(AUTH_ERROR_CODES.invalidCredentials);
    expect(first.meta).toEqual({ attemptsRemaining: 4 });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await rejection(api.signIn({ email, password: 'wrong' }));
    }
    const locked = await rejection(api.signIn({ email, password: 'wrong' }));
    expect(locked.code).toBe(AUTH_ERROR_CODES.accountLocked);
  });

  it('denies valid non-staff and role-less accounts with the reason', async () => {
    const candidate = await rejection(
      api.signIn({ email: 'chiamaka@gmail.com', password: MOCK_PASSWORD }),
    );
    expect(candidate.code).toBe(AUTH_ERROR_CODES.accessDenied);
    expect(candidate.meta).toMatchObject({ reason: 'NOT_STAFF', accessRequestToken: null });

    const noRole = await rejection(
      api.signIn({ email: 'no-role@studipod.com', password: MOCK_PASSWORD }),
    );
    expect(noRole.meta).toMatchObject({ reason: 'NO_ADMIN_ROLE' });
  });

  it('verifies the valid code into a contract-shaped session', async () => {
    const { challengeId } = await api.signIn({
      email: 'daniel.ubani@studipod.com',
      password: MOCK_PASSWORD,
    });

    const wrong = await rejection(api.verifyCode({ challengeId, code: '999999' }));
    expect(wrong.code).toBe(AUTH_ERROR_CODES.codeIncorrect);

    const session = await api.verifyCode({ challengeId, code: MOCK_VALID_CODE });
    expect(sessionSchema.parse(session).administrator.firstName).toBe('Daniel');

    const reused = await rejection(api.verifyCode({ challengeId, code: MOCK_VALID_CODE }));
    expect(reused.code).toBe(AUTH_ERROR_CODES.challengeExpired);
  });

  it('reports the expired-code scenario', async () => {
    const { challengeId } = await api.signIn({
      email: 'daniel.ubani@studipod.com',
      password: MOCK_PASSWORD,
    });
    const expired = await rejection(api.verifyCode({ challengeId, code: MOCK_EXPIRED_CODE }));
    expect(expired.code).toBe(AUTH_ERROR_CODES.codeExpired);
  });

  it('validates reset tokens and rejects recently used passwords', async () => {
    await expect(api.validateResetToken({ token: MOCK_RESET_TOKENS.valid })).resolves.toEqual({
      email: 'daniel.ubani@studipod.com',
    });
    const expired = await rejection(api.validateResetToken({ token: MOCK_RESET_TOKENS.expired }));
    expect(expired.code).toBe(AUTH_ERROR_CODES.resetLinkInvalid);

    const reused = await rejection(
      api.resetPassword({ token: MOCK_RESET_TOKENS.valid, password: 'my old password 1' }),
    );
    expect(reused.meta).toEqual({ rule: 'RECENTLY_USED' });
  });
});
