import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type AlertTone = 'error' | 'warning' | 'success' | 'info';

const toneStyles: Record<
  AlertTone,
  { box: string; title: string; icon: string; Icon: LucideIcon }
> = {
  error: {
    box: 'bg-danger-bg border-danger-subtle',
    title: 'text-danger-fg',
    icon: 'text-icon-danger',
    Icon: CircleAlert,
  },
  warning: {
    box: 'bg-warning-bg border-warning-subtle',
    title: 'text-warning-fg',
    icon: 'text-icon-warning',
    Icon: TriangleAlert,
  },
  success: {
    box: 'bg-success-bg border-success-subtle',
    title: 'text-success-fg',
    icon: 'text-icon-success',
    Icon: CircleCheck,
  },
  info: {
    box: 'bg-info-bg border-info-subtle',
    title: 'text-info-fg',
    icon: 'text-icon-brand',
    Icon: Info,
  },
};

type AlertProps = {
  tone: AlertTone;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * Inline, persistent message for a problem the user must act on.
 * Errors and warnings are announced assertively; success and info politely.
 */
export function Alert({ tone, title, children, className }: AlertProps) {
  const { box, title: titleClass, icon, Icon } = toneStyles[tone];
  const isUrgent = tone === 'error' || tone === 'warning';

  return (
    <div
      role={isUrgent ? 'alert' : 'status'}
      className={cn('flex w-full items-start gap-3 rounded-lg border px-4 py-3', box, className)}
    >
      <Icon aria-hidden className={cn('size-5 shrink-0', icon)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn('text-body-md font-medium', titleClass)}>{title}</p>
        {children ? <div className="text-body-sm text-fg">{children}</div> : null}
      </div>
    </div>
  );
}
