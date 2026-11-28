import { create } from 'zustand';

import type { Administrator, Session } from '../api/contract';

export type SessionStatus = 'unknown' | 'authenticated' | 'unauthenticated';

type SessionState = {
  status: SessionStatus;
  /** Access token. Memory only: never persisted to any browser storage. */
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  administrator: Administrator | null;
  /** Previous sign-in to show once after signing in, then cleared. */
  lastSignIn: Session['lastSignIn'];
  currentSignIn: Session['currentSignIn'];
  setSession: (session: Session) => void;
  clearSession: () => void;
  consumeLastSignIn: () => Session['lastSignIn'];
};

const signedOutState = {
  accessToken: null,
  accessTokenExpiresAt: null,
  administrator: null,
  lastSignIn: null,
  currentSignIn: null,
} as const;

export const useSessionStore = create<SessionState>()((set, get) => ({
  status: 'unknown',
  ...signedOutState,
  setSession: (session) =>
    set({
      status: 'authenticated',
      accessToken: session.accessToken,
      accessTokenExpiresAt: Date.parse(session.accessTokenExpiresAt),
      administrator: session.administrator,
      lastSignIn: session.lastSignIn ?? null,
      currentSignIn: session.currentSignIn ?? null,
    }),
  clearSession: () => set({ status: 'unauthenticated', ...signedOutState }),
  consumeLastSignIn: () => {
    const { lastSignIn } = get();
    if (lastSignIn) set({ lastSignIn: null });
    return lastSignIn;
  },
}));
