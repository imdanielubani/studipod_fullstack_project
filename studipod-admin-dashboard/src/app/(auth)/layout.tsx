import type { ReactNode } from 'react';

import {
  AuthBrandPanel,
  AuthMobileFooter,
  AuthMobileHeader,
} from '@/features/authentication/components/auth-brand-panel';

/**
 * Shell for every signed-out screen: brand panel on the left from the `lg`
 * breakpoint, compact brand header and footer on smaller screens.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-surface">
      <AuthBrandPanel className="sticky top-0 hidden h-dvh min-h-[640px] w-[min(640px,44.5vw)] shrink-0 lg:block" />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <AuthMobileHeader className="lg:hidden" />
        <main
          id="main-content"
          className="flex flex-1 justify-center px-5 pt-8 pb-6 lg:items-center lg:px-10 lg:py-16"
        >
          {children}
        </main>
        <AuthMobileFooter className="lg:hidden" />
      </div>
    </div>
  );
}
