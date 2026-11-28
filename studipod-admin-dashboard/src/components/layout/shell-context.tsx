'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';

export type BackLink = { href: string; label: string };

type ShellContextValue = {
  /** Search, notifications and account controls shown in the desktop page header. */
  headerUtilities: ReactNode;
  /** Registers a back link; on phones the top bar then shows it instead of the menu. */
  setBackLink: (link: BackLink | null) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({
  value,
  children,
}: {
  value: ShellContextValue;
  children: ReactNode;
}) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

/** Shell services for page-level components. Null outside the console shell. */
export function useShell(): ShellContextValue | null {
  return useContext(ShellContext);
}

/** Shows a back link in the mobile top bar while the calling page is mounted. */
export function useBackLink(link: BackLink | null): void {
  const shell = useShell();
  const setBackLink = shell?.setBackLink;
  const href = link?.href ?? null;
  const label = link?.label ?? null;

  useEffect(() => {
    if (!setBackLink) return undefined;
    setBackLink(href && label ? { href, label } : null);
    return () => setBackLink(null);
  }, [setBackLink, href, label]);
}
