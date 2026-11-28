import { create } from 'zustand';

import type { AccessDeniedMeta, SignInChallenge } from '../api/contract';

/** One-off messages shown on the sign-in screen after a redirect. */
export type SignInNotice = 'signed-out' | 'session-expired' | 'password-changed';

export type AccessDeniedState = AccessDeniedMeta & { reference: string | null };

type AuthFlowState = {
  /** Code challenge between step 1 (password) and step 2 (emailed code). */
  challenge: SignInChallenge | null;
  /** Result of a sign-in by a valid account that is not an administrator. */
  accessDenied: AccessDeniedState | null;
  /** Email to prefill on the sign-in form (for example after a session expires). */
  prefillEmail: string | null;
  notice: SignInNotice | null;
  setChallenge: (challenge: SignInChallenge | null) => void;
  updateChallenge: (
    patch: Partial<Pick<SignInChallenge, 'codeExpiresAt' | 'resendAvailableAt'>>,
  ) => void;
  setAccessDenied: (state: AccessDeniedState | null) => void;
  setNotice: (notice: SignInNotice | null, prefillEmail?: string | null) => void;
  /** Returns the pending notice and prefill once, then clears them. */
  consumeNotice: () => { notice: SignInNotice | null; prefillEmail: string | null };
  reset: () => void;
};

/**
 * In-memory state that links the signed-out screens. Kept out of the URL so
 * email addresses and challenge ids never reach browser history or server logs.
 */
export const useAuthFlowStore = create<AuthFlowState>()((set, get) => ({
  challenge: null,
  accessDenied: null,
  prefillEmail: null,
  notice: null,
  setChallenge: (challenge) => set({ challenge }),
  updateChallenge: (patch) => {
    const { challenge } = get();
    if (challenge) set({ challenge: { ...challenge, ...patch } });
  },
  setAccessDenied: (accessDenied) => set({ accessDenied }),
  setNotice: (notice, prefillEmail = null) => set({ notice, prefillEmail }),
  consumeNotice: () => {
    const { notice, prefillEmail } = get();
    set({ notice: null, prefillEmail: null });
    return { notice, prefillEmail };
  },
  reset: () => set({ challenge: null, accessDenied: null, prefillEmail: null, notice: null }),
}));
