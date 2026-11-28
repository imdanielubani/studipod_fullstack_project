'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { useId } from 'react';

import { CountPill } from '@/components/ui/badge';
import type { NavGroup, NavLocation, NavSection } from '@/config/navigation';
import { cn } from '@/lib/utils';

/** Items needing action, keyed by group key or page key (coral counts). */
export type NavCounts = Readonly<Record<string, number>>;

type NavListProps = {
  sections: ReadonlyArray<NavSection>;
  active: NavLocation | null;
  /** Key of the open group, or null when every group is closed. */
  openGroupKey: string | null;
  onToggleGroup: (groupKey: string) => void;
  counts?: NavCounts;
  /** Called after a page link is followed (closes the mobile drawer). */
  onNavigate?: () => void;
};

/**
 * Sidebar navigation: section labels, groups with a chevron and optional coral
 * count, and the pages of the one open group. Used by the expanded sidebar and
 * the mobile drawer.
 */
export function NavList({
  sections,
  active,
  openGroupKey,
  onToggleGroup,
  counts = {},
  onNavigate,
}: NavListProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {sections.map((section) => (
        <div key={section.key} className="flex flex-col gap-0.5">
          <p className="px-3 pt-2 pb-1 text-overline font-semibold text-on-sidebar-muted uppercase">
            {section.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.groups.map((group) => (
              <NavGroupItem
                key={group.key}
                group={group}
                active={active}
                isOpen={openGroupKey === group.key}
                onToggle={() => onToggleGroup(group.key)}
                counts={counts}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

type NavGroupItemProps = {
  group: NavGroup;
  active: NavLocation | null;
  isOpen: boolean;
  onToggle: () => void;
  counts: NavCounts;
  onNavigate?: () => void;
};

function NavGroupItem({ group, active, isOpen, onToggle, counts, onNavigate }: NavGroupItemProps) {
  const listId = useId();
  const isActiveGroup = active?.group.key === group.key;
  const count = counts[group.key] ?? 0;
  const Chevron = isOpen ? ChevronUp : ChevronDown;
  const Icon = group.icon;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={listId}
        className={cn(
          'flex h-8 w-full items-center gap-3 rounded-md px-3 text-left text-body-md font-medium transition-colors',
          'focus-visible:shadow-focus focus-visible:outline-none',
          isActiveGroup
            ? 'bg-sidebar-active text-white'
            : 'text-on-sidebar hover:bg-sidebar-hover hover:text-white',
        )}
      >
        <Icon aria-hidden className="size-[18px] shrink-0" />
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
        {count > 0 ? (
          <>
            <span aria-hidden>
              <CountPill count={count} />
            </span>
            <span className="sr-only">{`, ${count} need action`}</span>
          </>
        ) : null}
        <Chevron aria-hidden className="size-4 shrink-0" />
      </button>
      {isOpen ? (
        <ul id={listId} className="mt-0.5 flex flex-col gap-0.5">
          {group.pages.map((page) => {
            const isCurrent = active?.page.key === page.key;
            const pageCount = counts[page.key] ?? 0;
            return (
              <li key={page.key}>
                <Link
                  href={page.href as Route}
                  onClick={onNavigate}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    'flex h-[30px] items-center gap-3 rounded-md pr-3 pl-10 text-body-sm transition-colors',
                    'focus-visible:shadow-focus focus-visible:outline-none',
                    isCurrent
                      ? 'bg-sidebar-hover text-white'
                      : 'text-on-sidebar-muted hover:bg-sidebar-hover hover:text-white',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{page.label}</span>
                  {pageCount > 0 ? (
                    <>
                      <span aria-hidden>
                        <CountPill count={pageCount} />
                      </span>
                      <span className="sr-only">{`, ${pageCount} need action`}</span>
                    </>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
