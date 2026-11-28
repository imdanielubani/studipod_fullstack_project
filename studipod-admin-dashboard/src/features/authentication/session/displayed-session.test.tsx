import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Administrator } from '../api/contract';
import { EndedSessionProvider, useDisplayedSession } from './displayed-session';
import { useSessionStore } from './session-store';

const administrator: Administrator = {
  id: 'adm_1',
  email: 'daniel.ubani@studipod.com',
  firstName: 'Daniel',
  lastName: 'Ubani',
  roles: ['super-admin'],
  permissions: ['*'],
};

describe('useDisplayedSession', () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
  });

  it('uses the live session while signed in', () => {
    useSessionStore.getState().setSession({
      accessToken: 't',
      accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      administrator,
    });
    const { result } = renderHook(() => useDisplayedSession());
    expect(result.current).toMatchObject({ administrator, hasEnded: false });
  });

  it('falls back to the snapshot after the session expired', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <EndedSessionProvider value={{ administrator, currentSignIn: null }}>
        {children}
      </EndedSessionProvider>
    );
    const { result } = renderHook(() => useDisplayedSession(), { wrapper });
    expect(result.current).toMatchObject({ administrator, hasEnded: true });
  });

  it('shows nobody when signed out without an expiry', () => {
    const { result } = renderHook(() => useDisplayedSession());
    expect(result.current).toEqual({ administrator: null, currentSignIn: null, hasEnded: false });
  });
});
