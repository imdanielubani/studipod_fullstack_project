import { z } from 'zod';

import { isApiError } from '@/services/http/api-error';
import { registerAuthBridge } from '@/services/http/http-client';

import { loadAuthApi, type Session } from '../api';
import { useAuthFlowStore, type SignInNotice } from './auth-flow-store';
import { INACTIVITY_TIMEOUT_MS, readLastActivity, writeLastActivity } from './inactivity';
import { useSessionStore } from './session-store';

const CHANNEL_NAME = 'studipod-admin-auth';

/** Messages from other tabs are untrusted input: only these shapes are accepted. */
const authBroadcastSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('signed-in') }),
  z.object({
    type: z.literal('signed-out'),
    notice: z.enum(['signed-out', 'session-expired', 'password-changed']),
  }),
]);
type AuthBroadcast = z.infer<typeof authBroadcastSchema>;

export type RefreshResult =
  { ok: true; session: Session } | { ok: false; reason: 'unauthenticated' | 'network' };

let refreshInFlight: Promise<RefreshResult> | null = null;
/**
 * Incremented every time the local session ends. A refresh that started before a
 * sign-out must not bring the session back when its response arrives later.
 */
let sessionEpoch = 0;
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
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const message = authBroadcastSchema.safeParse(event.data);
    if (message.success) listener(message.data);
  };
  return () => channel.close();
}

/** Registers clean-up to run whenever the session ends (for example clearing query caches). */
export function onSessionCleared(listener: () => void): () => void {
  clearListeners.add(listener);
  return () => clearListeners.delete(listener);
}

/**
 * Ends the local session and records why the visitor is going back to sign-in.
 * Sign-in flow state (pending challenge, access-denied details) is discarded so
 * nothing lingers on a shared device. After an expired session the email is kept
 * for prefill, and a repeated notice never erases an email already known.
 */
function endLocalSession(notice: SignInNotice | null): void {
  const flow = useAuthFlowStore.getState();
  const email = useSessionStore.getState().administrator?.email ?? flow.prefillEmail;
  sessionEpoch += 1;
  useSessionStore.getState().clearSession();
  clearListeners.forEach((listener) => listener());
  flow.reset();
  if (notice) flow.setNotice(notice, notice === 'session-expired' ? email : null);
}

/** True when the last recorded activity is older than the inactivity limit. */
export function hasIdleSessionExpired(now = Date.now()): boolean {
  const lastActivity = readLastActivity();
  return lastActivity !== null && now - lastActivity >= INACTIVITY_TIMEOUT_MS;
}

/**
 * Exchanges the HttpOnly refresh cookie for a new access token.
 * Concurrent callers share one request, so a burst of 401s triggers a single refresh.
 */
export function refreshSession(): Promise<RefreshResult> {
  refreshInFlight ??= (async (): Promise<RefreshResult> => {
    const epochAtStart = sessionEpoch;
    try {
      const session = await (await loadAuthApi()).refresh();
      // Signed out while the request was in flight: discard the late response.
      if (epochAtStart !== sessionEpoch) return { ok: false, reason: 'unauthenticated' };
      useSessionStore.getState().setSession(session);
      return { ok: true, session };
    } catch (error: unknown) {
      if (isApiError(error) && error.isRetryable) return { ok: false, reason: 'network' };
      if (epochAtStart === sessionEpoch) endLocalSession(null);
      return { ok: false, reason: 'unauthenticated' };
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Stores the session returned by code verification and tells other tabs. */
export function establishSession(session: Session): void {
  writeLastActivity(Date.now());
  useSessionStore.getState().setSession(session);
  useAuthFlowStore.getState().setChallenge(null);
  broadcast({ type: 'signed-in' });
}

/**
 * Ends the session locally and on the backend. Local clean-up always happens,
 * even when the network call fails, so a signed-out tab never keeps admin data.
 */
export async function signOut(notice: SignInNotice = 'signed-out'): Promise<void> {
  const { accessToken } = useSessionStore.getState();
  endLocalSession(notice);
  broadcast({ type: 'signed-out', notice });
  try {
    // The backend revokes the refresh-token family identified by the HttpOnly cookie.
    await (await loadAuthApi()).signOut({ accessToken });
  } catch {
    // The refresh cookie expires on its own; the local session is already gone.
  }
}

/** Applies a sign-out that happened in another tab. */
export function applyRemoteSignOut(notice: SignInNotice): void {
  endLocalSession(notice);
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
