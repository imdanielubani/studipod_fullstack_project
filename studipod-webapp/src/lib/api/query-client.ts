import { QueryClient } from '@tanstack/react-query';

const ONE_MINUTE_MS = 60_000;
const MAX_QUERY_RETRIES = 2;

/** True for errors carrying a 4xx HTTP status: retrying cannot change the outcome. */
function isClientError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  const { status } = error;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * Shared TanStack Query defaults. The cache is in memory only and is never persisted,
 * so candidate data does not outlive the tab. Queries retry network and server errors
 * only; 4xx responses (401, 403, 404, 422...) fail immediately.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ONE_MINUTE_MS,
        retry: (failureCount, error) => failureCount < MAX_QUERY_RETRIES && !isClientError(error),
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Mutations are never retried automatically: bookings and payments must not repeat.
        retry: false,
      },
    },
  });
}
