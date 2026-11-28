'use client';

import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast as sonner, Toaster as SonnerToaster } from 'sonner';

import { cn } from '@/lib/utils';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

type ToastContent = {
  title: ReactNode;
  description?: ReactNode;
  /** Stable id: showing a toast with the same id replaces the previous one. */
  id?: string;
};

/** Auto-dismiss timing from the design system. Errors stay until closed. */
const TOAST_DURATION_MS: Record<ToastTone, number> = {
  success: 5_000,
  info: 5_000,
  warning: 8_000,
  error: Number.POSITIVE_INFINITY,
};

const toneStyles: Record<ToastTone, { badge: string; icon: string; Icon: LucideIcon }> = {
  success: { badge: 'bg-success-bg', icon: 'text-icon-success', Icon: CircleCheck },
  info: { badge: 'bg-info-bg', icon: 'text-icon-brand', Icon: Info },
  warning: { badge: 'bg-warning-bg', icon: 'text-icon-warning', Icon: TriangleAlert },
  error: { badge: 'bg-danger-bg', icon: 'text-icon-danger', Icon: CircleAlert },
};

type ToastCardProps = ToastContent & {
  tone: ToastTone;
  onDismiss: () => void;
};

function ToastCard({ tone, title, description, onDismiss }: ToastCardProps) {
  const { badge, icon, Icon } = toneStyles[tone];
  const isUrgent = tone === 'error' || tone === 'warning';

  return (
    <div
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      className="flex w-full items-start gap-3 rounded-lg border border-line bg-surface-raised p-4 shadow-elevation-lg sm:w-[380px]"
    >
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', badge)}>
        <Icon aria-hidden className={cn('size-[18px]', icon)} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-body-md font-medium text-fg">{title}</p>
        {description ? <p className="text-body-sm text-fg-secondary">{description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-1 grid size-6 shrink-0 place-items-center rounded-sm text-icon hover:text-icon-strong focus-visible:shadow-focus focus-visible:outline-none"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

function show(tone: ToastTone, { id, ...content }: ToastContent): string | number {
  return sonner.custom(
    (toastId) => <ToastCard tone={tone} {...content} onDismiss={() => sonner.dismiss(toastId)} />,
    { id, duration: TOAST_DURATION_MS[tone] },
  );
}

/** Transient feedback. Use an inline Alert for problems the user must fix. */
export const notify = {
  success: (content: ToastContent) => show('success', content),
  info: (content: ToastContent) => show('info', content),
  warning: (content: ToastContent) => show('warning', content),
  error: (content: ToastContent) => show('error', content),
  dismiss: (id?: string | number) => sonner.dismiss(id),
};

/** Toast viewport: top-right, 24px from the edges, newest on top, at most three. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      offset={24}
      mobileOffset={16}
      visibleToasts={3}
      gap={12}
      containerAriaLabel="Notifications"
      toastOptions={{ unstyled: true, className: 'w-full sm:w-[380px]' }}
    />
  );
}
