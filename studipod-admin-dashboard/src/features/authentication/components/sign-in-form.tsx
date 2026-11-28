'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Alert } from '@/components/ui/alert';
import { Button, TextButton } from '@/components/ui/button';
import { PasswordField, TextField } from '@/components/ui/text-field';
import { notify } from '@/components/ui/toast';
import { useCountdown } from '@/hooks/use-countdown';
import { isApiError } from '@/services/http/api-error';

import {
  AUTH_ERROR_CODES,
  accessDeniedMetaSchema,
  attemptsMetaSchema,
  loadAuthApi,
  lockedMetaSchema,
} from '../api';
import { notifyRequestFailure } from '../lib/feedback';
import { signInSchema, type SignInValues } from '../schemas/auth-schemas';
import { useAuthFlowStore, type SignInNotice } from '../session/auth-flow-store';
import { formatShortCountdown } from '../session/inactivity';
import { AuthHeading, AuthLink, SecurityNote } from './auth-ui';

type FormProblem =
  | { kind: 'credentials'; attemptsRemaining: number | null }
  | { kind: 'locked'; lockedUntil: number }
  | { kind: 'rate-limited' };

const NOTICE_TOASTS: Partial<Record<SignInNotice, { title: string; description: string }>> = {
  'signed-out': {
    title: 'You’ve been signed out',
    description: 'Your session ended safely. Sign in again to continue.',
  },
  'password-changed': {
    title: 'Password changed',
    description: 'Other devices were signed out for your security.',
  },
};

function attemptsCopy(attemptsRemaining: number | null): string {
  if (attemptsRemaining === null || attemptsRemaining <= 0) {
    return 'Check your details and try again.';
  }
  const attempts = attemptsRemaining === 1 ? '1 attempt' : `${attemptsRemaining} attempts`;
  return `Check your details and try again. ${attempts} left before this account is locked for 15 minutes.`;
}

export function SignInForm() {
  const router = useRouter();
  // Read the redirect notice once; it is cleared from the store after mount.
  const [initialNotice] = useState(() => {
    const { notice, prefillEmail } = useAuthFlowStore.getState();
    return { notice, prefillEmail };
  });
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: initialNotice.prefillEmail ?? '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const {
    register,
    handleSubmit,
    setError,
    control,
    getValues,
    formState: { errors, isSubmitting },
  } = form;
  const [email = '', password = ''] = useWatch({ control, name: ['email', 'password'] });

  const lockRemaining = useCountdown(problem?.kind === 'locked' ? problem.lockedUntil : null);
  const isLocked = lockRemaining !== null && lockRemaining > 0;
  const isSessionExpired = initialNotice.notice === 'session-expired';

  useEffect(() => {
    const pending = useAuthFlowStore.getState().consumeNotice();
    const toast = pending.notice ? NOTICE_TOASTS[pending.notice] : undefined;
    if (toast) notify.success({ id: `notice-${pending.notice}`, ...toast });
  }, []);

  const onSubmit = handleSubmit(async ({ email: submittedEmail, password: submittedPassword }) => {
    setProblem(null);
    try {
      const challenge = await (
        await loadAuthApi()
      ).signIn({ email: submittedEmail, password: submittedPassword });
      useAuthFlowStore.getState().setChallenge(challenge);
      router.push('/sign-in/verify');
    } catch (error: unknown) {
      handleSignInError(error);
    }
  });

  function handleSignInError(error: unknown) {
    if (!isApiError(error)) {
      notifyRequestFailure(error);
      return;
    }
    switch (error.code) {
      case AUTH_ERROR_CODES.invalidCredentials: {
        const meta = attemptsMetaSchema.safeParse(error.meta);
        setProblem({
          kind: 'credentials',
          attemptsRemaining: meta.success ? meta.data.attemptsRemaining : null,
        });
        // Mark the password invalid without saying which credential was wrong.
        setError('password', { type: 'server' }, { shouldFocus: true });
        return;
      }
      case AUTH_ERROR_CODES.accountLocked: {
        const meta = lockedMetaSchema.safeParse(error.meta);
        const lockedUntil = meta.success
          ? Date.parse(meta.data.lockedUntil)
          : Date.now() + 15 * 60_000;
        setProblem({ kind: 'locked', lockedUntil });
        return;
      }
      case AUTH_ERROR_CODES.accessDenied: {
        const meta = accessDeniedMetaSchema.safeParse(error.meta);
        if (!meta.success) break;
        useAuthFlowStore
          .getState()
          .setAccessDenied({ ...meta.data, reference: error.requestId ?? null });
        router.push('/access-denied');
        return;
      }
      case AUTH_ERROR_CODES.rateLimited:
        setProblem({ kind: 'rate-limited' });
        return;
      default:
        break;
    }
    notifyRequestFailure(error);
  }

  async function handleSendResetLink() {
    const target = getValues('email').trim();
    setIsSendingReset(true);
    try {
      await (await loadAuthApi()).forgotPassword({ email: target });
      notify.success({
        id: 'reset-link-sent',
        title: 'Reset link sent',
        description: `Check ${target} for a link to reset your password.`,
      });
    } catch (error: unknown) {
      notifyRequestFailure(error);
    } finally {
      setIsSendingReset(false);
    }
  }

  const fieldsDisabled = isSubmitting || isLocked;
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLocked;

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <AuthHeading
        overline="Admin console"
        title="Welcome back"
        description="Sign in with the work email your administrator invited. Access is limited to authorised StudiPod staff."
      />

      {isSessionExpired && !problem ? (
        <Alert tone="info" title="Your session expired">
          For your security we signed you out after 24 hours of inactivity. Sign in to pick up where
          you left off.
        </Alert>
      ) : null}
      {problem?.kind === 'credentials' ? (
        <Alert tone="error" title="Incorrect email or password">
          {attemptsCopy(problem.attemptsRemaining)}
        </Alert>
      ) : null}
      {isLocked ? (
        <Alert tone="error" title="Account temporarily locked">
          Too many failed attempts. Try again in {formatShortCountdown(lockRemaining)}, or reset
          your password. Your Super Admin has been notified.
        </Alert>
      ) : null}
      {problem?.kind === 'rate-limited' ? (
        <Alert tone="error" title="Too many attempts">
          Wait a moment, then try again.
        </Alert>
      ) : null}

      <form noValidate onSubmit={onSubmit} className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-4">
          <TextField
            label="Work email"
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="name@studipod.com"
            leadingIcon={Mail}
            disabled={fieldsDisabled}
            autoFocus={!isSessionExpired}
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            leadingIcon={Lock}
            disabled={fieldsDisabled}
            autoFocus={isSessionExpired}
            isInvalid={Boolean(errors.password)}
            error={errors.password?.type === 'server' ? undefined : errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-end">
            {isLocked ? (
              <TextButton
                onClick={handleSendResetLink}
                disabled={isSendingReset || !email.trim()}
                aria-busy={isSendingReset || undefined}
              >
                Reset password
              </TextButton>
            ) : (
              <AuthLink href="/forgot-password">Forgot password?</AuthLink>
            )}
          </div>
        </div>

        <Button
          type="submit"
          fullWidth
          disabled={!canSubmit}
          isLoading={isSubmitting}
          loadingLabel="Signing in…"
        >
          Sign in
        </Button>
      </form>

      <SecurityNote>
        We’ll email you a code to confirm it’s you. Every sign-in is logged.
      </SecurityNote>
      <p className="text-caption text-fg-tertiary">
        Need access? Ask a Super Admin to send you an invite.
      </p>
    </div>
  );
}
