import type { ReactNode } from 'react';

import { SessionGate } from '@/features/authentication/components/session-gate';

/** Every console page requires a confirmed administrator session. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <SessionGate>{children}</SessionGate>;
}
