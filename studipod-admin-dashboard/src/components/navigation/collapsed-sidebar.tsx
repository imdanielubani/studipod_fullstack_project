'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';

import { AppIcon } from '@/components/shared/brand-logo';
import { Avatar } from '@/components/ui/avatar';
import { CountPill } from '@/components/ui/badge';
import type { NavGroup, NavLocation, NavSection } from '@/config/navigation';
import { useDismiss } from '@/hooks/use-dismiss';
import { cn } from '@/lib/utils';

import type { NavCounts } from './nav-list';
import type { SidebarAccount } from './sidebar';

/** Delay before a hover-opened flyout closes, so the pointer can travel into it. */
const HOVER_CLOSE_DELAY_MS = 150;
/** Gap between the 72px rail and the flyout (design: flyout at x = 80). */
const FLYOUT_OFFSET_PX = 8;

type CollapsedSidebarProps = {
  sections: ReadonlyArray<NavSection>;
  active: NavLocation | null;
  counts?: NavCounts;
  account: SidebarAccount;
  onExpand: () => void;
};

type OpenFlyout = { groupKey: string; top: number; left: number; viaKeyboard: boolean };

/** 72px icon rail. Hovering or clicking a group icon opens its pages in a flyout. */
export function CollapsedSidebar({
  sections,
  active,
  counts = {},
  account,
  onExpand,
}: CollapsedSidebarProps) {
  const [flyout, setFlyout] = useState<OpenFlyout | null>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const openFor = (groupKey: string, viaKeyboard: boolean) => {
    cancelClose();
    const trigger = triggerRefs.current.get(groupKey);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setFlyout({ groupKey, top: rect.top, left: rect.right + FLYOUT_OFFSET_PX + 12, viaKeyboard });
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setFlyout(null), HOVER_CLOSE_DELAY_MS);
  };

  const openGroupKey = flyout?.groupKey ?? null;
  const close = useCallback(
    (returnFocus: boolean) => {
      if (returnFocus && openGroupKey) triggerRefs.current.get(openGroupKey)?.focus();
      setFlyout(null);
    },
    [openGroupKey],
  );

  useEffect(() => cancelClose, []);

  const openGroup = sections
    .flatMap((section) => section.groups)
    .find((group) => group.key === flyout?.groupKey);

  return (
    <aside className="sticky top-0 flex h-dvh w-[72px] shrink-0 flex-col items-center gap-1 bg-sidebar pt-5 pb-4">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand sidebar"
        title="Expand sidebar"
        className="rounded-lg focus-visible:shadow-focus focus-visible:outline-none"
      >
        <AppIcon />
      </button>
      <div aria-hidden className="h-3" />

      <nav
        aria-label="Main"
        className="flex min-h-0 w-full flex-1 [scrollbar-width:none] flex-col items-center gap-1 overflow-y-auto"
      >
        {sections.map((section) => (
          <Fragment key={section.key}>
            <div aria-hidden className="h-px w-8 shrink-0 bg-sidebar-hover" />
            <ul aria-label={section.label} className="flex flex-col items-center gap-1">
              {section.groups.map((group) => (
                <li key={group.key}>
                  <RailButton
                    group={group}
                    isActive={active?.group.key === group.key}
                    isOpen={flyout?.groupKey === group.key}
                    count={counts[group.key] ?? 0}
                    registerRef={(node) => {
                      if (node) triggerRefs.current.set(group.key, node);
                      else triggerRefs.current.delete(group.key);
                    }}
                    onPointerEnter={() => openFor(group.key, false)}
                    onPointerLeave={scheduleClose}
                    onActivate={(viaKeyboard) =>
                      flyout?.groupKey === group.key
                        ? close(false)
                        : openFor(group.key, viaKeyboard)
                    }
                  />
                </li>
              ))}
            </ul>
          </Fragment>
        ))}
      </nav>

      <span title={account.fullName} className="mt-2">
        <Avatar initials={account.initials} />
        <span className="sr-only">{`Signed in as ${account.fullName}`}</span>
      </span>

      {flyout && openGroup ? (
        <Flyout
          group={openGroup}
          active={active}
          counts={counts}
          position={flyout}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
          onClose={close}
        />
      ) : null}
    </aside>
  );
}

