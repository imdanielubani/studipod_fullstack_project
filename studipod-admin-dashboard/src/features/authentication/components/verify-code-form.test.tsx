import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/http/api-error';

import type { AuthApi, Session, SignInChallenge } from '../api';
import type * as AuthApiModule from '../api';
import { useAuthFlowStore } from '../session/auth-flow-store';
import { useSessionStore } from '../session/session-store';
import { VerifyCodeForm } from './verify-code-form';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

const api = {
  verifyCode: vi.fn<AuthApi['verifyCode']>(),
  resendCode: vi.fn<AuthApi['resendCode']>(),
};
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthApiModule>()),
  loadAuthApi: () => Promise.resolve(api),
}));

function challenge(overrides: Partial<SignInChallenge> = {}): SignInChallenge {
  return {
    challengeId: 'chl_1',
    maskedEmail: 'd••••@studipod.com',
    codeExpiresAt: new Date(Date.now() + 600_000).toISOString(),
    resendAvailableAt: new Date(Date.now() + 45_000).toISOString(),
    ...overrides,
  };
}

const session: Session = {
  accessToken: 'token',
  accessTokenExpiresAt: new Date(Date.now() + 600_000).toISOString(),
  administrator: {
    id: 'adm_1',
    email: 'daniel.ubani@studipod.com',
    firstName: 'Daniel',
    lastName: 'Ubani',
    roles: [],
    permissions: [],
  },
};

function enterCode(code: string) {
  fireEvent.paste(screen.getByLabelText('Digit 1 of 6'), {
    clipboardData: { getData: () => code },
  });
}

describe('VerifyCodeForm', () => {
  beforeEach(() => {
    replace.mockReset();
    api.verifyCode.mockReset();
    api.resendCode.mockReset();
    useAuthFlowStore.getState().reset();
    useSessionStore.getState().clearSession();
  });

  it('returns to sign-in when there is no pending challenge', async () => {
    render(<VerifyCodeForm />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
  });

  it('shows the masked email and the resend cooldown', () => {
    useAuthFlowStore.getState().setChallenge(challenge());
    render(<VerifyCodeForm />);
    expect(screen.getByText(/We sent a 6-digit code to d••••@studipod.com/)).toBeInTheDocument();
    expect(screen.getByText(/You can resend in 0:4\d/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled();
  });

  it('reports an incorrect code with the attempts left', async () => {
    useAuthFlowStore.getState().setChallenge(challenge());
    api.verifyCode.mockRejectedValue(
      new ApiError({
        status: 400,
        code: 'CODE_INCORRECT',
        message: 'Incorrect.',
        meta: { attemptsRemaining: 2 },
      }),
    );
    render(<VerifyCodeForm />);
    enterCode('481902');
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(
      await screen.findByText('That code is incorrect or expired. 2 attempts left.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 1 of 6')).toHaveAttribute('aria-invalid', 'true');
  });

  it('switches to "Send a new code" when the code has expired', async () => {
    useAuthFlowStore.getState().setChallenge(challenge());
    api.verifyCode.mockRejectedValue(
      new ApiError({ status: 410, code: 'CODE_EXPIRED', message: 'Expired.' }),
    );
    render(<VerifyCodeForm />);
    enterCode('000000');
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByRole('button', { name: 'Send a new code' })).toBeInTheDocument();
    expect(screen.getByText('Need help signing in?')).toBeInTheDocument();
  });

  it('treats a code past its expiry time as expired without a request', () => {
    useAuthFlowStore
      .getState()
      .setChallenge(challenge({ codeExpiresAt: new Date(Date.now() - 1_000).toISOString() }));
    render(<VerifyCodeForm />);
    expect(screen.getByText(/This code has expired/)).toBeInTheDocument();
  });

  it('signs in and opens the dashboard', async () => {
    useAuthFlowStore.getState().setChallenge(challenge());
    api.verifyCode.mockResolvedValue(session);
    render(<VerifyCodeForm />);
    enterCode('123456');
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(replace).not.toHaveBeenCalledWith('/sign-in');
    expect(useSessionStore.getState().status).toBe('authenticated');
  });

  it('sends a new code once the cooldown has passed', async () => {
    useAuthFlowStore
      .getState()
      .setChallenge(challenge({ resendAvailableAt: new Date(Date.now() - 1_000).toISOString() }));
    const resent = {
      codeExpiresAt: new Date(Date.now() + 600_000).toISOString(),
      resendAvailableAt: new Date(Date.now() + 45_000).toISOString(),
    };
    api.resendCode.mockResolvedValue(resent);
    render(<VerifyCodeForm />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    });

    expect(api.resendCode).toHaveBeenCalledWith({ challengeId: 'chl_1' });
    expect(useAuthFlowStore.getState().challenge?.resendAvailableAt).toBe(resent.resendAvailableAt);
  });
});
