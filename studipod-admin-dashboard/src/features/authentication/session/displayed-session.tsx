'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { Administrator, Session } from '../api/contract';
import { useSessionStore } from './session-store';

/** Who was signed in when the session expired, kept only to draw the console behind the dialog. */
export type EndedSession = {
  administrator: Administrator;
  currentSignIn: Session['currentSignIn'];
};

const EndedSessionContext = createContext<EndedSession | null>(null);

export function EndedSessionProvider({
  value,
  children,
}: {
  value: EndedSession | null;
  children: ReactNode;
}) {
  return <EndedSessionContext.Provider value={value}>{children}</EndedSessionContext.Provider>;
}

type DisplayedSession = {
  administrator: Administrator | null;
  currentSignIn: Session['currentSignIn'];
  /** True after the session expired: the console is shown, inert, behind the expired dialog. */
  hasEnded: boolean;
};

/**
 * The administrator to display in the console. Normally the live session; after
 * an inactivity expiry, the snapshot taken just before it ended, so the expired
 * dialog can sit over the console as designed. Never used for authorisation.
 */
export function useDisplayedSession(): DisplayedSession {
  const administrator = useSessionStore((state) => state.administrator);
  const currentSignIn = useSessionStore((state) => state.currentSignIn);
  const ended = useContext(EndedSessionContext);

  if (administrator) return { administrator, currentSignIn, hasEnded: false };
  if (ended) {
    return {
      administrator: ended.administrator,
      currentSignIn: ended.currentSignIn,
      hasEnded: true,
    };
  }
  return { administrator: null, currentSignIn: null, hasEnded: false };
}
