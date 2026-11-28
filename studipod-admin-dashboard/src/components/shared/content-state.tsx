import { Inbox, LoaderCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** White content card that sits under (and overlaps) the blue page header. */
export function ContentCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl bg-surface shadow-elevation-xs', className)}>
      {children}
    </section>
  );
}

type StateProps = {
  title: string;
  description?: string;
  className?: string;
};

/** Loading state that replaces only the content slot. */
export function ContentLoading({
  title = 'Loading…',
  description = 'This usually takes a few seconds.',
  className,
}: Partial<StateProps>) {
  return (
    <div
      role="status"
      className={cn(
        'flex min-h-[420px] flex-col items-center justify-center gap-2 p-8 text-center',
        className,
      )}
    >
      <LoaderCircle aria-hidden className="mb-2 size-8 animate-spin text-icon-brand" />
      <p className="text-body-md font-medium text-fg">{title}</p>
      {description ? <p className="text-caption text-fg-secondary">{description}</p> : null}
    </div>
  );
}

/** Empty state that replaces only the content slot. */
export function ContentEmpty({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: StateProps & { icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div
      className={cn(
        'flex min-h-[420px] flex-col items-center justify-center gap-2 p-8 text-center',
        className,
      )}
    >
      <span className="mb-2 grid size-14 place-items-center rounded-full bg-brand-soft text-icon-brand">
        <Icon aria-hidden className="size-7" />
      </span>
      <p className="text-h4 font-semibold text-fg">{title}</p>
      {description ? (
        <p className="max-w-md text-body-md text-fg-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
