import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/http/api-error';

import type { AuthApi, Session } from '../api';
import type * as AuthApiModule from '../api';
import { useAuthFlowStore } from './auth-flow-store';
import { INACTIVITY_TIMEOUT_MS, writeLastActivity } from './inactivity';
import {
  establishSession,
  hasIdleSessionExpired,
  onSessionCleared,
  refreshSession,
  signOut,
} from './session-manager';
import { useSessionStore } from './session-store';

const api = {
  refresh: vi.fn<AuthApi['refresh']>(),
  signOut: vi.fn<AuthApi['signOut']>(),
};

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthApiModule>()),
  loadAuthApi: () => Promise.resolve(api),
}));

const session: Session = {
  accessToken: 'token-1',
  accessTokenExpiresAt: '2026-11-28T10:10:00Z',
  administrator: {
    id: 'adm_1',
    email: 'daniel.ubani@studipod.com',
    firstName: 'Daniel',
    lastName: 'Ubani',
    roles: ['super-admin'],
    permissions: ['users:read'],
  },
  lastSignIn: null,
};

describe('session manager', () => {
  beforeEach(() => {
    api.refresh.mockReset();
    api.signOut.mockReset().mockResolvedValue(undefined);
    useSessionStore.setState({ status: 'unknown', accessToken: null, administrator: null });
    useAuthFlowStore.getState().reset();
  });

  it('shares one refresh request between concurrent callers', async () => {
    api.refresh.mockResolvedValue(session);

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ ok: true, session });
    expect(second).toBe(first);
    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'token-1',
    });
  });

  it('signs out locally when the refresh cookie is rejected', async () => {
    api.refresh.mockRejectedValue(
      new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Not signed in.' }),
    );

    await expect(refreshSession()).resolves.toEqual({ ok: false, reason: 'unauthenticated' });
    expect(useSessionStore.getState().status).toBe('unauthenticated');
  });

  it('keeps the current state when the network is down', async () => {
    useSessionStore.getState().setSession(session);
    api.refresh.mockRejectedValue(
      new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Offline' }),
    );

    await expect(refreshSession()).resolves.toEqual({ ok: false, reason: 'network' });
    expect(useSessionStore.getState().status).toBe('authenticated');
  });

  it('clears the session, runs clean-up and prefills the email when a session expires', async () => {
    establishSession(session);
    const cleanup = vi.fn();
    const unsubscribe = onSessionCleared(cleanup);

    await signOut('session-expired');

    expect(useSessionStore.getState()).toMatchObject({
      status: 'unauthenticated',
      accessToken: null,
    });
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(api.signOut).toHaveBeenCalledWith({ accessToken: 'token-1' });
    expect(useAuthFlowStore.getState()).toMatchObject({
      notice: 'session-expired',
      prefillEmail: 'daniel.ubani@studipod.com',
    });
    unsubscribe();
  });

  it('completes a local sign-out even if the backend call fails', async () => {
    establishSession(session);
    api.signOut.mockRejectedValue(new Error('offline'));

    await expect(signOut()).resolves.toBeUndefined();
    expect(useSessionStore.getState().status).toBe('unauthenticated');
    expect(useAuthFlowStore.getState()).toMatchObject({ notice: 'signed-out', prefillEmail: null });
  });

  it('discards a refresh that resolves after the user signed out', async () => {
    let resolveRefresh: (value: Session) => void = () => undefined;
    api.refresh.mockReturnValue(new Promise<Session>((resolve) => (resolveRefresh = resolve)));
    establishSession(session);

    const pending = refreshSession();
    await signOut();
    resolveRefresh({ ...session, accessToken: 'token-2' });

    await expect(pending).resolves.toEqual({ ok: false, reason: 'unauthenticated' });
    expect(useSessionStore.getState()).toMatchObject({
      status: 'unauthenticated',
      accessToken: null,
    });
  });

  it('forgets sign-in flow details when the session ends', async () => {
    useAuthFlowStore.getState().setChallenge({
      challengeId: 'chl_1',
      maskedEmail: 'd••••@studipod.com',
      codeExpiresAt: '2026-11-28T10:10:00Z',
      resendAvailableAt: '2026-11-28T10:01:00Z',
    });
    establishSession(session);
    await signOut();
    expect(useAuthFlowStore.getState().challenge).toBeNull();
    expect(useAuthFlowStore.getState().accessDenied).toBeNull();
  });

  it('treats a console left idle for 24 hours as expired', () => {
    const now = Date.now();
    expect(hasIdleSessionExpired(now)).toBe(false);
    writeLastActivity(now - INACTIVITY_TIMEOUT_MS + 60_000);
    expect(hasIdleSessionExpired(now)).toBe(false);
    writeLastActivity(now - INACTIVITY_TIMEOUT_MS);
    expect(hasIdleSessionExpired(now)).toBe(true);
  });
});
