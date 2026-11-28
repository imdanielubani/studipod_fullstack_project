'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Closes a floating panel on Escape or on a pointer press outside it.
 * Elements listed in `ignore` (usually the trigger) do not count as outside.
 */
export function useDismiss(
  isOpen: boolean,
  onDismiss: () => void,
  panelRef: RefObject<HTMLElement | null>,
  ignore: ReadonlyArray<RefObject<HTMLElement | null>> = [],
): void {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (ignore.some((ref) => ref.current?.contains(target))) return;
      onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // `ignore` is a list of stable refs; listing it would resubscribe every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onDismiss, panelRef]);
}
