import {
  Bell,
  BookOpen,
  Calendar,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Flag,
  MessagesSquare,
  ShieldCheck,
  Shuffle,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';

/**
 * Console navigation (Layout Patterns · Sidebar).
 *
 * Every page names the permission needed to see it, using the keys from the
 * Roles & Permissions matrix. Hiding links is presentation only: the backend
 * authorises every request. Groups with no visible pages are hidden.
 */

export type NavPage = {
  key: string;
  label: string;
  href: string;
  /** Permission key required to see the page (for example "users.view"). */
  permission: string;
  /**
   * True when app/(dashboard)/<href>/page.tsx exists. Set it when a screen is
   * built, so the catch-all route stops generating this address.
   */
  hasDedicatedPage?: true;
};

export type NavGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  pages: ReadonlyArray<NavPage>;
};

export type NavSection = {
  key: string;
  label: string;
  groups: ReadonlyArray<NavGroup>;
};

export const NAVIGATION: ReadonlyArray<NavSection> = [
  {
    key: 'operate',
    label: 'Operate',
    groups: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        pages: [
          {
            key: 'overview',
            label: 'Overview',
            href: '/dashboard',
            permission: 'dashboard.view',
            hasDedicatedPage: true,
          },
          {
            key: 'analytics',
            label: 'Analytics',
            href: '/analytics',
            permission: 'analytics.view',
          },
        ],
      },
      {
        key: 'users',
        label: 'Users',
        icon: Users,
        pages: [
          { key: 'all-users', label: 'All users', href: '/users', permission: 'users.view' },
          {
            key: 'verification-queue',
            label: 'Verification queue',
            href: '/users/verification',
            permission: 'users.verify',
          },
        ],
      },
      {
        key: 'examinations',
        label: 'Examinations',
        icon: GraduationCap,
        pages: [
          {
            key: 'exam-catalogue',
            label: 'Exam catalogue',
            href: '/examinations',
            permission: 'exams.view',
          },
          { key: 'taxonomy', label: 'Taxonomy', href: '/subjects', permission: 'exams.view' },
          {
            key: 'import-export',
            label: 'Import & export',
            href: '/examinations/import-export',
            permission: 'exams.import',
          },
        ],
      },
      {
        key: 'matching',
        label: 'Matching',
        icon: Shuffle,
        pages: [
          {
            key: 'match-configuration',
            label: 'Configuration',
            href: '/matching',
            permission: 'matching.view',
          },
          {
            key: 'match-activity',
            label: 'Activity',
            href: '/matching/activity',
            permission: 'matching.view',
          },
        ],
      },
      {
        key: 'bookings',
        label: 'Bookings',
        icon: Calendar,
        pages: [
          { key: 'sessions', label: 'Sessions', href: '/bookings', permission: 'bookings.view' },
          {
            key: 'booking-problems',
            label: 'Problems',
            href: '/bookings/problems',
            permission: 'bookings.view',
          },
          {
            key: 'booking-settings',
            label: 'Booking settings',
            href: '/scheduling',
            permission: 'bookings.view',
          },
        ],
      },
      {
        key: 'community',
        label: 'Community',
        icon: MessagesSquare,
        pages: [{ key: 'groups', label: 'Groups', href: '/groups', permission: 'groups.view' }],
      },
    ],
  },
  {
    key: 'trust-safety',
    label: 'Trust & safety',
    groups: [
      {
        key: 'moderation',
        label: 'Moderation',
        icon: Flag,
        pages: [
          {
            key: 'moderation-queue',
            label: 'Queue',
            href: '/moderation',
            permission: 'moderation.view',
          },
          {
            key: 'blocks',
            label: 'Blocks',
            href: '/moderation/blocks',
            permission: 'moderation.view',
          },
          {
            key: 'moderation-history',
            label: 'History',
            href: '/moderation/history',
            permission: 'moderation.view',
          },
        ],
      },
      {
        key: 'support',
        label: 'Support',
        icon: LifeBuoy,
        pages: [
          { key: 'tickets', label: 'Tickets', href: '/support', permission: 'tickets.view' },
          {
            key: 'support-agents',
            label: 'Support agents',
            href: '/support/agents',
            permission: 'tickets.assign',
          },
          {
            key: 'help-centre',
            label: 'Help centre',
            href: '/support/help-centre',
            permission: 'helpcentre.manage',
          },
        ],
      },
      {
        key: 'content',
        label: 'Content',
        icon: BookOpen,
        pages: [
          {
            key: 'resource-library',
            label: 'Resource library',
            href: '/resources',
            permission: 'content.view',
          },
          {
            key: 'review-queue',
            label: 'Review queue',
            href: '/resources/review',
            permission: 'content.approve',
          },
        ],
      },
    ],
  },
  {
    key: 'business',
    label: 'Business',
    groups: [
      {
        key: 'billing',
        label: 'Billing',
        icon: CreditCard,
        pages: [
          {
            key: 'billing-overview',
            label: 'Overview',
            href: '/billing',
            permission: 'billing.view',
          },
          {
            key: 'plans-pricing',
            label: 'Plans & pricing',
            href: '/billing/plans',
            permission: 'billing.view',
          },
          {
            key: 'subscriptions',
            label: 'Subscriptions',
            href: '/subscriptions',
            permission: 'billing.view',
          },
          {
            key: 'transactions',
            label: 'Transactions',
            href: '/payments',
            permission: 'billing.view',
          },
          {
            key: 'entitlements',
            label: 'Entitlements',
            href: '/billing/entitlements',
            permission: 'billing.view',
          },
          {
            key: 'billing-settings',
            label: 'Billing settings',
            href: '/billing/settings',
            permission: 'plans.manage',
          },
        ],
      },
      {
        key: 'video',
        label: 'Video',
        icon: Video,
        pages: [
          {
            key: 'video-rooms',
            label: 'Video rooms',
            href: '/video-sessions',
            permission: 'video.view',
          },
          {
            key: 'usage-limits',
            label: 'Usage & limits',
            href: '/video-sessions/usage',
            permission: 'video.view',
          },
          {
            key: 'failure-logs',
            label: 'Failure logs',
            href: '/video-sessions/failures',
            permission: 'video.view',
          },
        ],
      },
      {
        key: 'notifications',
        label: 'Notifications',
        icon: Bell,
        pages: [
          {
            key: 'templates',
            label: 'Templates',
            href: '/notifications',
            permission: 'notifications.view',
          },
          {
            key: 'delivery-log',
            label: 'Delivery log',
            href: '/notifications/delivery-log',
            permission: 'notifications.view',
          },
          {
            key: 'reminder-rules',
            label: 'Reminder rules',
            href: '/notifications/reminders',
            permission: 'notifications.view',
          },
        ],
      },
    ],
  },
  {
    key: 'platform',
    label: 'Platform',
    groups: [
      {
        key: 'admin-security',
        label: 'Admin & Security',
        icon: ShieldCheck,
        pages: [
          {
            key: 'admin-users',
            label: 'Admin users',
            href: '/administrators',
            permission: 'admins.view',
          },
          {
            key: 'roles-permissions',
            label: 'Roles & permissions',
            href: '/roles-permissions',
            permission: 'admins.view',
          },
          { key: 'audit-log', label: 'Audit log', href: '/audit-logs', permission: 'audit.view' },
          { key: 'security', label: 'Security', href: '/security', permission: 'security.view' },
        ],
      },
    ],
  },
];

