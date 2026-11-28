'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { MobileNavDrawer, MobileTopBar } from '@/components/navigation/mobile-navigation';
import { Sidebar } from '@/components/navigation/sidebar';
import { getPublicLinks } from '@/config/env';
import { ACCOUNT_PAGES, filterNavigation, findNavLocation } from '@/config/navigation';
import { MEDIA, useMediaQuery } from '@/hooks/use-media-query';

import { AccountMenu, type AccountSummary } from './account-menu';
import { KeyboardShortcutsDialog, useGlobalShortcuts } from './keyboard-shortcuts';
import { NotificationCenter } from './notifications';
import { buildSearchDestinations, SearchDialog, SearchTrigger } from './search-command';
import { ShellProvider, type BackLink } from './shell-context';
import { isSidebarCollapsed, useShellStore } from './shell-store';
import { useAdminNotifications } from './use-admin-notifications';

export type ShellAdministrator = {
  fullName: string;
  email: string;
  initials: string;
  roleLabel: string | null;
  signInLine: string | null;
  permissions: ReadonlyArray<string>;
};

type AppShellProps = {
  administrator: ShellAdministrator;
  onSignOut: () => void;
  children: ReactNode;
};

/**
 * Console frame from the layout patterns: sidebar (expanded 264px, collapsed
 * 72px, drawer on phones), the shell utilities in the page header, search,
 * notifications, the account menu and keyboard shortcuts. Pages render their
 * own PageHeader and content inside it.
 */
export function AppShell({ administrator, onSignOut, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isWideScreen = useMediaQuery(MEDIA.wide);
  const isTabletUp = useMediaQuery(MEDIA.tablet);
  const { sidebarMode, openGroupKey, isMobileNavOpen, ...shell } = useShellStore();
  const notifications = useAdminNotifications();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [backLink, setBackLink] = useState<BackLink | null>(null);
  const { adminHelpCentreUrl } = getPublicLinks();

  const sections = useMemo(
    () => filterNavigation(administrator.permissions),
    [administrator.permissions],
  );
  const destinations = useMemo(() => buildSearchDestinations(sections), [sections]);
  const active = findNavLocation(pathname, sections);
  // null follows the current page's group; '' means every group was closed by hand.
  const effectiveOpenGroup =
    openGroupKey === null ? (active?.group.key ?? null) : openGroupKey || null;
  const isCollapsed = isSidebarCollapsed(sidebarMode, isWideScreen);

  const { setOpenGroupKey, setMobileNavOpen, setSidebarMode } = shell;

  // A new page opens its own group again.
  useEffect(() => {
    setOpenGroupKey(null);
  }, [pathname, setOpenGroupKey]);

  // Growing past the phone layout closes the drawer.
  useEffect(() => {
    if (isTabletUp) setMobileNavOpen(false);
  }, [isTabletUp, setMobileNavOpen]);

  useGlobalShortcuts({
    onSearch: () => setIsSearchOpen(true),
    onShowShortcuts: () => setIsShortcutsOpen(true),
    onGoToProfile: () => router.push(ACCOUNT_PAGES.profile.href as Route),
    onGoToSecurity: () => router.push(ACCOUNT_PAGES.security.href as Route),
  });

  const toggleGroup = (groupKey: string) =>
    setOpenGroupKey(effectiveOpenGroup === groupKey ? '' : groupKey);

  const account: AccountSummary = {
    fullName: administrator.fullName,
    email: administrator.email,
    initials: administrator.initials,
    roleLabel: administrator.roleLabel,
    signInLine: administrator.signInLine,
  };
  const sidebarAccount = {
    fullName: administrator.fullName,
    initials: administrator.initials,
    roleLabel: administrator.roleLabel,
  };

  const notificationCenter = (
    <NotificationCenter
      notifications={notifications.items}
      onMarkAllRead={notifications.markAllRead}
      onOpen={notifications.markRead}
      viewAllHref="/notifications"
    />
  );

  const headerUtilities = (
    <>
      <SearchTrigger onOpen={() => setIsSearchOpen(true)} />
      {notificationCenter}
      <AccountMenu
        account={account}
        onSignOut={onSignOut}
        onShowShortcuts={() => setIsShortcutsOpen(true)}
        helpCentreUrl={adminHelpCentreUrl}
      />
    </>
  );

  return (
    <ShellProvider value={{ headerUtilities, setBackLink }}>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-surface px-4 py-2 text-body-md font-medium text-link shadow-elevation-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh bg-canvas">
        <div className="hidden md:block">
          <Sidebar
            sections={sections}
            active={active}
            openGroupKey={effectiveOpenGroup}
            onToggleGroup={toggleGroup}
            isCollapsed={isCollapsed}
            onToggleCollapsed={() => setSidebarMode(isCollapsed ? 'expanded' : 'collapsed')}
            account={sidebarAccount}
            onSignOut={onSignOut}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar
            backLink={backLink}
            isMenuOpen={isMobileNavOpen}
            onOpenMenu={() => setMobileNavOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
            notifications={isTabletUp ? null : notificationCenter}
            account={
              isTabletUp ? null : (
                <AccountMenu
                  account={account}
                  onSignOut={onSignOut}
                  helpCentreUrl={adminHelpCentreUrl}
                />
              )
            }
          />
          <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
        </div>
      </div>

      <MobileNavDrawer
        open={isMobileNavOpen && !isTabletUp}
        onClose={() => setMobileNavOpen(false)}
        sections={sections}
        active={active}
        openGroupKey={effectiveOpenGroup}
        onToggleGroup={toggleGroup}
        account={sidebarAccount}
        onSignOut={onSignOut}
      />
      <SearchDialog
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        destinations={destinations}
      />
      <KeyboardShortcutsDialog open={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </ShellProvider>
  );
}
