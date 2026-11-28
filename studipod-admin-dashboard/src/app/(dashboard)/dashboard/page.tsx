import type { Metadata } from 'next';

import { DashboardOverviewPage } from '@/features/authentication/components/console-pages';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <DashboardOverviewPage />;
}
