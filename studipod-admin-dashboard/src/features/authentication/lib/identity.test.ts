import { describe, expect, it } from 'vitest';

import { isSidebarCollapsed } from '@/components/layout/shell-store';

import { describeAdministrator, describeSignIn, formatRoleLabel, greetingFor } from './identity';

describe('formatRoleLabel', () => {
  it('uses the designed labels for known roles', () => {
    expect(formatRoleLabel('super-admin')).toBe('Super Admin');
    expect(formatRoleLabel('support-agent')).toBe('Support Agent');
  });

  it('title-cases unknown role keys', () => {
    expect(formatRoleLabel('content_reviewer')).toBe('Content Reviewer');
  });
});

describe('describeAdministrator', () => {
  it('derives the name, initials and first role label', () => {
    expect(
      describeAdministrator({
        id: 'adm_1',
        email: 'daniel.ubani@studipod.com',
        firstName: 'Daniel',
        lastName: 'Ubani',
        roles: ['super-admin', 'moderator'],
        permissions: ['*'],
      }),
    ).toEqual({
      fullName: 'Daniel Ubani',
      firstName: 'Daniel',
      email: 'daniel.ubani@studipod.com',
      initials: 'DU',
      roleLabel: 'Super Admin',
    });
  });

  it('has no role label for an account without roles', () => {
    const identity = describeAdministrator({
      id: 'adm_2',
      email: 'a@studipod.com',
      firstName: 'Ada',
      lastName: 'Obi',
      roles: [],
      permissions: [],
    });
    expect(identity.roleLabel).toBeNull();
  });
});

describe('describeSignIn', () => {
  it('describes a sign-in from today with its location', () => {
    const at = new Date();
    at.setHours(8, 14, 0, 0);
    expect(describeSignIn({ at: at.toISOString(), location: 'Lagos, NG' })).toBe(
      'Signed in today at 08:14 · Lagos, NG',
    );
  });

  it('omits an unknown location', () => {
    const at = new Date();
    at.setHours(9, 5, 0, 0);
    expect(describeSignIn({ at: at.toISOString(), location: null })).toBe(
      'Signed in today at 09:05',
    );
  });
});

describe('greetingFor', () => {
  it('follows the time of day', () => {
    expect(greetingFor(new Date(2026, 10, 28, 8), 'Daniel')).toBe('Good morning, Daniel');
    expect(greetingFor(new Date(2026, 10, 28, 13), 'Daniel')).toBe('Good afternoon, Daniel');
    expect(greetingFor(new Date(2026, 10, 28, 19), 'Daniel')).toBe('Good evening, Daniel');
  });
});

describe('isSidebarCollapsed', () => {
  it('follows the screen in auto mode and the preference otherwise', () => {
    expect(isSidebarCollapsed('auto', true)).toBe(false);
    expect(isSidebarCollapsed('auto', false)).toBe(true);
    expect(isSidebarCollapsed('collapsed', true)).toBe(true);
    expect(isSidebarCollapsed('expanded', false)).toBe(false);
  });
});
