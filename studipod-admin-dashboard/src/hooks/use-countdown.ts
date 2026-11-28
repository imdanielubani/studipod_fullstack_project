'use client';

import { useSyncExternalStore } from 'react';

const TICK_MS = 1_000;

/** One shared one-second clock for every countdown on the page. */
const clock = (() => {
  let now = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      if (!timer) {
        now = Date.now();
        timer = setInterval(() => {
          now = Date.now();
          listeners.forEach((notify) => notify());
        }, TICK_MS);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    getSnapshot: (): number => now,
  };
})();

const noopSubscribe = () => () => undefined;

/** Current time in epoch ms, refreshed every second while subscribed. */
export function useNow(isActive = true): number {
  return useSyncExternalStore(
    isActive ? clock.subscribe : noopSubscribe,
    clock.getSnapshot,
    clock.getSnapshot,
  );
}

/**
 * Milliseconds left until `targetMs` (epoch ms), updated every second.
 * Returns 0 once the target has passed, and null when there is no target.
 */
export function useCountdown(targetMs: number | null): number | null {
  const now = useNow(targetMs !== null);
  if (targetMs === null) return null;
  return Math.max(0, targetMs - now);
}
