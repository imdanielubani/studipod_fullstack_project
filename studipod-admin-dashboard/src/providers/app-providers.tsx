'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { Toaster } from '@/components/ui/toast';
import { ApiError } from '@/services/http/api-error';

const MAX_QUERY_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
  // Client errors (4xx) never succeed on retry; network and 5xx errors may.
  if (error instanceof ApiError && !error.isRetryable) return false;
  return failureCount < MAX_QUERY_RETRIES;
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  // One client per browser session; never shared between server requests.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
