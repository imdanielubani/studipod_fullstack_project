'use client';

import { format, isToday, isYesterday } from 'date-fns';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';

import type { Session } from '../api';
import { useAuthFlowStore } from '../session/auth-flow-store';
import {
  applyRemoteSignOut,
  connectHttpClientToSession,
  refreshSession,
  signOut,
  subscribeToOtherTabs,
} from '../session/session-manager';
import { useSessionStore } from '../session/session-store';
import { SessionExpiredDialog, SessionTimeout } from './session-timeout';

/** Refresh the access token this long before it expires. */
const REFRESH_LEAD_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 5_000;

function describeLastSignIn(lastSignIn: NonNullable<Session['lastSignIn']>): string {
  const at = new Date(lastSignIn.at);
  const time = format(at, 'HH:mm');
  const day = isToday(at) ? 'Today' : isYesterday(at) ? 'Yesterday' : format(at, 'd MMM');
  const where = lastSignIn.location ? ` from ${lastSignIn.location}` : '';
  return `${day} at ${time}${where}. Not you? Change your password and tell a Super Admin.`;
}

function FullScreenStatus({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      {children}
    </main>
  );
}

/**
 * Protects every console page. The page renders only after the backend confirms
 * the session (silent refresh on load). Presentation only: the backend still
 * authorises every request.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useSessionStore((state) => state.status);
  const accessTokenExpiresAt = useSessionStore((state) => state.accessTokenExpiresAt);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  const confirmSession = useCallback(async () => {
    const result = await refreshSession();
    if (!result.ok && result.reason === 'network') setHasConnectionError(true);
  }, []);

  const retry = useCallback(() => {
    setHasConnectionError(false);
    void confirmSession();
  }, [confirmSession]);

  const hasExpiredRef = useRef(false);

  const expire = useCallback(() => {
    // Several triggers can fire together (timer, failed renewal); end the session once.
    if (hasExpiredRef.current) return;
    hasExpiredRef.current = true;
    setHasExpired(true);
    void signOut('session-expired');
  }, []);

  const handleSignOut = useCallback(() => {
    void signOut('signed-out');
    router.replace('/sign-in');
  }, [router]);

  // Confirm the session once when the console opens.
  useEffect(() => {
    if (useSessionStore.getState().status !== 'unknown') return;
    void refreshSession().then((result) => {
      if (!result.ok && result.reason === 'network') setHasConnectionError(true);
    });
  }, []);

  // Authenticated API calls use this session; a failed renewal ends it.
  useEffect(() => connectHttpClientToSession(expire), [expire]);

  // Follow sign-outs from other tabs.
  useEffect(
    () =>
      subscribeToOtherTabs((message) => {
        if (message.type === 'signed-out') applyRemoteSignOut(message.notice);
      }),
    [],
  );

  // Signed-out visitors go to sign-in (unless the expired dialog is explaining why).
  useEffect(() => {
    if (status === 'unauthenticated' && !hasExpired) router.replace('/sign-in');
  }, [status, hasExpired, router]);

  // Renew the access token shortly before it expires.
  useEffect(() => {
    if (status !== 'authenticated' || accessTokenExpiresAt === null) return undefined;
    const delay = Math.max(
      MIN_REFRESH_DELAY_MS,
      accessTokenExpiresAt - Date.now() - REFRESH_LEAD_MS,
    );
    const email = useSessionStore.getState().administrator?.email ?? null;
    const timer = setTimeout(() => {
      void refreshSession().then((result) => {
        if (!result.ok && result.reason === 'unauthenticated' && !hasExpiredRef.current) {
          useAuthFlowStore.getState().setNotice('session-expired', email);
        }
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [status, accessTokenExpiresAt]);

  // Show the previous sign-in once, right after signing in.
  useEffect(() => {
    if (status !== 'authenticated') return;
    const lastSignIn = useSessionStore.getState().consumeLastSignIn();
    if (lastSignIn) {
      notify.info({
        id: 'last-sign-in',
        title: 'Your last sign-in',
        description: describeLastSignIn(lastSignIn),
      });
    }
  }, [status]);

  if (hasExpired) {
    return <SessionExpiredDialog onSignInAgain={() => router.replace('/sign-in')} />;
  }

  if (status === 'authenticated') {
    return (
      <>
        {children}
        <SessionTimeout onExpire={expire} onSignOut={handleSignOut} />
      </>
    );
  }

  if (hasConnectionError) {
    return (
      <FullScreenStatus>
        <div className="flex w-full max-w-[400px] flex-col gap-4">
          <Alert tone="error" title="Connection problem">
            We couldn’t reach StudiPod to confirm your session. Check your connection and try again.
          </Alert>
          <Button onClick={retry}>Try again</Button>
        </div>
      </FullScreenStatus>
    );
  }

  return (
    <FullScreenStatus>
      <p role="status" className="flex items-center gap-2 text-body-md text-fg-secondary">
        <LoaderCircle aria-hidden className="size-4 animate-spin text-icon" />
        Checking your session…
      </p>
    </FullScreenStatus>
  );
}
