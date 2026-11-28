'use client';

import { SectionPage } from '@/components/layout/section-page';
import { hasPermission } from '@/config/navigation';

import { greetingFor } from '../lib/identity';
import { useSessionStore } from '../session/session-store';

/** Stable empty list: a new array per render would make the store selector loop. */
const NO_PERMISSIONS: ReadonlyArray<string> = [];

type NavDestinationProps = {
  title: string;
  groupLabel: string;
  groupHref: string;
  permission: string;
};

/** A sidebar destination, checked against the signed-in administrator's permissions. */
export function NavDestinationPage({
  title,
  groupLabel,
  groupHref,
  permission,
}: NavDestinationProps) {
  const permissions = useSessionStore(
    (state) => state.administrator?.permissions ?? NO_PERMISSIONS,
  );
  return (
    <SectionPage
      title={title}
      breadcrumb={[{ label: groupLabel, href: groupHref }, { label: title }]}
      isAllowed={hasPermission(permissions, permission)}
      permission={permission}
    />
  );
}

/** Personal pages (My profile, Security): open to every administrator. */
export function AccountDestinationPage({ title }: { title: string }) {
  return (
    <SectionPage
      title={title}
      breadcrumb={[{ label: 'Account', href: '/profile' }, { label: title }]}
      isAllowed
    />
  );
}

/** Dashboard overview header with the time-of-day greeting. */
export function DashboardOverviewPage() {
  const firstName = useSessionStore((state) => state.administrator?.firstName ?? '');
  const permissions = useSessionStore(
    (state) => state.administrator?.permissions ?? NO_PERMISSIONS,
  );
  return (
    <SectionPage
      title={greetingFor(new Date(), firstName)}
      featureName="The dashboard overview"
      description="What’s happening on StudiPod right now."
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Overview' }]}
      isAllowed={hasPermission(permissions, 'dashboard.view')}
      permission="dashboard.view"
    />
  );
}
