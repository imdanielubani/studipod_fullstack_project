'use client';

import { ArrowLeft, LogOut, PanelLeft, Search, X } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import type { BackLink } from '@/components/layout/shell-context';
import { BrandLogo } from '@/components/shared/brand-logo';
import { Avatar } from '@/components/ui/avatar';
import { Drawer } from '@/components/ui/drawer';
import type { NavLocation, NavSection } from '@/config/navigation';

import { NavList, type NavCounts } from './nav-list';
import type { SidebarAccount } from './sidebar';

const iconButtonClass =
  'grid size-10 shrink-0 place-items-center rounded-md text-white hover:bg-sidebar-hover focus-visible:shadow-focus focus-visible:outline-none';

type MobileTopBarProps = {
  /** When set, the bar shows a back arrow and the page title (Type=Detail). */
  backLink: BackLink | null;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  isMenuOpen: boolean;
  notifications: ReactNode;
  account: ReactNode;
};

/** Phone top bar: menu (or back), logo, search, notifications and account. */
export function MobileTopBar({
  backLink,
  onOpenMenu,
  onOpenSearch,
  isMenuOpen,
  notifications,
  account,
}: MobileTopBarProps) {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-1 bg-sidebar pr-3 pl-2 md:hidden">
      {backLink ? (
        <>
          <Link href={backLink.href as Route} aria-label="Back" className={iconButtonClass}>
            <ArrowLeft aria-hidden className="size-5" />
          </Link>
          <p className="min-w-0 flex-1 truncate text-body-md font-medium text-white">
            {backLink.label}
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation"
            aria-expanded={isMenuOpen}
            className={iconButtonClass}
          >
            <PanelLeft aria-hidden className="size-5" />
          </button>
          <BrandLogo className="w-[88px]" />
          <span className="flex-1" />
        </>
      )}
      <button type="button" onClick={onOpenSearch} aria-label="Search" className={iconButtonClass}>
        <Search aria-hidden className="size-5" />
      </button>
      {notifications}
      {account}
    </div>
  );
}

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  sections: ReadonlyArray<NavSection>;
  active: NavLocation | null;
  openGroupKey: string | null;
  onToggleGroup: (groupKey: string) => void;
  counts?: NavCounts;
  account: SidebarAccount;
  onSignOut: () => void;
};

/** The sidebar as a slide-in drawer on phones. */
export function MobileNavDrawer({
  open,
  onClose,
  sections,
  active,
  openGroupKey,
  onToggleGroup,
  counts,
  account,
  onSignOut,
}: MobileNavDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} label="Navigation" className="bg-sidebar">
      <div className="flex h-full flex-col gap-3 px-4 pt-5 pb-4">
        <div className="flex items-center justify-between pl-3">
          <BrandLogo className="w-[124px]" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className={iconButtonClass}
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <nav aria-label="Main" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <NavList
            sections={sections}
            active={active}
            openGroupKey={openGroupKey}
            onToggleGroup={onToggleGroup}
            counts={counts}
            onNavigate={onClose}
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
            className="grid size-8 shrink-0 place-items-center rounded-md text-on-sidebar hover:bg-sidebar hover:text-white focus-visible:shadow-focus focus-visible:outline-none"
          >
            <LogOut aria-hidden className="size-[18px]" />
          </button>
        </div>
      </div>
    </Drawer>
  );
}