/** Personal pages reached from the account menu. Every administrator can open them. */
export const ACCOUNT_PAGES = {
  profile: { label: 'My profile', href: '/profile' },
  security: { label: 'Security', href: '/profile/security' },
} as const;

/**
 * Addresses served by the catch-all route: every navigation and account page that
 * does not have its own screen yet. Any other address is a 404.
 */
export function catchAllAddresses(sections: ReadonlyArray<NavSection> = NAVIGATION): string[] {
  const pages = sections.flatMap((section) =>
    section.groups.flatMap((group) => group.pages.filter((page) => !page.hasDedicatedPage)),
  );
  return [
    ...pages.map((page) => page.href),
    ...Object.values(ACCOUNT_PAGES).map((page) => page.href),
  ];
}

/** Grants access when the administrator holds the key or the wildcard "*". */
export function hasPermission(permissions: ReadonlyArray<string>, key: string): boolean {
  return permissions.includes('*') || permissions.includes(key);
}

/** Navigation reduced to what the administrator may see; empty groups and sections drop out. */
export function filterNavigation(
  permissions: ReadonlyArray<string>,
  sections: ReadonlyArray<NavSection> = NAVIGATION,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      groups: section.groups
        .map((group) => ({
          ...group,
          pages: group.pages.filter((page) => hasPermission(permissions, page.permission)),
        }))
        .filter((group) => group.pages.length > 0),
    }))
    .filter((section) => section.groups.length > 0);
}

export type NavLocation = { section: NavSection; group: NavGroup; page: NavPage };

function matchesPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The navigation entry for a URL. The longest matching page wins, so
 * "/users/verification" selects "Verification queue", not "All users".
 */
export function findNavLocation(
  pathname: string,
  sections: ReadonlyArray<NavSection> = NAVIGATION,
): NavLocation | null {
  let best: NavLocation | null = null;
  for (const section of sections) {
    for (const group of section.groups) {
      for (const page of group.pages) {
        if (!matchesPath(pathname, page.href)) continue;
        if (!best || page.href.length > best.page.href.length) best = { section, group, page };
      }
    }
  }
  return best;
}

/** The navigation page whose address is exactly `pathname`. */
export function findNavPageByHref(
  pathname: string,
  sections: ReadonlyArray<NavSection> = NAVIGATION,
): NavLocation | null {
  const location = findNavLocation(pathname, sections);
  return location && location.page.href === pathname ? location : null;
}
