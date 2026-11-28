import type { Metadata } from 'next';

import { AccessDeniedView } from '@/features/authentication/components/access-denied-view';

export const metadata: Metadata = { title: 'Access denied' };

export default function AccessDeniedPage() {
  return <AccessDeniedView />;
}
