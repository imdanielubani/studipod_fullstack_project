import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ACCOUNT_PAGES, findNavPageByHref } from '@/config/navigation';
import {
  AccountDestinationPage,
  NavDestinationPage,
} from '@/features/authentication/components/console-pages';

/**
 * Every sidebar destination and account page that has no dedicated screen yet.
 * Dedicated pages (for example app/(dashboard)/users/page.tsx) take precedence
 * over this route automatically. Unknown addresses are a 404.
 */

type Destination =
  | { kind: 'nav'; title: string; groupLabel: string; groupHref: string; permission: string }
  | { kind: 'account'; title: string };

function resolve(slug: ReadonlyArray<string>): Destination | null {
  const pathname = `/${slug.join('/')}`;
  const account = Object.values(ACCOUNT_PAGES).find((page) => page.href === pathname);
  if (account) return { kind: 'account', title: account.label };

  const location = findNavPageByHref(pathname);
  if (!location) return null;
  return {
    kind: 'nav',
    title: location.page.label,
    groupLabel: location.group.label,
    groupHref: location.group.pages[0]?.href ?? location.page.href,
    permission: location.page.permission,
  };
}

export async function generateMetadata({ params }: PageProps<'/[...slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const destination = resolve(slug);
  return { title: destination?.title ?? 'Page not found' };
}

export default async function ConsoleDestinationPage({ params }: PageProps<'/[...slug]'>) {
  const { slug } = await params;
  const destination = resolve(slug);
  if (!destination) notFound();

  if (destination.kind === 'account') return <AccountDestinationPage title={destination.title} />;
  return (
    <NavDestinationPage
      title={destination.title}
      groupLabel={destination.groupLabel}
      groupHref={destination.groupHref}
      permission={destination.permission}
    />
  );
}
