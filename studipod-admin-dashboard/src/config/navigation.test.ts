import { describe, expect, it } from 'vitest';

import {
  catchAllAddresses,
  filterNavigation,
  findNavLocation,
  findNavPageByHref,
  hasPermission,
  NAVIGATION,
} from './navigation';

const allPages = NAVIGATION.flatMap((section) => section.groups.flatMap((group) => group.pages));

describe('navigation config', () => {
  it('matches the designed structure: 4 sections, 13 groups, 37 pages', () => {
    expect(NAVIGATION.map((section) => section.label)).toEqual([
      'Operate',
      'Trust & safety',
      'Business',
      'Platform',
    ]);
    expect(NAVIGATION.flatMap((section) => section.groups)).toHaveLength(13);
    expect(allPages).toHaveLength(37);
  });

  it('gives every page a unique key and address', () => {
    expect(new Set(allPages.map((page) => page.key)).size).toBe(allPages.length);
    expect(new Set(allPages.map((page) => page.href)).size).toBe(allPages.length);
    allPages.forEach((page) => expect(page.href).toMatch(/^\/[a-z0-9/-]+$/));
  });
});

describe('catchAllAddresses', () => {
  it('lists every page without a dedicated screen plus the account pages', () => {
    const addresses = catchAllAddresses();
    expect(addresses).toHaveLength(38);
    expect(addresses).not.toContain('/dashboard');
    expect(addresses).toContain('/users/verification');
    expect(addresses).toContain('/profile/security');
  });
});

describe('hasPermission', () => {
  it('accepts an exact key or the wildcard', () => {
    expect(hasPermission(['users.view'], 'users.view')).toBe(true);
    expect(hasPermission(['*'], 'billing.view')).toBe(true);
    expect(hasPermission(['users.view'], 'users.verify')).toBe(false);
    expect(hasPermission([], 'dashboard.view')).toBe(false);
  });
});

describe('filterNavigation', () => {
  it('keeps only permitted pages and drops empty groups and sections', () => {
    const visible = filterNavigation(['dashboard.view', 'tickets.view']);

    expect(visible.map((section) => section.key)).toEqual(['operate', 'trust-safety']);
    expect(visible[0]?.groups.map((group) => group.key)).toEqual(['dashboard']);
    expect(visible[0]?.groups[0]?.pages.map((page) => page.key)).toEqual(['overview']);
    expect(visible[1]?.groups[0]?.pages.map((page) => page.key)).toEqual(['tickets']);
  });

  it('shows everything for the wildcard and nothing without permissions', () => {
    expect(filterNavigation(['*'])).toHaveLength(4);
    expect(filterNavigation([])).toEqual([]);
  });

  it('does not change the source configuration', () => {
    filterNavigation([]);
    expect(NAVIGATION.flatMap((section) => section.groups)).toHaveLength(13);
  });
});

describe('findNavLocation', () => {
  it('prefers the longest matching page', () => {
    expect(findNavLocation('/users/verification')?.page.key).toBe('verification-queue');
    expect(findNavLocation('/users')?.page.key).toBe('all-users');
  });

  it('keeps a record page inside its list page', () => {
    const location = findNavLocation('/users/0193-abc');
    expect(location?.group.key).toBe('users');
    expect(location?.page.key).toBe('all-users');
  });

  it('does not treat a shared prefix as a match', () => {
    expect(findNavLocation('/usersettings')).toBeNull();
  });

  it('finds exact pages only with findNavPageByHref', () => {
    expect(findNavPageByHref('/billing/plans')?.page.label).toBe('Plans & pricing');
    expect(findNavPageByHref('/billing/plans/annual')).toBeNull();
  });
});
