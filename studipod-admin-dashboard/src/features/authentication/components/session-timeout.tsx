'use client';

import { Clock } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { notify } from '@/components/ui/toast';

import { useInactivity } from '../hooks/use-inactivity';
import { formatCountdown, INACTIVITY_WARNING_MS } from '../session/inactivity';
import { refreshSession } from '../session/session-manager';
import { IconBadge } from './auth-ui';

type SessionTimeoutProps = {
  /** Ends the session because of inactivity (the expired dialog stays open). */
  onExpire: () => void;
  /** Signs out at the user's request. */
  onSignOut: () => void;
};

/**
 * Inactivity warning and automatic sign-out. Two minutes before the 24-hour
 * limit a countdown dialog appears; any activity or "Stay signed in" dismisses it.
 */
export function SessionTimeout({ onExpire, onSignOut }: SessionTimeoutProps) {
  const titleId = useId();
  const descriptionId = useId();
  const { phase, remaining, markActive } = useInactivity(true);
  const [isRenewing, setIsRenewing] = useState(false);
  const previousPhase = useRef(phase);

  useEffect(() => {
    if (phase === 'expired') onExpire();
    if (previousPhase.current === 'warning' && phase === 'active') {
      notify.success({
        id: 'still-signed-in',
        title: 'You’re still signed in',
        description: 'We’ll sign you out after 24 hours of inactivity.',
      });
    }
    previousPhase.current = phase;
  }, [phase, onExpire]);

  async function handleStaySignedIn() {
    setIsRenewing(true);
    markActive();
    const result = await refreshSession();
    setIsRenewing(false);
    if (!result.ok && result.reason === 'unauthenticated') onExpire();
  }

  const progress = Math.min(1, remaining / INACTIVITY_WARNING_MS);

  return (
    <Modal open={phase === 'warning'} labelledBy={titleId} describedBy={descriptionId} isAlert>
      <div className="flex flex-col gap-4">
        <IconBadge icon={Clock} tone="warning" size="md" />
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-h3 font-semibold text-fg">
            Your session is about to expire
          </h2>
          <p id={descriptionId} className="text-body-md text-fg-secondary">
            You’ve been inactive for a while. For your security you’ll be signed out automatically.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 rounded-lg bg-warning-bg p-4 text-warning-fg">
          <div className="flex items-center justify-between">
            <span className="text-body-md">Signing out in</span>
            <span className="text-h2 font-bold tabular-nums" role="timer" aria-live="off">
              {formatCountdown(remaining)}
            </span>
          </div>
          <div aria-hidden className="h-1.5 overflow-hidden rounded-[3px] bg-warning-track">
            <div
              className="h-full origin-left rounded-[3px] bg-warning-fill transition-transform duration-1000 ease-linear"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
          <p className="text-caption">Move your mouse or press any key to stay signed in.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
          <Button onClick={handleStaySignedIn} isLoading={isRenewing}>
            Stay signed in
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Shown after automatic sign-out; the only way forward is signing in again. */
export function SessionExpiredDialog({ onSignInAgain }: { onSignInAgain: () => void }) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal open labelledBy={titleId} describedBy={descriptionId} isAlert>
      <div className="flex flex-col gap-4">
        <IconBadge icon={Clock} tone="warning" size="md" />
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-h3 font-semibold text-fg">
            Your session has expired
          </h2>
          <p id={descriptionId} className="text-body-md text-fg-secondary">
            You were signed out after 24 hours of inactivity. Sign in again to continue — unsaved
            changes on this page may be lost.
          </p>
        </div>
        <div>
          <Button onClick={onSignInAgain} autoFocus>
            Sign in again
          </Button>
        </div>
      </div>
    </Modal>
  );
}
