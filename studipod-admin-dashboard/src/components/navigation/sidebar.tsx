'use client';

import { LogOut, PanelLeft } from 'lucide-react';

import { BrandLogo } from '@/components/shared/brand-logo';
import { Avatar } from '@/components/ui/avatar';
import type { NavLocation, NavSection } from '@/config/navigation';

import { CollapsedSidebar } from './collapsed-sidebar';
import { NavList, type NavCounts } from './nav-list';

export type SidebarAccount = {
  fullName: string;
  initials: string;
  roleLabel: string | null;
};

type SidebarProps = {
  sections: ReadonlyArray<NavSection>;
  active: NavLocation | null;
  openGroupKey: string | null;
  onToggleGroup: (groupKey: string) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  account: SidebarAccount;
  onSignOut: () => void;
  counts?: NavCounts;
};

/**
 * Desktop sidebar: expanded (264px) with labels and dropdown groups, or
 * collapsed (72px) icons with a flyout per group.
 */
export function Sidebar({ isCollapsed, ...props }: SidebarProps) {
  if (isCollapsed) {
    return (
      <CollapsedSidebar
        sections={props.sections}
        active={props.active}
        counts={props.counts}
        account={props.account}
        onExpand={props.onToggleCollapsed}
      />
    );
  }
  return <ExpandedSidebar {...props} />;
}

function ExpandedSidebar({
  sections,
  active,
  openGroupKey,
  onToggleGroup,
  onToggleCollapsed,
  account,
  onSignOut,
  counts,
}: Omit<SidebarProps, 'isCollapsed'>) {
  return (
    <aside className="sticky top-0 flex h-dvh w-[264px] shrink-0 flex-col bg-sidebar px-3 pt-5 pb-4">
      <div className="flex items-center justify-between pr-2 pb-2 pl-3">
        <BrandLogo className="w-[124px]" />
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="-mr-1.5 grid size-8 place-items-center rounded-md text-on-sidebar hover:bg-sidebar-hover hover:text-white focus-visible:shadow-focus focus-visible:outline-none"
        >
          <PanelLeft aria-hidden className="size-[18px]" />
        </button>
      </div>

      <nav
        aria-label="Main"
        className="-mx-1 min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--sp-bg-sidebar-item-hover)_transparent] overflow-y-auto px-1 pb-4"
      >
        <NavList
          sections={sections}
          active={active}
          openGroupKey={openGroupKey}
          onToggleGroup={onToggleGroup}
          counts={counts}
        />
      </nav>

      <div className="flex items-center gap-3 rounded-lg bg-sidebar-hover px-3 py-2">
        <Avatar initials={account.initials} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-md font-medium text-white">{account.fullName}</p>
          {account.roleLabel ? (
            <p className="truncate text-caption text-on-sidebar-muted">{account.roleLabel}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="-mr-1 grid size-8 shrink-0 place-items-center rounded-md text-on-sidebar hover:bg-sidebar hover:text-white focus-visible:shadow-focus focus-visible:outline-none"
        >
          <LogOut aria-hidden className="size-[18px]" />
        </button>
      </div>
    </aside>
  );
}
