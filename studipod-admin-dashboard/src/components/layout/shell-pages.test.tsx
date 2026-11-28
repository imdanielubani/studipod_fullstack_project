import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContentLoading } from '@/components/shared/content-state';
import { Button } from '@/components/ui/button';
import {
  AccountDestinationPage,
  DashboardOverviewPage,
  NavDestinationPage,
} from '@/features/authentication/components/console-pages';
import { ConsoleShell } from '@/features/authentication/components/console-shell';
import { useSessionStore } from '@/features/authentication/session/session-store';

import { AppShell, type ShellAdministrator } from './app-shell';
import { PageHeader } from './page-header';
import { useShellStore } from './shell-store';

const replace = vi.fn();
let pathname = '/support';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace }),
}));

function mockMatchMedia(widthPx: number) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: widthPx >= Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function signInAs(permissions: string[]) {
  useSessionStore.getState().setSession({
    accessToken: 'token',
    accessTokenExpiresAt: new Date(Date.now() + 600_000).toISOString(),
    administrator: {
      id: 'adm_1',
      email: 'daniel.ubani@studipod.com',
      firstName: 'Daniel',
      lastName: 'Ubani',
      roles: ['super-admin'],
      permissions,
    },
    currentSignIn: null,
  });
}

beforeEach(() => {
  pathname = '/support';
  replace.mockReset();
  mockMatchMedia(1440);
  useShellStore.setState({ sidebarMode: 'auto', openGroupKey: null, isMobileNavOpen: false });
});

describe('console destination pages', () => {
  it('explains that a permitted page is not built yet', () => {
    signInAs(['tickets.view']);
    render(
      <NavDestinationPage
        title="Tickets"
        groupLabel="Support"
        groupHref="/support"
        permission="tickets.view"
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Tickets' })).toBeInTheDocument();
    expect(screen.getByText('Tickets isn’t available yet')).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Support',
      }),
    ).toHaveAttribute('href', '/support');
  });

  it('names the missing permission when access is not allowed', () => {
    signInAs(['dashboard.view']);
    render(
      <NavDestinationPage
        title="Audit log"
        groupLabel="Admin & Security"
        groupHref="/administrators"
        permission="audit.view"
      />,
    );
    expect(screen.getByText('You don’t have access to this page')).toBeInTheDocument();
    expect(screen.getByText(/audit\.view permission/)).toBeInTheDocument();
  });

  it('greets the administrator on the dashboard', () => {
    signInAs(['dashboard.view']);
    render(<DashboardOverviewPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Daniel$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('The dashboard overview isn’t available yet')).toBeInTheDocument();
  });

  it('opens account pages to every administrator', () => {
    signInAs([]);
    render(<AccountDestinationPage title="My profile" />);
    expect(screen.getByText('My profile isn’t available yet')).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('shows a badge, stats and actions', () => {
    render(
      <PageHeader
        title="All users"
        description="Everyone on StudiPod."
        badge={<span>Live data</span>}
        stats={[
          { label: 'Active', value: '9,812' },
          { label: 'Suspended', value: '41' },
        ]}
        actions={<Button variant="secondary">Export CSV</Button>}
      />,
    );
    expect(screen.getByText('Live data')).toBeInTheDocument();
    expect(screen.getByText('9,812')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });
});

describe('content states', () => {
  it('announces loading', () => {
    render(<ContentLoading title="Loading dashboard…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard…');
  });
});

describe('ConsoleShell', () => {
  it('wraps pages in the shell for the signed-in administrator', () => {
    signInAs(['*']);
    render(
      <ConsoleShell>
        <p>Page body</p>
      </ConsoleShell>,
    );
    expect(screen.getByText('Page body')).toBeInTheDocument();
    expect(screen.getAllByText('Daniel Ubani').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(replace).toHaveBeenCalledWith('/sign-in');
  });

  it('renders nothing without a session', () => {
    useSessionStore.getState().clearSession();
    const { container } = render(
      <ConsoleShell>
        <p>Page body</p>
      </ConsoleShell>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('mobile shell', () => {
  const administrator: ShellAdministrator = {
    fullName: 'Daniel Ubani',
    email: 'daniel.ubani@studipod.com',
    initials: 'DU',
    roleLabel: 'Super Admin',
    signInLine: null,
    permissions: ['*'],
  };

  it('opens the drawer from the top bar and closes it when a page is chosen', () => {
    mockMatchMedia(390);
    render(
      <AppShell administrator={administrator} onSignOut={vi.fn()}>
        <p>Body</p>
      </AppShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(useShellStore.getState().isMobileNavOpen).toBe(true);

    const drawer = screen.getByRole('dialog', { name: 'Navigation' });
    fireEvent.click(within(drawer).getByRole('link', { name: 'Tickets' }));
    expect(useShellStore.getState().isMobileNavOpen).toBe(false);
  });

  it('shows a back link instead of the menu on detail pages', () => {
    mockMatchMedia(390);
    render(
      <AppShell administrator={administrator} onSignOut={vi.fn()}>
        <PageHeader
          title="Pending reports"
          back={{ href: '/dashboard', label: 'Pending reports' }}
        />
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('button', { name: 'Open navigation' })).not.toBeInTheDocument();
  });
});
