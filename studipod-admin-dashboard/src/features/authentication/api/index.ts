import { getPublicEnv } from '@/config/env';
import { createHttpClient } from '@/services/http/http-client';

import type { AuthApi } from './contract';
import { createHttpAuthApi } from './http-auth-api';

export * from './contract';

let authApiPromise: Promise<AuthApi> | null = null;

async function createAuthApi(): Promise<AuthApi> {
  // NODE_ENV is inlined at build time, so production bundles drop this branch
  // and never include the mock module.
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_AUTH_MOCK === 'true') {
    const { createMockAuthApi } = await import('./mock-auth-api');
    return createMockAuthApi();
  }
  return createHttpAuthApi(createHttpClient(getPublicEnv().NEXT_PUBLIC_API_URL));
}

/** The authentication API for this environment (created once per page load). */
export function loadAuthApi(): Promise<AuthApi> {
  authApiPromise ??= createAuthApi().catch((error: unknown) => {
    authApiPromise = null;
    throw error;
  });
  return authApiPromise;
}
