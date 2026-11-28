'use client';

import { SerwistProvider } from '@serwist/next/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '@/lib/api/query-client';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Client-side providers shared by every route.
 *
 * The service worker is registered in production builds only. Pages are never added
 * to its cache on navigation, and the app does not reload itself when the connection
 * returns, so unsaved input is not lost (docs/pwa/pwa-architecture.md).
 */
export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(createQueryClient);

  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={!isProduction}
      cacheOnNavigation={false}
      reloadOnOnline={false}
      options={{ scope: '/', type: 'classic' }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
        {isProduction ? null : <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </SerwistProvider>
  );
}
