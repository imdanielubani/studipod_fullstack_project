'use client';

import { Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent } from 'react';

import { Button, TextButton } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { FieldMessage } from '@/components/ui/text-field';
import { notify } from '@/components/ui/toast';
import { getPublicLinks } from '@/config/env';
import { useCountdown } from '@/hooks/use-countdown';
import { isApiError } from '@/services/http/api-error';

import {
  AUTH_ERROR_CODES,
  attemptsMetaSchema,
  loadAuthApi,
  resendMetaSchema,
  type SignInChallenge,
} from '../api';
import { notifyRequestFailure } from '../lib/feedback';
import { VERIFICATION_CODE_LENGTH } from '../schemas/auth-schemas';
import { useAuthFlowStore } from '../session/auth-flow-store';
import { formatShortCountdown } from '../session/inactivity';
import { establishSession } from '../session/session-manager';
import { useSessionStore } from '../session/session-store';
import { AuthHeading, BackToSignInLink, ContactSuperAdminLink, IconBadge } from './auth-ui';

type CodeProblem = { kind: 'incorrect'; attemptsRemaining: number | null } | { kind: 'expired' };

function incorrectCopy(attemptsRemaining: number | null): string {
  if (attemptsRemaining === null) return 'That code is incorrect or expired.';
  const attempts = attemptsRemaining === 1 ? '1 attempt' : `${attemptsRemaining} attempts`;
  return `That code is incorrect or expired. ${attempts} left.`;
}

/** Step 2 of sign-in. Requires a challenge from step 1, otherwise returns to sign-in. */
export function VerifyCodeForm() {
  const router = useRouter();
  const challenge = useAuthFlowStore((state) => state.challenge);
  const isSignedIn = useSessionStore((state) => state.status === 'authenticated');

  useEffect(() => {
    // After a successful verification the challenge is cleared while the
    // dashboard redirect is in flight; only send signed-out visitors back.
    if (!challenge && !isSignedIn) router.replace('/sign-in');
  }, [challenge, isSignedIn, router]);

  if (!challenge) return null;
  return <VerifyCodeStep challenge={challenge} />;
}

