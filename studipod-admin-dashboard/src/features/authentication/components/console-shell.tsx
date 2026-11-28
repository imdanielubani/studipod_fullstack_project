'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, type ReactNode } from 'react';

import { AppShell, type ShellAdministrator } from '@/components/layout/app-shell';

import { describeAdministrator, describeSignIn } from '../lib/identity';
import { signOut } from '../session/session-manager';
import { useSessionStore } from '../session/session-store';

/** The app shell for the signed-in administrator. Rendered inside the session gate. */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const administrator = useSessionStore((state) => state.administrator);
  const currentSignIn = useSessionStore((state) => state.currentSignIn);

  const shellAdministrator = useMemo<ShellAdministrator | null>(() => {
    if (!administrator) return null;
    const identity = describeAdministrator(administrator);
    return {
      ...identity,
      signInLine: currentSignIn ? describeSignIn(currentSignIn) : null,
      permissions: administrator.permissions,
    };
  }, [administrator, currentSignIn]);

  const handleSignOut = useCallback(() => {
    void signOut('signed-out');
    router.replace('/sign-in');
  }, [router]);

  // The session gate renders this only for a confirmed session.
  if (!shellAdministrator) return null;

  return (
    <AppShell administrator={shellAdministrator} onSignOut={handleSignOut}>
      {children}
    </AppShell>
  );
}
