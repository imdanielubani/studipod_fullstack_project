'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  labelledBy: string;
  describedBy?: string;
  /** Called when the user presses Escape. Omit to make the dialog non-dismissible. */
  onDismiss?: () => void;
  /** Alert dialogs interrupt the user and require a response. */
  isAlert?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Centred modal built on the native <dialog> element: the browser provides the
 * focus trap, inert background, focus return and Escape handling.
 */
export function Modal({
  open,
  labelledBy,
  describedBy,
  onDismiss,
  isAlert = false,
  className,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      role={isAlert ? 'alertdialog' : 'dialog'}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss?.();
      }}
      className={cn(
        'm-auto w-[calc(100%-32px)] max-w-[440px] rounded-xl bg-surface p-6 shadow-elevation-xl',
        'backdrop:bg-overlay backdrop:backdrop-blur-[2px]',
        'open:animate-in open:fade-in-0 open:zoom-in-95',
        className,
      )}
    >
      {open ? children : null}
    </dialog>
  );
}
