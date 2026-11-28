'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { notify } from '@/components/ui/toast';
import { getPublicLinks } from '@/config/env';
import { useCountdown } from '@/hooks/use-countdown';

import { loadAuthApi } from '../api';
import { notifyRequestFailure } from '../lib/feedback';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas/auth-schemas';
import { formatShortCountdown } from '../session/inactivity';
import {
  AuthHeading,
  BackToSignInLink,
  ContactSuperAdminLink,
  IconBadge,
  SecurityNote,
} from './auth-ui';

/** Matches the backend cooldown between reset emails. */
const RESEND_COOLDOWN_MS = 45_000;

type SentState = { email: string; resendAvailableAt: number };

async function requestResetLink(email: string): Promise<void> {
  await (await loadAuthApi()).forgotPassword({ email });
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState<SentState | null>(null);

  if (sent) {
    return <ResetLinkSent sent={sent} onResent={setSent} />;
  }

  return (
    <RequestResetLink
      onSent={(email) => setSent({ email, resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS })}
    />
  );
}

function RequestResetLink({ onSent }: { onSent: (email: string) => void }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const email = useWatch({ control, name: 'email' }) ?? '';

  const onSubmit = handleSubmit(async ({ email: submitted }) => {
    try {
      await requestResetLink(submitted);
      onSent(submitted);
    } catch (error: unknown) {
      notifyRequestFailure(error);
    }
  });

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <BackToSignInLink />
      <AuthHeading
        overline="Password reset"
        title="Reset your password"
        description="Enter your work email. If it belongs to an admin account, we’ll email you a link to choose a new password."
      />
      <form noValidate onSubmit={onSubmit} className="flex w-full flex-col gap-6">
        <TextField
          label="Work email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="name@studipod.com"
          leadingIcon={Mail}
          disabled={isSubmitting}
          autoFocus
          error={errors.email?.message}
          {...register('email')}
        />
        <Button
          type="submit"
          fullWidth
          disabled={!email.trim()}
          isLoading={isSubmitting}
          loadingLabel="Sending…"
        >
          Send reset link
        </Button>
      </form>
      <SecurityNote>For your security, we never say whether an email has an account.</SecurityNote>
      <p className="text-caption text-fg-tertiary">
        Need access? Ask a Super Admin to send you an invite.
      </p>
    </div>
  );
}

function ResetLinkSent({
  sent,
  onResent,
}: {
  sent: SentState;
  onResent: (next: SentState) => void;
}) {
  const { adminSupportEmail } = getPublicLinks();
  const [isResending, setIsResending] = useState(false);
  const remaining = useCountdown(sent.resendAvailableAt) ?? 0;

  async function handleResend() {
    setIsResending(true);
    try {
      await requestResetLink(sent.email);
      onResent({ email: sent.email, resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS });
      notify.success({
        id: 'reset-link-sent',
        title: 'Reset link sent',
        description: `Check ${sent.email} for a link to reset your password.`,
      });
    } catch (error: unknown) {
      notifyRequestFailure(error);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <BackToSignInLink />
      <IconBadge icon={Mail} size="lg" />
      <div role="status">
        <AuthHeading
          overline="Password reset"
          title="Check your email"
          description={`If ${sent.email} belongs to an admin account, we’ve sent a link to reset your password. The link works once.`}
        />
      </div>
      <Button
        variant="secondary"
        fullWidth
        onClick={handleResend}
        disabled={remaining > 0}
        isLoading={isResending}
        loadingLabel="Sending…"
      >
        {remaining > 0 ? `Resend link in ${formatShortCountdown(remaining)}` : 'Resend link'}
      </Button>
      <div className="flex flex-col gap-2">
        <p className="text-caption text-fg-tertiary">Didn’t get it? Check your spam folder.</p>
        <div>
          <ContactSuperAdminLink email={adminSupportEmail} />
        </div>
      </div>
    </div>
  );
}
