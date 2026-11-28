'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Circle, CircleCheck, CircleX, Clock, LoaderCircle, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/text-field';
import { getPublicLinks } from '@/config/env';
import { cn } from '@/lib/utils';
import { isApiError } from '@/services/http/api-error';

import {
  AUTH_ERROR_CODES,
  loadAuthApi,
  passwordPolicyMetaSchema,
  type PasswordPolicyRule,
} from '../api';
import { notifyRequestFailure } from '../lib/feedback';
import {
  passwordRuleChecks,
  setPasswordSchema,
  type SetPasswordValues,
} from '../schemas/auth-schemas';
import { useAuthFlowStore } from '../session/auth-flow-store';
import {
  AuthHeading,
  BackToSignInLink,
  ContactSuperAdminLink,
  IconBadge,
  SecurityNote,
} from './auth-ui';

const POLICY_MESSAGES: Record<PasswordPolicyRule, string> = {
  TOO_SHORT: 'Use at least 12 characters.',
  TOO_LONG: 'Use at most 128 characters.',
  RECENTLY_USED: 'You’ve used this password recently. Choose a different one.',
  CONTAINS_PERSONAL_INFO: 'Don’t include your name or email.',
  BREACHED: 'This password has appeared in a data breach. Choose a different one.',
};

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [isLinkInvalid, setIsLinkInvalid] = useState(false);
  const validation = useQuery({
    queryKey: ['auth', 'reset-token', token],
    queryFn: async () => (await loadAuthApi()).validateResetToken({ token: token ?? '' }),
    enabled: Boolean(token),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  const rejectedByServer =
    isLinkInvalid ||
    (isApiError(validation.error) && validation.error.code === AUTH_ERROR_CODES.resetLinkInvalid);

  if (!token || rejectedByServer) return <LinkExpired />;

  if (validation.isPending) {
    return (
      <div role="status" className="flex items-center gap-2 text-body-md text-fg-secondary">
        <LoaderCircle aria-hidden className="size-4 animate-spin text-icon" />
        Checking your reset link…
      </div>
    );
  }

  if (validation.isError) {
    return (
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <BackToSignInLink />
        <Alert tone="error" title="We couldn’t check your reset link">
          Check your connection and try again.
        </Alert>
        <Button fullWidth onClick={() => void validation.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <ChooseNewPassword
      token={token}
      email={validation.data.email}
      onLinkInvalid={() => setIsLinkInvalid(true)}
    />
  );
}

function ChooseNewPassword({
  token,
  email,
  onLinkInvalid,
}: {
  token: string;
  email: string;
  onLinkInvalid: () => void;
}) {
  const router = useRouter();
  const [rejectedRule, setRejectedRule] = useState<PasswordPolicyRule | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const [password = '', confirmPassword = ''] = useWatch({
    control,
    name: ['password', 'confirmPassword'],
  });
  const checks = passwordRuleChecks(password, email);
  const meetsClientRules = checks.minLength && checks.maxLength && checks.noPersonalInfo;
  const canSubmit = meetsClientRules && confirmPassword.length > 0;

  const onSubmit = handleSubmit(async (values) => {
    setRejectedRule(null);
    try {
      await (await loadAuthApi()).resetPassword({ token, password: values.password });
      useAuthFlowStore.getState().setNotice('password-changed');
      router.replace('/sign-in');
    } catch (error: unknown) {
      if (isApiError(error) && error.code === AUTH_ERROR_CODES.resetLinkInvalid) {
        onLinkInvalid();
        return;
      }
      if (isApiError(error) && error.code === AUTH_ERROR_CODES.passwordPolicy) {
        const meta = passwordPolicyMetaSchema.safeParse(error.meta);
        const rule = meta.success ? meta.data.rule : null;
        setRejectedRule(rule);
        setError(
          'password',
          {
            type: 'server',
            message: rule ? POLICY_MESSAGES[rule] : 'Choose a different password.',
          },
          { shouldFocus: true },
        );
        return;
      }
      notifyRequestFailure(error);
    }
  });

  const rules: ReadonlyArray<{ label: string; state: RuleState }> = [
    { label: 'At least 12 characters', state: checks.minLength ? 'met' : 'pending' },
    {
      label: 'Not the same as your last 5 passwords',
      state: rejectedRule === 'RECENTLY_USED' ? 'failed' : 'pending',
    },
    {
      label: 'Doesn’t include your name or email',
      state:
        rejectedRule === 'CONTAINS_PERSONAL_INFO' || (password.length > 0 && !checks.noPersonalInfo)
          ? 'failed'
          : checks.noPersonalInfo
            ? 'met'
            : 'pending',
    },
  ];

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <AuthHeading
        overline="Password reset"
        title="Choose a new password"
        description={`For ${email}. A short phrase you’ll remember works well.`}
      />
      <form noValidate onSubmit={onSubmit} className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-4">
          <PasswordField
            label="New password"
            autoComplete="new-password"
            placeholder="Enter a new password"
            leadingIcon={Lock}
            disabled={isSubmitting}
            autoFocus
            aria-describedby="password-rules"
            error={errors.password?.message}
            {...register('password', { onChange: () => setRejectedRule(null) })}
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Enter it again"
            leadingIcon={Lock}
            disabled={isSubmitting}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <PasswordRules id="password-rules" rules={rules} />
        </div>
        <Button
          type="submit"
          fullWidth
          disabled={!canSubmit}
          isLoading={isSubmitting}
          loadingLabel="Updating…"
        >
          Update password
        </Button>
      </form>
      <SecurityNote>Updating your password signs you out on every other device.</SecurityNote>
    </div>
  );
}

type RuleState = 'met' | 'pending' | 'failed';

const ruleStyles: Record<
  RuleState,
  { Icon: typeof Circle; icon: string; text: string; sr: string }
> = {
  met: { Icon: CircleCheck, icon: 'text-icon-success', text: 'text-success-fg', sr: 'Met' },
  pending: { Icon: Circle, icon: 'text-fg-disabled', text: 'text-fg-secondary', sr: 'Required' },
  failed: { Icon: CircleX, icon: 'text-icon-danger', text: 'text-danger-fg', sr: 'Not met' },
};

function PasswordRules({
  id,
  rules,
}: {
  id: string;
  rules: ReadonlyArray<{ label: string; state: RuleState }>;
}) {
  return (
    <ul id={id} aria-label="Password requirements" className="flex flex-col gap-1.5">
      {rules.map(({ label, state }) => {
        const { Icon, icon, text, sr } = ruleStyles[state];
        return (
          <li key={label} className={cn('flex items-center gap-2 text-caption', text)}>
            <Icon aria-hidden className={cn('size-3.5 shrink-0', icon)} />
            <span>
              <span className="sr-only">{sr}: </span>
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function LinkExpired() {
  const router = useRouter();
  const { adminSupportEmail } = getPublicLinks();

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <BackToSignInLink />
      <IconBadge icon={Clock} tone="warning" size="lg" />
      <AuthHeading
        overline="Password reset"
        title="This link has expired"
        description="Reset links work once and expire after a short time. Send yourself a new one to continue."
      />
      <Button fullWidth onClick={() => router.push('/forgot-password')}>
        Send a new link
      </Button>
      <div className="flex flex-col gap-2">
        <p className="text-caption text-fg-tertiary">Need help signing in?</p>
        <div>
          <ContactSuperAdminLink email={adminSupportEmail} />
        </div>
      </div>
    </div>
  );
}
