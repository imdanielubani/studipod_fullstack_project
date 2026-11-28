import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthApi } from '../api';
import type * as AuthApiModule from '../api';
import { useAuthFlowStore } from '../session/auth-flow-store';
import { AccessDeniedView } from './access-denied-view';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

const api = { requestAccess: vi.fn<AuthApi['requestAccess']>() };
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthApiModule>()),
  loadAuthApi: () => Promise.resolve(api),
}));

const attemptedAt = '2026-11-20T14:32:00Z';

describe('AccessDeniedView', () => {
  beforeEach(() => {
    replace.mockReset();
    api.requestAccess.mockReset();
    useAuthFlowStore.getState().reset();
  });

  it('returns to sign-in without a denied attempt', async () => {
    render(<AccessDeniedView />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
  });

  it('explains that candidate accounts cannot use the console', () => {
    useAuthFlowStore.getState().setAccessDenied({
      reason: 'NOT_STAFF',
      email: 'chiamaka.eze@gmail.com',
      attemptedAt,
      reference: 'req_7f3a21',
    });
    render(<AccessDeniedView />);

    expect(
      screen.getByRole('heading', { name: 'This account can’t use the admin console' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Signed in as chiamaka.eze@gmail.com')).toBeInTheDocument();
    expect(screen.getByText(/Reference req_7f3a21 · 20 Nov 2026/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request access' })).not.toBeInTheDocument();
  });

  it('lets staff without a role request access once', async () => {
    api.requestAccess.mockResolvedValue(undefined);
    useAuthFlowStore.getState().setAccessDenied({
      reason: 'NO_ADMIN_ROLE',
      email: 'ifeanyi.obi@studipod.com',
      attemptedAt,
      accessRequestToken: 'arq_1',
      reference: null,
    });
    render(<AccessDeniedView />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request access' }));
    });

    expect(api.requestAccess).toHaveBeenCalledWith({ accessRequestToken: 'arq_1' });
    expect(screen.getByRole('button', { name: 'Request sent' })).toBeDisabled();
  });

  it('clears the attempt when the visitor goes back', () => {
    useAuthFlowStore.getState().setAccessDenied({
      reason: 'NOT_STAFF',
      email: 'chiamaka.eze@gmail.com',
      attemptedAt,
      reference: null,
    });
    render(<AccessDeniedView />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(useAuthFlowStore.getState().accessDenied).toBeNull();
  });
});
