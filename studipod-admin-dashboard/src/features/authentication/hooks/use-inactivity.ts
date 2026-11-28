'use client';

import { useCallback, useEffect, useState } from 'react';

import { useNow } from '@/hooks/use-countdown';

import {
  ACTIVITY_WRITE_THROTTLE_MS,
  inactivityPhase,
  LAST_ACTIVITY_STORAGE_KEY,
  readLastActivity,
  remainingMs,
  writeLastActivity,
  type InactivityPhase,
} from '../session/inactivity';

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;

export type InactivityState = {
  phase: InactivityPhase;
  /** Milliseconds until automatic sign-out. */
  remaining: number;
  /** Records activity now (for example after "Stay signed in"). */
  markActive: () => void;
};

/**
 * Tracks user activity for the 24-hour inactivity rule. Activity in any tab
 * keeps every tab signed in, through a shared timestamp in localStorage.
 */
export function useInactivity(enabled: boolean): InactivityState {
  const [localLastActivity, setLocalLastActivity] = useState(() => Date.now());
  const now = useNow(enabled);

  const markActive = useCallback(() => {
    const at = Date.now();
    setLocalLastActivity(at);
    writeLastActivity(at);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    // Signing in or opening the console counts as activity.
    writeLastActivity(Date.now());

    let lastWrite = 0;
    const handleActivity = () => {
      const at = Date.now();
      if (at - lastWrite < ACTIVITY_WRITE_THROTTLE_MS) return;
      lastWrite = at;
      setLocalLastActivity(at);
      writeLastActivity(at);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LAST_ACTIVITY_STORAGE_KEY || !event.newValue) return;
      const at = Number(event.newValue);
      if (Number.isFinite(at)) setLocalLastActivity((current) => Math.max(current, at));
    };

    ACTIVITY_EVENTS.forEach((type) =>
      window.addEventListener(type, handleActivity, { passive: true }),
    );
    window.addEventListener('storage', handleStorage);
    return () => {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, handleActivity));
      window.removeEventListener('storage', handleStorage);
    };
  }, [enabled]);

  const lastActivity = Math.max(localLastActivity, readLastActivity() ?? 0);
  return {
    phase: inactivityPhase(lastActivity, now),
    remaining: remainingMs(lastActivity, now),
    markActive,
  };
}
