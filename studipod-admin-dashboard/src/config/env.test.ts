import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPublicEnv, getPublicLinks } from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getPublicEnv', () => {
  it('returns validated public URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://stuadminapp.studipod.com');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.studipod.com/api/v1');
    vi.stubEnv('NEXT_PUBLIC_WS_URL', 'wss://ws.studipod.com');
    expect(getPublicEnv().NEXT_PUBLIC_API_URL).toBe('https://api.studipod.com/api/v1');
  });

  it('names the invalid keys without exposing values', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://stuadminapp.studipod.com');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'not a url');
    vi.stubEnv('NEXT_PUBLIC_WS_URL', 'https://ws.studipod.com');
    expect(() => getPublicEnv()).toThrow(
      'Invalid public environment configuration: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL',
    );
  });
});

describe('getPublicLinks', () => {
  it('returns configured links and hides missing or invalid ones', () => {
    vi.stubEnv('NEXT_PUBLIC_WEBAPP_URL', 'https://app.studipod.com');
    vi.stubEnv('NEXT_PUBLIC_ADMIN_SUPPORT_EMAIL', 'not-an-email');
    vi.stubEnv('NEXT_PUBLIC_ADMIN_HELP_URL', '');
    expect(getPublicLinks()).toEqual({
      webAppUrl: 'https://app.studipod.com',
      adminSupportEmail: null,
      adminHelpCentreUrl: null,
    });
  });

  it('rejects non-web link schemes', () => {
    vi.stubEnv('NEXT_PUBLIC_WEBAPP_URL', 'javascript:alert(1)');
    expect(getPublicLinks().webAppUrl).toBeNull();
  });
});