type RailButtonProps = {
  group: NavGroup;
  isActive: boolean;
  isOpen: boolean;
  count: number;
  registerRef: (node: HTMLButtonElement | null) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onActivate: (viaKeyboard: boolean) => void;
};

function RailButton({
  group,
  isActive,
  isOpen,
  count,
  registerRef,
  onPointerEnter,
  onPointerLeave,
  onActivate,
}: RailButtonProps) {
  const Icon = group.icon;
  return (
    <button
      ref={registerRef}
      type="button"
      data-rail-group={group.key}
      aria-label={count > 0 ? `${group.label}, ${count} need action` : group.label}
      aria-expanded={isOpen}
      aria-haspopup="true"
      onPointerEnter={(event) => event.pointerType === 'mouse' && onPointerEnter()}
      onPointerLeave={(event) => event.pointerType === 'mouse' && onPointerLeave()}
      // detail === 0 means the click came from the keyboard (Enter or Space).
      onClick={(event) => onActivate(event.detail === 0)}
      className={cn(
        'relative grid h-9 w-12 place-items-center rounded-md transition-colors',
        'focus-visible:shadow-focus focus-visible:outline-none',
        isActive
          ? 'bg-sidebar-active text-white'
          : 'text-on-sidebar hover:bg-sidebar-hover hover:text-white',
        isOpen && !isActive && 'bg-sidebar-hover text-white',
      )}
    >
      <Icon aria-hidden className="size-[18px]" />
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute top-1.5 right-3 size-2 rounded-full bg-accent-coral ring-2 ring-sidebar"
        />
      ) : null}
    </button>
  );
}

type FlyoutProps = {
  group: NavGroup;
  active: NavLocation | null;
  counts: NavCounts;
  position: OpenFlyout;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClose: (returnFocus: boolean) => void;
};

function Flyout({
  group,
  active,
  counts,
  position,
  onPointerEnter,
  onPointerLeave,
  onClose,
}: FlyoutProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const dismiss = useCallback(() => onClose(true), [onClose]);
  // Clicking the group's own rail button toggles the flyout; it is not "outside".
  useEffect(() => {
    triggerRef.current = document.querySelector<HTMLElement>(`[data-rail-group="${group.key}"]`);
  }, [group.key]);
  useDismiss(true, dismiss, panelRef, [triggerRef]);

  useEffect(() => {
    if (position.viaKeyboard) panelRef.current?.querySelector<HTMLElement>('a')?.focus();
  }, [position.viaKeyboard]);

  return (
    <div
      ref={panelRef}
      role="group"
      aria-labelledby={headingId}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{ top: position.top, left: position.left }}
      className="fixed z-40 flex w-[248px] flex-col gap-0.5 rounded-lg border border-white/8 bg-sidebar p-2 shadow-elevation-lg"
    >
      <p
        id={headingId}
        className="px-2 pb-1 text-overline font-semibold text-on-sidebar-muted uppercase"
      >
        {group.label}
      </p>
      <ul className="flex flex-col gap-0.5">
        {group.pages.map((page) => {
          const isCurrent = active?.page.key === page.key;
          const count = counts[page.key] ?? 0;
          return (
            <li key={page.key}>
              <Link
                href={page.href as Route}
                onClick={() => onClose(false)}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'flex h-[30px] items-center gap-3 rounded-md pr-2 pl-8 text-body-sm transition-colors',
                  'focus-visible:shadow-focus focus-visible:outline-none',
                  isCurrent
                    ? 'bg-sidebar-hover text-white'
                    : 'text-on-sidebar-muted hover:bg-sidebar-hover hover:text-white',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{page.label}</span>
                {count > 0 ? (
                  <>
                    <span aria-hidden>
                      <CountPill count={count} />
                    </span>
                    <span className="sr-only">{`, ${count} need action`}</span>
                  </>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