function VerifyCodeStep({ challenge }: { challenge: SignInChallenge }) {
  const router = useRouter();
  const labelId = useId();
  const messageId = useId();
  const { adminSupportEmail } = getPublicLinks();

  const [code, setCode] = useState('');
  const [problem, setProblem] = useState<CodeProblem | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const codeRemaining = useCountdown(Date.parse(challenge.codeExpiresAt));
  const resendRemaining = useCountdown(Date.parse(challenge.resendAvailableAt)) ?? 0;
  const isExpired = problem?.kind === 'expired' || codeRemaining === 0;
  const canResend = resendRemaining === 0 && !isResending;

  useEffect(() => {
    notify.success({
      id: 'code-sent',
      title: 'Code sent',
      description: `We emailed a 6-digit code to ${challenge.maskedEmail}. It expires in 10 minutes.`,
    });
  }, [challenge.maskedEmail]);

  function returnToSignIn() {
    notify.error({
      id: 'challenge-expired',
      title: 'Sign in again',
      description: 'This code can no longer be used. Sign in again to get a new one.',
    });
    useAuthFlowStore.getState().setChallenge(null);
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== VERIFICATION_CODE_LENGTH || isExpired || isVerifying) return;
    setIsVerifying(true);
    try {
      const session = await (
        await loadAuthApi()
      ).verifyCode({ challengeId: challenge.challengeId, code });
      establishSession(session);
      notify.success({
        id: 'signed-in',
        title: 'Signed in successfully',
        description: `Welcome back, ${session.administrator.firstName}. Taking you to the dashboard.`,
      });
      router.replace('/dashboard');
    } catch (error: unknown) {
      setIsVerifying(false);
      if (!isApiError(error)) return notifyRequestFailure(error);
      if (error.code === AUTH_ERROR_CODES.codeIncorrect) {
        const meta = attemptsMetaSchema.safeParse(error.meta);
        setProblem({
          kind: 'incorrect',
          attemptsRemaining: meta.success ? meta.data.attemptsRemaining : null,
        });
        return;
      }
      if (error.code === AUTH_ERROR_CODES.codeExpired) return setProblem({ kind: 'expired' });
      if (error.code === AUTH_ERROR_CODES.challengeExpired) return returnToSignIn();
      notifyRequestFailure(error);
    }
  }

  async function handleResend() {
    setIsResending(true);
    try {
      const resent = await (await loadAuthApi()).resendCode({ challengeId: challenge.challengeId });
      useAuthFlowStore.getState().updateChallenge(resent);
      setCode('');
      setProblem(null);
      notify.success({
        id: 'code-resent',
        title: 'New code sent',
        description: `Check ${challenge.maskedEmail}. Your previous code no longer works.`,
      });
    } catch (error: unknown) {
      if (isApiError(error) && error.code === AUTH_ERROR_CODES.resendTooSoon) {
        const meta = resendMetaSchema.safeParse(error.meta);
        if (meta.success) useAuthFlowStore.getState().updateChallenge(meta.data);
      } else if (isApiError(error) && error.code === AUTH_ERROR_CODES.challengeExpired) {
        returnToSignIn();
      } else {
        notifyRequestFailure(error);
      }
    } finally {
      setIsResending(false);
    }
  }

  const helper = isExpired
    ? 'This code has expired. Codes last 10 minutes — send a new one to continue.'
    : problem?.kind === 'incorrect'
      ? incorrectCopy(problem.attemptsRemaining)
      : resendRemaining > 0
        ? `Didn’t get it? Check your spam folder. You can resend in ${formatShortCountdown(resendRemaining)}.`
        : 'Didn’t get it? Check your spam folder.';
  const hasError = isExpired || problem?.kind === 'incorrect';

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <BackToSignInLink />
      <IconBadge icon={Mail} size="lg" />
      <AuthHeading
        overline="Step 2 of 2"
        title="Check your email"
        description={`We sent a 6-digit code to ${challenge.maskedEmail}. Enter it below to finish signing in. The code expires in 10 minutes.`}
      />

      <form noValidate onSubmit={handleVerify} className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2">
          <p id={labelId} className="text-body-md font-medium text-fg">
            Verification code
          </p>
          <OtpInput
            value={code}
            onChange={(next) => {
              setCode(next);
              if (problem?.kind === 'incorrect') setProblem(null);
            }}
            length={VERIFICATION_CODE_LENGTH}
            labelledBy={labelId}
            describedBy={messageId}
            isInvalid={hasError}
            disabled={isVerifying}
            autoFocus
          />
          <div aria-live="polite">
            <FieldMessage id={messageId} tone={hasError ? 'error' : 'neutral'}>
              {helper}
            </FieldMessage>
          </div>
        </div>

        {isExpired ? (
          <Button fullWidth onClick={handleResend} isLoading={isResending} loadingLabel="Sending…">
            Send a new code
          </Button>
        ) : (
          <Button
            type="submit"
            fullWidth
            disabled={code.length !== VERIFICATION_CODE_LENGTH}
            isLoading={isVerifying}
            loadingLabel="Verifying…"
          >
            Verify
          </Button>
        )}
      </form>

      <div className="flex flex-col gap-2">
        <p className="text-caption text-fg-tertiary">
          {isExpired ? 'Need help signing in?' : 'Didn’t receive the code?'}
        </p>
        <div className="flex flex-wrap gap-4">
          {isExpired ? null : (
            <TextButton
              onClick={handleResend}
              disabled={!canResend}
              aria-busy={isResending || undefined}
            >
              Resend code
            </TextButton>
          )}
          <ContactSuperAdminLink email={adminSupportEmail} />
        </div>
      </div>
    </div>
  );
}
