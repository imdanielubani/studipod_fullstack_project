import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/http/api-error';

import type { AuthApi } from '../api';
import type * as AuthApiModule from '../api';
import { useAuthFlowStore } from '../session/auth-flow-store';
import { SignInForm } from './sign-in-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const api = {
  signIn: vi.fn<AuthApi['signIn']>(),
  forgotPassword: vi.fn<AuthApi['forgotPassword']>(),
};
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthApiModule>()),
  loadAuthApi: () => Promise.resolve(api),
}));

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Work email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('SignInForm', () => {
  beforeEach(() => {
    push.mockReset();
    api.signIn.mockReset();
    api.forgotPassword.mockReset();
    useAuthFlowStore.getState().reset();
  });

  it('keeps Sign in disabled until both fields are filled', () => {
    render(<SignInForm />);
    const submit = screen.getByRole('button', { name: 'Sign in' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'a@studipod.com' } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'x' } });
    expect(submit).toBeEnabled();
  });

  it('shows the format error without calling the API', async () => {
    render(<SignInForm />);
    fillAndSubmit('daniel.ubani@studipod', 'password');
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(api.signIn).not.toHaveBeenCalled();
  });

  it('reports wrong credentials generically with the attempts left', async () => {
    api.signIn.mockRejectedValue(
      new ApiError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
        meta: { attemptsRemaining: 2 },
      }),
    );
    render(<SignInForm />);
    fillAndSubmit('daniel.ubani@studipod.com', 'wrong-password');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Incorrect email or password');
    expect(alert).toHaveTextContent(
      '2 attempts left before this account is locked for 15 minutes.',
    );
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(/password doesn.t match/i)).not.toBeInTheDocument();
  });

  it('locks the form with a countdown and offers a reset link', async () => {
    api.signIn.mockRejectedValue(
      new ApiError({
        status: 423,
        code: 'ACCOUNT_LOCKED',
        message: 'Locked.',
        meta: { lockedUntil: new Date(Date.now() + 892_000).toISOString() },
      }),
    );
    api.forgotPassword.mockResolvedValue(undefined);
    render(<SignInForm />);
    fillAndSubmit('locked@studipod.com', 'anything');

    expect(await screen.findByText('Account temporarily locked')).toBeInTheDocument();
    expect(screen.getByText(/Try again in 1[45]:\d{2}/)).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    });
    expect(api.forgotPassword).toHaveBeenCalledWith({ email: 'locked@studipod.com' });
  });

  it('continues to the code step with the challenge in memory', async () => {
    const challenge = {
      challengeId: 'chl_1',
      maskedEmail: 'd••••@studipod.com',
      codeExpiresAt: new Date(Date.now() + 600_000).toISOString(),
      resendAvailableAt: new Date(Date.now() + 45_000).toISOString(),
    };
    api.signIn.mockResolvedValue(challenge);
    render(<SignInForm />);
    fillAndSubmit('daniel.ubani@studipod.com', 'correct-horse-battery');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/sign-in/verify'));
    expect(useAuthFlowStore.getState().challenge).toEqual(challenge);
  });

  it('sends valid non-admin accounts to access denied', async () => {
    api.signIn.mockRejectedValue(
      new ApiError({
        status: 403,
        code: 'ADMIN_ACCESS_DENIED',
        message: 'Denied.',
        requestId: 'req_7f3a21',
        meta: {
          reason: 'NOT_STAFF',
          email: 'chiamaka@gmail.com',
          attemptedAt: new Date().toISOString(),
        },
      }),
    );
    render(<SignInForm />);
    fillAndSubmit('chiamaka@gmail.com', 'correct-horse-battery');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/access-denied'));
    expect(useAuthFlowStore.getState().accessDenied).toMatchObject({
      reason: 'NOT_STAFF',
      reference: 'req_7f3a21',
    });
  });

  it('prefills the email and explains an expired session', () => {
    useAuthFlowStore.getState().setNotice('session-expired', 'daniel.ubani@studipod.com');
    render(<SignInForm />);
    expect(screen.getByText('Your session expired')).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toHaveValue('daniel.ubani@studipod.com');
    expect(useAuthFlowStore.getState().notice).toBeNull();
  });
});
