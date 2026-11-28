'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { useBackLink, useShell, type BackLink } from './shell-context';

export type Crumb = { label: string; href?: string };
export type HeaderStat = { label: string; value: string };

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  breadcrumb?: ReadonlyArray<Crumb>;
  /** Status badge beside the title (for example "Live data"). */
  badge?: ReactNode;
  stats?: ReadonlyArray<HeaderStat>;
  actions?: ReactNode;
  /** For pages opened from a list: phones show a back arrow instead of the menu. */
  back?: BackLink;
};

/**
 * Blue gradient header at the top of every console page. On desktop it carries
 * the breadcrumb and the shell utilities (search, notifications, account); the
 * content below overlaps it by 56px. On phones the utilities live in the top bar.
 */
export function PageHeader({
  title,
  description,
  breadcrumb = [],
  badge,
  stats = [],
  actions,
  back,
}: PageHeaderProps) {
  const shell = useShell();
  useBackLink(back ?? null);

  return (
    <header className="relative px-4 pt-4 pb-8 md:px-8 md:pt-5 md:pb-20">
      {/* Decorative layer: clips the glow without clipping the header's menus. */}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden bg-[image:var(--sp-gradient-page-header-mobile)] md:bg-[image:var(--sp-gradient-page-header)]"
      >
        <Image
          src="/images/shell/page-header-glow.svg"
          alt=""
          aria-hidden
          width={800}
          height={640}
          unoptimized
          className="pointer-events-none absolute -top-[300px] -right-[244px] hidden max-w-none select-none md:block"
        />
        <Image
          src="/images/shell/mobile-page-header-glow.svg"
          alt=""
          aria-hidden
          width={580}
          height={500}
          unoptimized
          className="pointer-events-none absolute -top-[200px] left-[30px] max-w-none select-none md:hidden"
        />
      </div>

      <div className="relative flex flex-col gap-3 md:gap-6">
        <div className="flex min-h-9 items-center justify-between gap-4">
          <Breadcrumb items={breadcrumb} />
          {shell?.headerUtilities ? (
            <div className="hidden items-center gap-3 md:flex">{shell.headerUtilities}</div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
          <div className="flex min-w-0 flex-col gap-3 md:gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-[26px] leading-[38px] font-bold tracking-[-0.015em] text-white md:text-h1">
                {title}
              </h1>
              {badge}
            </div>
            {description ? (
              <p className="max-w-[620px] text-body-md text-on-sidebar">{description}</p>
            ) : null}
            {stats.length > 0 ? <StatsPill stats={stats} /> : null}
          </div>
          {actions ? (
            <div className="flex gap-2 md:shrink-0 md:gap-3 [&>*]:flex-1 md:[&>*]:flex-none">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function Breadcrumb({ items }: { items: ReadonlyArray<Crumb> }) {
  if (items.length === 0) return <span />;
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-body-md font-medium text-on-sidebar-muted md:gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className={cn('truncate', isLast && 'md:text-on-sidebar')}>
                {item.href && !isLast ? (
                  <Link
                    href={item.href as Route}
                    className="rounded-sm hover:text-white focus-visible:shadow-focus focus-visible:outline-none"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
                )}
              </li>
              {isLast ? null : (
                <li aria-hidden className="select-none">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

function StatsPill({ stats }: { stats: ReadonlyArray<HeaderStat> }) {
  return (
    <dl className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 rounded-full border border-glass-line bg-glass px-4 py-2 font-medium md:w-fit md:flex-nowrap">
      {stats.map((stat, index) => (
        <Fragment key={stat.label}>
          {index > 0 ? (
            <span aria-hidden className="hidden h-4 w-px bg-glass-line md:block" />
          ) : null}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <dt className="text-caption text-on-sidebar-muted">{stat.label}</dt>
            <dd className="text-body-md text-white">{stat.value}</dd>
          </div>
        </Fragment>
      ))}
    </dl>
  );
}

/** Page body below the header; on desktop it overlaps the header by 56px. */
export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative px-4 pt-0 pb-8 md:-mt-14 md:px-8', className)}>{children}</div>
  );
}
