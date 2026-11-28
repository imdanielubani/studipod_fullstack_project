'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the drawer. */
  label: string;
  className?: string;
  children: ReactNode;
};

/**
 * Left-hand slide-in panel on the native <dialog> element: the browser provides
 * the focus trap, the inert page behind it and Escape to close.
 */
export function Drawer({ open, onClose, label, className, children }: DrawerProps) {
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
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-[320px] max-w-[85vw] p-0',
        'backdrop:bg-overlay',
        'open:animate-in open:duration-200 open:slide-in-from-left',
        className,
      )}
    >
      {open ? children : null}
    </dialog>
  );
}
