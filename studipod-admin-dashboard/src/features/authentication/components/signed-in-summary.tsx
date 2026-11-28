'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

import { signOut } from '../session/session-manager';
import { useSessionStore } from '../session/session-store';

/** Who is signed in, with a sign-out action. Used until the dashboard shell exists. */
export function SignedInSummary() {
  const router = useRouter();
  const administrator = useSessionStore((state) => state.administrator);
  if (!administrator) return null;

  function handleSignOut() {
    void signOut('signed-out');
    router.replace('/sign-in');
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="min-w-0">
        <p className="text-body-md font-medium text-fg">
          {administrator.firstName} {administrator.lastName}
        </p>
        <p className="text-caption break-all text-fg-secondary">{administrator.email}</p>
      </div>
      <Button variant="secondary" onClick={handleSignOut}>
        <LogOut aria-hidden className="size-4" />
        Sign out
      </Button>
    </div>
  );
}
