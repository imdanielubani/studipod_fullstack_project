import { isApiError } from '@/services/http/api-error';
import { registerAuthBridge } from '@/services/http/http-client';

import { loadAuthApi, type Session } from '../api';
import { useAuthFlowStore, type SignInNotice } from './auth-flow-store';
import { useSessionStore } from './session-store';

const CHANNEL_NAME = 'studipod-admin-auth';

type AuthBroadcast = { type: 'signed-in' } | { type: 'signed-out'; notice: SignInNotice };

export type RefreshResult =
  { ok: true; session: Session } | { ok: false; reason: 'unauthenticated' | 'network' };

let refreshInFlight: Promise<RefreshResult> | null = null;
const clearListeners = new Set<() => void>();

function broadcast(message: AuthBroadcast): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage(message);
  channel.close();
}

/** Subscribes to sign-in and sign-out events from other tabs. */
export function subscribeToOtherTabs(listener: (message: AuthBroadcast) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => undefined;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<AuthBroadcast>) => listener(event.data);
  return () => channel.close();
}

/** Registers clean-up to run whenever the session ends (for example clearing query caches). */
export function onSessionCleared(listener: () => void): () => void {
  clearListeners.add(listener);
  return () => clearListeners.delete(listener);
}

/**
 * Records why the visitor is being sent to sign-in. After an expired session the
 * email is kept for prefill; a repeated notice never erases an email already known.
 */
function recordSignOutNotice(notice: SignInNotice, email: string | null): void {
  const flow = useAuthFlowStore.getState();
  const prefill = notice === 'session-expired' ? (email ?? flow.prefillEmail) : null;
  flow.setNotice(notice, prefill);
}

function clearLocalSession(): void {
  useSessionStore.getState().clearSession();
  clearListeners.forEach((listener) => listener());
}

/**
 * Exchanges the HttpOnly refresh cookie for a new access token.
 * Concurrent callers share one request, so a burst of 401s triggers a single refresh.
 */
export function refreshSession(): Promise<RefreshResult> {
  refreshInFlight ??= (async (): Promise<RefreshResult> => {
    try {
      const session = await (await loadAuthApi()).refresh();
      useSessionStore.getState().setSession(session);
      return { ok: true, session };
    } catch (error: unknown) {
      if (isApiError(error) && error.isRetryable) return { ok: false, reason: 'network' };
      clearLocalSession();
      return { ok: false, reason: 'unauthenticated' };
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Stores the session returned by code verification and tells other tabs. */
export function establishSession(session: Session): void {
  useSessionStore.getState().setSession(session);
  useAuthFlowStore.getState().setChallenge(null);
  broadcast({ type: 'signed-in' });
}

/**
 * Ends the session locally and on the backend. Local clean-up always happens,
 * even when the network call fails, so a signed-out tab never keeps admin data.
 */
export async function signOut(notice: SignInNotice = 'signed-out'): Promise<void> {
  const { accessToken, administrator } = useSessionStore.getState();
  clearLocalSession();
  recordSignOutNotice(notice, administrator?.email ?? null);
  broadcast({ type: 'signed-out', notice });
  try {
    await (await loadAuthApi()).signOut({ accessToken });
  } catch {
    // The refresh cookie expires on its own; the local session is already gone.
  }
}

/** Applies a sign-out that happened in another tab. */
export function applyRemoteSignOut(notice: SignInNotice): void {
  const email = useSessionStore.getState().administrator?.email ?? null;
  clearLocalSession();
  recordSignOutNotice(notice, email);
}

/** Connects the HTTP client to the session so authenticated requests carry the token. */
export function connectHttpClientToSession(onAuthenticationLost: () => void): () => void {
  registerAuthBridge({
    getAccessToken: () => useSessionStore.getState().accessToken,
    refreshAccessToken: async () => {
      const result = await refreshSession();
      return result.ok ? result.session.accessToken : null;
    },
    onAuthenticationLost,
  });
  return () => registerAuthBridge(null);
}
