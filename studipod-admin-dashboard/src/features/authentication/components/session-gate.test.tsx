import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/http/api-error';

import type { AuthApi, Session } from '../api';
import type * as AuthApiModule from '../api';
import { INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS } from '../session/inactivity';
import { useAuthFlowStore } from '../session/auth-flow-store';
import { useSessionStore } from '../session/session-store';
import { SessionGate } from './session-gate';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

const api = {
  refresh: vi.fn<AuthApi['refresh']>(),
  signOut: vi.fn<AuthApi['signOut']>(),
};
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthApiModule>()),
  loadAuthApi: () => Promise.resolve(api),
}));

function session(): Session {
  return {
    accessToken: 'token',
    accessTokenExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    administrator: {
      id: 'adm_1',
      email: 'daniel.ubani@studipod.com',
      firstName: 'Daniel',
      lastName: 'Ubani',
      roles: [],
      permissions: [],
    },
    lastSignIn: null,
  };
}

const Protected = () => <p>Protected content</p>;

describe('SessionGate', () => {
  beforeEach(() => {
    replace.mockReset();
    api.refresh.mockReset();
    api.signOut.mockReset().mockResolvedValue(undefined);
    useSessionStore.setState({ status: 'unknown', accessToken: null, administrator: null });
    useAuthFlowStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirms the session before rendering protected content', async () => {
    api.refresh.mockResolvedValue(session());
    render(
      <SessionGate>
        <Protected />
      </SessionGate>,
    );

    expect(screen.getByText('Checking your session…')).toBeInTheDocument();
    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });

  it('sends signed-out visitors to sign-in', async () => {
    api.refresh.mockRejectedValue(
      new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'No session.' }),
    );
    render(
      <SessionGate>
        <Protected />
      </SessionGate>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('does not revive a console that was left idle past the limit', async () => {
    window.localStorage.setItem(
      'studipod-admin:last-activity',
      String(Date.now() - INACTIVITY_TIMEOUT_MS - 1_000),
    );
    render(
      <SessionGate>
        <Protected />
      </SessionGate>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(api.refresh).not.toHaveBeenCalled();
    expect(useAuthFlowStore.getState().notice).toBe('session-expired');
  });

  it('offers a retry when the backend cannot be reached', async () => {
    api.refresh
      .mockRejectedValueOnce(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Offline' }))
      .mockResolvedValueOnce(session());
    render(
      <SessionGate>
        <Protected />
      </SessionGate>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });

  it('warns two minutes before the inactivity limit and then expires the session', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.refresh.mockImplementation(() => Promise.resolve(session()));
    useSessionStore.getState().setSession(session());
    render(
      <SessionGate>
        <Protected />
      </SessionGate>,
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS + 1_000);
    });
    expect(
      screen.getByRole('alertdialog', { name: 'Your session is about to expire' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/01:5\d/);

    await act(async () => {
      vi.advanceTimersByTime(INACTIVITY_WARNING_MS);
    });
    expect(
      screen.getByRole('alertdialog', { name: 'Your session has expired' }),
    ).toBeInTheDocument();
    expect(useSessionStore.getState().status).toBe('unauthenticated');
    expect(useAuthFlowStore.getState()).toMatchObject({
      notice: 'session-expired',
      prefillEmail: 'daniel.ubani@studipod.com',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }));
    expect(replace).toHaveBeenCalledWith('/sign-in');
  });

  it('signs out from the warning dialog', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.refresh.mockImplementation(() => Promise.resolve(session()));
    useSessionStore.getState().setSession(session());
    render(
      <SessionGate>
        <Protected />
      </SessionGate>,
    );

    await act(async () => {
      vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS + 1_000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(replace).toHaveBeenCalledWith('/sign-in');
    expect(useAuthFlowStore.getState().notice).toBe('signed-out');
  });
});
