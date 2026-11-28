import { CircleCheck, Lock, Mail, Sparkle, type LucideIcon } from 'lucide-react';
import Image from 'next/image';

import { BrandLogo } from '@/components/shared/brand-logo';
import { APP_CONFIG, currentYear } from '@/config/app';
import { cn } from '@/lib/utils';

type FeatureChip = {
  label: string;
  Icon: LucideIcon;
  /** Position within the panel, as a percentage of its width and height. */
  left: string;
  top: string;
};

const FEATURE_CHIPS: ReadonlyArray<FeatureChip> = [
  { label: 'Email code sign-in', Icon: Mail, left: '60.6%', top: '14.2%' },
  { label: 'Role-based access', Icon: Lock, left: '10%', top: '19.6%' },
  { label: 'Every action audited', Icon: CircleCheck, left: '58.1%', top: '71.1%' },
  { label: 'Live platform health', Icon: Sparkle, left: '8.75%', top: '79.1%' },
];

const TEAM_AVATARS: ReadonlyArray<{ initials: string; colour: string }> = [
  { initials: 'DU', colour: 'bg-[var(--sp-avatar-blue)]' },
  { initials: 'KM', colour: 'bg-[var(--sp-avatar-rose)]' },
  { initials: 'TS', colour: 'bg-[var(--sp-avatar-amber)]' },
  { initials: '+5', colour: 'bg-[var(--sp-avatar-slate)]' },
];

/** Left half of every desktop authentication screen. Decorative except the logo. */
export function AuthBrandPanel({ className }: { className?: string }) {
  return (
    <aside
      aria-label={`${APP_CONFIG.productName} ${APP_CONFIG.consoleName}`}
      className={cn(
        'relative isolate overflow-hidden bg-[image:var(--sp-gradient-brand-panel)] text-on-brand',
        className,
      )}
    >
      <Image
        src="/images/auth/brand-glow.svg"
        alt=""
        aria-hidden
        width={920}
        height={920}
        unoptimized
        className="pointer-events-none absolute -right-[360px] -bottom-[360px] -z-10 max-w-none select-none"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--sp-brand-grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--sp-brand-grid-line)_1px,transparent_1px)] bg-[size:48px_48px]"
      />

      <BrandLogo priority className="absolute top-12 left-12 w-[150px]" />

      <ul aria-hidden className="contents">
        {FEATURE_CHIPS.map(({ label, Icon, left, top }) => (
          <li
            key={label}
            style={{ left, top }}
            className="absolute flex items-center gap-2 rounded-full border border-[var(--sp-glass-border)] bg-[var(--sp-glass-bg)] px-4 py-2 text-caption font-medium whitespace-nowrap backdrop-blur-sm"
          >
            <Icon className="size-3.5" />
            {label}
          </li>
        ))}
      </ul>

      <div className="absolute top-[35%] right-12 left-16 flex flex-col">
        <Sparkle aria-hidden className="size-8" strokeWidth={1.5} />
        <p className="mt-5 text-display-lg font-bold">
          Run {APP_CONFIG.productName}
          <br />
          with confidence.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div aria-hidden className="flex">
            {TEAM_AVATARS.map(({ initials, colour }) => (
              <span
                key={initials}
                className={cn(
                  '-mr-2.5 grid size-9 place-items-center rounded-full border-2 border-brand-dark text-caption font-medium text-brand-dark last:mr-0',
                  colour,
                )}
              >
                {initials}
              </span>
            ))}
          </div>
          <p className="text-body-md text-on-sidebar">
            A secure workspace for the {APP_CONFIG.productName} operations team
          </p>
        </div>
      </div>

      <div className="absolute right-12 bottom-8 left-12 flex justify-between gap-4 text-caption text-on-sidebar-muted">
        <p>
          © {currentYear()} {APP_CONFIG.productName}. All rights reserved.
        </p>
        <p>
          {APP_CONFIG.consoleName} · {APP_CONFIG.consoleVersionLabel}
        </p>
      </div>
    </aside>
  );
}

/** Compact brand header shown above authentication screens below the desktop breakpoint. */
export function AuthMobileHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 bg-[image:var(--sp-gradient-brand-panel)] px-5 py-6 text-on-brand',
        className,
      )}
    >
      <BrandLogo priority className="w-[104px]" />
      <p className="text-h3 font-semibold tracking-normal">
        Run {APP_CONFIG.productName} with confidence.
      </p>
    </header>
  );
}

export function AuthMobileFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('px-5 pt-4 pb-6 text-caption text-fg-tertiary', className)}>
      © {currentYear()} {APP_CONFIG.productName} · {APP_CONFIG.consoleName}{' '}
      {APP_CONFIG.consoleVersionLabel}
    </footer>
  );
}
