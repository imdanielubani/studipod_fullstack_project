import { describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '@/services/http/http-client';

import { AUTH_ENDPOINTS } from './contract';
import { createHttpAuthApi } from './http-auth-api';

function fakeClient() {
  const request = vi.fn().mockResolvedValue(undefined);
  return { http: { request } as unknown as HttpClient, request };
}

describe('createHttpAuthApi', () => {
  it('posts credentials to the sign-in endpoint with a response schema', async () => {
    const { http, request } = fakeClient();
    await createHttpAuthApi(http).signIn({ email: 'a@studipod.com', password: 'p' });

    const [path, options] = request.mock.calls[0] ?? [];
    expect(path).toBe(AUTH_ENDPOINTS.signIn);
    expect(options).toMatchObject({
      method: 'POST',
      body: { email: 'a@studipod.com', password: 'p' },
    });
    expect(options.schema).toBeDefined();
    expect(options.authenticated).toBeUndefined();
  });

  it('sends the access token explicitly on sign-out instead of triggering a refresh', async () => {
    const { http, request } = fakeClient();
    await createHttpAuthApi(http).signOut({ accessToken: 'tok' });

    const [path, options] = request.mock.calls[0] ?? [];
    expect(path).toBe(AUTH_ENDPOINTS.signOut);
    expect(options.headers).toEqual({ Authorization: 'Bearer tok' });
    expect(options.authenticated).toBeUndefined();
  });

  it.each([
    ['verifyCode', AUTH_ENDPOINTS.verifyCode, { challengeId: 'c', code: '123456' }],
    ['resendCode', AUTH_ENDPOINTS.resendCode, { challengeId: 'c' }],
    ['forgotPassword', AUTH_ENDPOINTS.forgotPassword, { email: 'a@studipod.com' }],
    ['validateResetToken', AUTH_ENDPOINTS.validateResetToken, { token: 't' }],
    ['resetPassword', AUTH_ENDPOINTS.resetPassword, { token: 't', password: 'p' }],
    ['requestAccess', AUTH_ENDPOINTS.accessRequests, { accessRequestToken: 'r' }],
  ] as const)('%s posts to %s', async (method, path, input) => {
    const { http, request } = fakeClient();
    const api = createHttpAuthApi(http) as unknown as Record<string, (arg: unknown) => unknown>;
    await api[method]?.(input);
    expect(request).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ method: 'POST', body: input }),
    );
  });

  it('refreshes with the cookie only (no body)', async () => {
    const { http, request } = fakeClient();
    await createHttpAuthApi(http).refresh();
    expect(request).toHaveBeenCalledWith(
      AUTH_ENDPOINTS.refresh,
      expect.not.objectContaining({ body: expect.anything() }),
    );
  });
});
