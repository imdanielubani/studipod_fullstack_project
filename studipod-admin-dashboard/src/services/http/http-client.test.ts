import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError } from './api-error';
import { createHttpClient, registerAuthBridge } from './http-client';

const BASE_URL = 'https://api.example.test/api/v1/';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createHttpClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    registerAuthBridge(null);
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('unwraps and validates the data envelope', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { id: 'a1' } }));
    const http = createHttpClient(BASE_URL);

    const result = await http.request('/admin/things', { schema: z.object({ id: z.string() }) });

    expect(result).toEqual({ id: 'a1' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.example.test/api/v1/admin/things');
    expect(init?.credentials).toBe('include');
    expect(new Headers(init?.headers).get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('maps the error envelope to an ApiError with code and meta', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect email or password.',
          meta: { attemptsRemaining: 2 },
          requestId: 'req_1',
        },
      }),
    );
    const http = createHttpClient(BASE_URL);

    const error = await http.request('admin/auth/sign-in', { method: 'POST' }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      requestId: 'req_1',
      meta: { attemptsRemaining: 2 },
    });
    expect((error as ApiError).isRetryable).toBe(false);
  });

  it('reports an unreachable server as a retryable network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const http = createHttpClient(BASE_URL);

    const error = (await http.request('health').catch((e) => e)) as ApiError;

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.isNetworkError).toBe(true);
    expect(error.isRetryable).toBe(true);
  });

  it('rejects a success response that does not match the schema', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { id: 42 } }));
    const http = createHttpClient(BASE_URL);

    const error = (await http
      .request('admin/things', { schema: z.object({ id: z.string() }) })
      .catch((e) => e)) as ApiError;

    expect(error.code).toBe('INVALID_RESPONSE');
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    const refreshAccessToken = vi.fn().mockResolvedValue('new-token');
    const onAuthenticationLost = vi.fn();
    registerAuthBridge({
      getAccessToken: () => 'old-token',
      refreshAccessToken,
      onAuthenticationLost,
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: '' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));
    const http = createHttpClient(BASE_URL);

    const result = await http.request('admin/me', {
      authenticated: true,
      schema: z.object({ ok: z.boolean() }),
    });

    expect(result).toEqual({ ok: true });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    const retryHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-token');
    expect(onAuthenticationLost).not.toHaveBeenCalled();
  });

  it('ends the session when the refresh fails', async () => {
    const onAuthenticationLost = vi.fn();
    registerAuthBridge({
      getAccessToken: () => 'old-token',
      refreshAccessToken: vi.fn().mockResolvedValue(null),
      onAuthenticationLost,
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: '' } }),
    );
    const http = createHttpClient(BASE_URL);

    const error = (await http
      .request('admin/me', { authenticated: true })
      .catch((e) => e)) as ApiError;

    expect(error.status).toBe(401);
    expect(onAuthenticationLost).toHaveBeenCalledTimes(1);
  });

  it('never attaches a token to unauthenticated requests', async () => {
    registerAuthBridge({
      getAccessToken: () => 'secret-token',
      refreshAccessToken: vi.fn(),
      onAuthenticationLost: vi.fn(),
    });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const http = createHttpClient(BASE_URL);

    await http.request('admin/auth/password/forgot', { method: 'POST', body: { email: 'a' } });

    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).has('Authorization')).toBe(false);
  });
});
