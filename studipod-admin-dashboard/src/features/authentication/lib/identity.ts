import { format, isToday, isYesterday } from 'date-fns';

import { initialsFromName } from '@/components/ui/avatar';

import type { Administrator, Session } from '../api/contract';

const ROLE_LABELS: Readonly<Record<string, string>> = {
  'super-admin': 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
  'support-agent': 'Support Agent',
  'finance-manager': 'Finance Manager',
};

/** Human label for a role key ("support-agent" → "Support Agent"). */
export function formatRoleLabel(role: string): string {
  const known = ROLE_LABELS[role.toLowerCase()];
  if (known) return known;
  return role
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export type AdministratorIdentity = {
  fullName: string;
  firstName: string;
  email: string;
  initials: string;
  /** Label of the first role, for example "Super Admin"; null when the account has none. */
  roleLabel: string | null;
};

export function describeAdministrator(administrator: Administrator): AdministratorIdentity {
  const firstRole = administrator.roles[0];
  return {
    fullName: `${administrator.firstName} ${administrator.lastName}`.trim(),
    firstName: administrator.firstName,
    email: administrator.email,
    initials: initialsFromName(administrator.firstName, administrator.lastName),
    roleLabel: firstRole ? formatRoleLabel(firstRole) : null,
  };
}

/** "Signed in today at 08:14 · Lagos, NG" for the account menu footer. */
export function describeSignIn(signIn: NonNullable<Session['currentSignIn']>): string {
  const at = new Date(signIn.at);
  const day = isToday(at) ? 'today' : isYesterday(at) ? 'yesterday' : `on ${format(at, 'd MMM')}`;
  const where = signIn.location ? ` · ${signIn.location}` : '';
  return `Signed in ${day} at ${format(at, 'HH:mm')}${where}`;
}

/** Time-of-day greeting used on the dashboard header. */
export function greetingFor(date: Date, firstName: string): string {
  const hour = date.getHours();
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  return `Good ${part}, ${firstName}`;
}
