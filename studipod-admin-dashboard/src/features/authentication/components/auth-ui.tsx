import { ArrowLeft, ShieldCheck, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type AuthHeadingProps = {
  overline: string;
  title: string;
  description?: ReactNode;
  /** Renders the title as the page's h1. */
  titleId?: string;
};

/** Overline, title and supporting copy at the top of each auth form. */
export function AuthHeading({ overline, title, description, titleId }: AuthHeadingProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-overline font-semibold text-link uppercase">{overline}</p>
      <h1 id={titleId} className="text-h1 font-bold text-heading">
        {title}
      </h1>
      {description ? <p className="text-body-md text-fg-secondary">{description}</p> : null}
    </div>
  );
}

export function SecurityNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-caption text-fg-secondary">
      <ShieldCheck aria-hidden className="size-4 shrink-0 text-icon-success" />
      <span>{children}</span>
    </p>
  );
}

export function BackToSignInLink() {
  return (
    <Link
      href="/sign-in"
      className="inline-flex items-center gap-2 self-start rounded-sm text-body-md font-medium text-link hover:underline focus-visible:shadow-focus focus-visible:outline-none"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Back to sign in
    </Link>
  );
}

type IconBadgeProps = {
  icon: LucideIcon;
  tone?: 'brand' | 'warning' | 'danger';
  size?: 'md' | 'lg' | 'xl';
};

const badgeTone = {
  brand: 'bg-brand-soft text-icon-brand',
  warning: 'bg-warning-bg text-icon-warning',
  danger: 'bg-danger-bg text-icon-danger',
} as const;

const badgeSize = {
  md: { box: 'size-12', icon: 'size-6' },
  lg: { box: 'size-14', icon: 'size-7' },
  xl: { box: 'size-[72px]', icon: 'size-9' },
} as const;

export function IconBadge({ icon: Icon, tone = 'brand', size = 'lg' }: IconBadgeProps) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full',
        badgeTone[tone],
        badgeSize[size].box,
      )}
    >
      <Icon aria-hidden className={badgeSize[size].icon} />
    </span>
  );
}

/** Link-styled anchor for in-flow navigation (for example "Forgot password?"). */
export function AuthLink({
  href,
  children,
  className,
}: {
  href: '/forgot-password' | '/sign-in';
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-sm text-body-md font-medium text-link hover:underline focus-visible:shadow-focus focus-visible:outline-none',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** "Contact a Super Admin" link; hidden when no support mailbox is configured. */
export function ContactSuperAdminLink({ email }: { email: string | null }) {
  if (!email) return null;
  return (
    <a
      href={`mailto:${email}`}
      className="rounded-sm text-body-md font-medium text-link hover:underline focus-visible:shadow-focus focus-visible:outline-none"
    >
      Contact a Super Admin
    </a>
  );
}
