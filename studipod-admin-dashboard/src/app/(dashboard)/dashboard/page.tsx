import type { Metadata } from 'next';

import { SignedInSummary } from '@/features/authentication/components/signed-in-summary';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * Landing page after sign-in. The dashboard overview (KPIs, activity, platform
 * health) is built in its own feature; this page confirms the session for now.
 */
export default function DashboardPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-canvas px-5 py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-overline font-semibold text-link uppercase">Admin console</p>
          <h1 className="text-h1 font-bold text-heading">Dashboard</h1>
        </div>
        <SignedInSummary />
      </div>
    </main>
  );
}
