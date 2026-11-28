import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/http/api-error';

import type { AuthApi } from '../api';
import type * as AuthApiModule from '../api';
import { useAuthFlowStore } from '../session/auth-flow-store';
import { ForgotPasswordForm } from './forgot-password-form';
import { ResetPasswordForm } from './reset-password-form';

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));

const api = {
  forgotPassword: vi.fn<AuthApi['forgotPassword']>(),
  validateResetToken: vi.fn<AuthApi['validateResetToken']>(),
  resetPassword: vi.fn<AuthApi['resetPassword']>(),
};
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthApiModule>()),
  loadAuthApi: () => Promise.resolve(api),
}));

function renderWithQueries(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  replace.mockReset();
  push.mockReset();
  Object.values(api).forEach((fn) => fn.mockReset());
  useAuthFlowStore.getState().reset();
});

describe('ForgotPasswordForm', () => {
  it('requires a StudiPod work email', async () => {
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'daniel.ubani@gmail.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(
      await screen.findByText('Use your StudiPod work email (ending @studipod.com).'),
    ).toBeInTheDocument();
    expect(api.forgotPassword).not.toHaveBeenCalled();
  });

  it('confirms without revealing whether the account exists', async () => {
    api.forgotPassword.mockResolvedValue(undefined);
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'daniel.ubani@studipod.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(
      screen.getByText(/If daniel.ubani@studipod.com belongs to an admin account/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend link in 0:4\d/ })).toBeDisabled();
  });
});

describe('ResetPasswordForm', () => {
  it('shows the expired-link state when there is no token', () => {
    renderWithQueries(<ResetPasswordForm token={null} />);
    expect(screen.getByRole('heading', { name: 'This link has expired' })).toBeInTheDocument();
  });

  it('shows the expired-link state when the backend rejects the token', async () => {
    api.validateResetToken.mockRejectedValue(
      new ApiError({ status: 410, code: 'RESET_LINK_INVALID', message: 'Expired.' }),
    );
    renderWithQueries(<ResetPasswordForm token="expired" />);
    expect(
      await screen.findByRole('heading', { name: 'This link has expired' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send a new link' }));
    expect(push).toHaveBeenCalledWith('/forgot-password');
  });

  it('checks the rules, then updates the password and returns to sign-in', async () => {
    api.validateResetToken.mockResolvedValue({ email: 'daniel.ubani@studipod.com' });
    api.resetPassword.mockResolvedValue(undefined);
    renderWithQueries(<ResetPasswordForm token="valid" />);

    const password = await screen.findByLabelText('New password');
    const confirm = screen.getByLabelText('Confirm new password');
    const submit = screen.getByRole('button', { name: 'Update password' });
    expect(submit).toBeDisabled();

    fireEvent.change(password, { target: { value: 'daniel likes long phrases' } });
    expect(screen.getByText('Doesn’t include your name or email').closest('li')).toHaveTextContent(
      'Not met',
    );

    fireEvent.change(password, { target: { value: 'a calm river at dawn' } });
    fireEvent.change(confirm, { target: { value: 'a calm river at dusk' } });
    fireEvent.click(submit);
    expect(await screen.findByText('These passwords don’t match.')).toBeInTheDocument();

    fireEvent.change(confirm, { target: { value: 'a calm river at dawn' } });
    fireEvent.click(submit);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(api.resetPassword).toHaveBeenCalledWith({
      token: 'valid',
      password: 'a calm river at dawn',
    });
    expect(useAuthFlowStore.getState().notice).toBe('password-changed');
  });

  it('explains a password the backend rejects as recently used', async () => {
    api.validateResetToken.mockResolvedValue({ email: 'daniel.ubani@studipod.com' });
    api.resetPassword.mockRejectedValue(
      new ApiError({
        status: 422,
        code: 'PASSWORD_POLICY_VIOLATION',
        message: 'Rejected.',
        meta: { rule: 'RECENTLY_USED' },
      }),
    );
    renderWithQueries(<ResetPasswordForm token="valid" />);

    fireEvent.change(await screen.findByLabelText('New password'), {
      target: { value: 'an old favourite phrase' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'an old favourite phrase' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(
      await screen.findByText('You’ve used this password recently. Choose a different one.'),
    ).toBeInTheDocument();
  });
});
