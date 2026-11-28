import type { ReactNode } from 'react';

import { ConsoleShell } from '@/features/authentication/components/console-shell';
import { SessionGate } from '@/features/authentication/components/session-gate';

/** Every console page requires a confirmed administrator session and shares the app shell. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGate>
      <ConsoleShell>{children}</ConsoleShell>
    </SessionGate>
  );
}
