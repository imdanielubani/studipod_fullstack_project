'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Layout breakpoints (match Tailwind's md and xl). */
export const MEDIA = {
  /** Tablet and up: the sidebar replaces the mobile drawer. */
  tablet: '(min-width: 768px)',
  /** Wide desktop: the sidebar is expanded by default. */
  wide: '(min-width: 1280px)',
} as const;

/** Whether a CSS media query currently matches. False during server rendering. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
