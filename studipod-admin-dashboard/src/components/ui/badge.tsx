import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral';

const tones: Record<BadgeTone, { box: string; dot: string }> = {
  success: { box: 'bg-success-bg text-success-fg', dot: 'bg-icon-success' },
  warning: { box: 'bg-warning-bg text-warning-fg', dot: 'bg-icon-warning' },
  danger: { box: 'bg-danger-bg text-danger-fg', dot: 'bg-icon-danger' },
  info: { box: 'bg-info-bg text-info-fg', dot: 'bg-icon-brand' },
  brand: { box: 'bg-brand-soft text-link', dot: 'bg-icon-brand' },
  neutral: { box: 'bg-subtle text-fg-secondary', dot: 'bg-icon' },
};

type BadgeProps = {
  tone: BadgeTone;
  children: ReactNode;
  showDot?: boolean;
  className?: string;
};

/**
 * Status pill. Success = healthy, Warning = needs attention, Danger = blocked or
 * failed, Info = new, Brand = plan or feature, Neutral = closed or inactive.
 */
export function Badge({ tone, children, showDot = false, className }: BadgeProps) {
  const { box, dot } = tones[tone];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium whitespace-nowrap',
        box,
        className,
      )}
    >
      {showDot ? <span aria-hidden className={cn('size-1.5 rounded-full', dot)} /> : null}
      {children}
    </span>
  );
}

/** Coral count of items needing action (sidebar groups and pages). */
export function CountPill({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-accent-coral px-2 py-0.5 text-caption font-medium text-brand-dark tabular-nums',
        className,
      )}
    >
      {count > 999 ? '999+' : count}
    </span>
  );
}
