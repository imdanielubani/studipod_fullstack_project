import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSearchDestinations, filterDestinations } from './search-command';
import { AppShell, type ShellAdministrator } from './app-shell';
import { PageHeader } from './page-header';
import { useShellStore } from './shell-store';
import { filterNavigation } from '@/config/navigation';

const push = vi.fn();
let pathname = '/users/verification';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, replace: vi.fn() }),
}));

function mockMatchMedia(widthPx: number) {
  vi.stubGlobal('matchMedia', (query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
    return {
      matches: widthPx >= min,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
  });
}

const administrator: ShellAdministrator = {
  fullName: 'Daniel Ubani',
  email: 'daniel.ubani@studipod.com',
  initials: 'DU',
  roleLabel: 'Super Admin',
  signInLine: 'Signed in today at 08:14 · Lagos, NG',
  permissions: ['dashboard.view', 'users.view', 'users.verify', 'tickets.view'],
};

function renderShell(onSignOut = vi.fn()) {
  return render(
    <AppShell administrator={administrator} onSignOut={onSignOut}>
      <PageHeader
        title="Verification queue"
        breadcrumb={[{ label: 'Users', href: '/users' }, { label: 'Verification queue' }]}
      />
    </AppShell>,
  );
}

describe('search destinations', () => {
  const destinations = buildSearchDestinations(filterNavigation(['*']));

  it('includes every permitted page and the account pages', () => {
    expect(destinations).toHaveLength(39);
    expect(destinations.at(-1)).toMatchObject({ label: 'Security', context: 'Account' });
  });

  it('matches on page or group and ranks pages that start with the query first', () => {
    expect(filterDestinations(destinations, 'verif').map((item) => item.label)).toEqual([
      'Verification queue',
    ]);
    const billing = filterDestinations(destinations, 'billing').map((item) => item.label);
    expect(billing[0]).toBe('Billing settings');
    expect(billing).toContain('Transactions');
  });
});

describe('AppShell', () => {
  beforeEach(() => {
    pathname = '/users/verification';
    push.mockReset();
    useShellStore.setState({ sidebarMode: 'auto', openGroupKey: null, isMobileNavOpen: false });
    mockMatchMedia(1440);
  });

  it('shows only permitted groups and opens the current page’s group', () => {
    renderShell();
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]!;

    expect(within(nav).getByRole('button', { name: 'Users' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(nav).getByRole('link', { name: 'Verification queue' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('button', { name: 'Support' })).toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: 'Billing' })).not.toBeInTheDocument();
    expect(within(nav).queryByText('Business')).not.toBeInTheDocument();
  });

  it('keeps one group open at a time', () => {
    renderShell();
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]!;
    fireEvent.click(within(nav).getByRole('button', { name: 'Dashboard' }));

    expect(within(nav).getByRole('button', { name: 'Dashboard' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(nav).getByRole('button', { name: 'Users' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('collapses to the icon rail and opens a group flyout from the keyboard', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(useShellStore.getState().sidebarMode).toBe('collapsed');

    const usersButton = screen.getByRole('button', { name: 'Users' });
    // detail: 0 is how browsers report a keyboard-activated click.
    fireEvent.click(usersButton, { detail: 0 });
    const flyout = screen.getByRole('group', { name: 'Users' });
    expect(within(flyout).getByRole('link', { name: 'All users' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Users' })).not.toBeInTheDocument();
    expect(usersButton).toHaveFocus();
  });

  it('starts collapsed on tablets in auto mode', () => {
    mockMatchMedia(1024);
    renderShell();
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  it('puts search, notifications and the account menu in the page header', () => {
    const onSignOut = vi.fn();
    renderShell(onSignOut);
    // The page header holds the utilities (it is inside <main>, so not a banner landmark).
    const header = screen
      .getByRole('heading', { level: 1, name: 'Verification queue' })
      .closest('header')!;

    expect(within(header).getByRole('button', { name: /Search/ })).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: 'View notifications' })).toBeInTheDocument();

    fireEvent.click(within(header).getByRole('button', { name: 'Account menu for Daniel Ubani' }));
    const menu = screen.getByRole('menu', { name: 'Account' });
    const items = within(menu).getAllByRole('menuitem');
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();
    expect(within(menu).getByText('Signed in today at 08:14 · Lagos, NG')).toBeInTheDocument();
    expect(within(menu).queryByText('Help centre')).not.toBeInTheDocument();

    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('runs the global keyboard shortcuts', () => {
    renderShell();
    act(() => {
      fireEvent.keyDown(document, { key: 'g' });
      fireEvent.keyDown(document, { key: 'p' });
    });
    expect(push).toHaveBeenCalledWith('/profile');

    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    expect(screen.getByRole('combobox', { name: 'Search pages' })).toBeInTheDocument();
  });

  it('ignores single-key shortcuts while typing in a field', () => {
    renderShell();
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    const input = screen.getByRole('combobox', { name: 'Search pages' });
    fireEvent.keyDown(input, { key: 'g' });
    fireEvent.keyDown(input, { key: 'p' });
    expect(push).not.toHaveBeenCalled();
  });
});
