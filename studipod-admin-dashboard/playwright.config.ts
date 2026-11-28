import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

/**
 * End-to-end configuration. Specs live in tests/e2e.
 *
 * Locally and in CI the specs run against the development server with the
 * in-memory authentication mock (NEXT_PUBLIC_AUTH_MOCK=true), because the
 * backend authentication module does not exist yet. Production builds never
 * include the mock. Set PLAYWRIGHT_BASE_URL to test an already running server.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // The dev server compiles each route on first request; limit concurrent browsers.
  workers: isCI ? 1 : 2,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      grepInvert: /@mobile/,
    },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `pnpm dev --port ${PORT}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !isCI,
        timeout: 180_000,
        env: {
          NEXT_PUBLIC_APP_URL: baseURL,
          NEXT_PUBLIC_API_URL: 'http://localhost:3000/api/v1',
          NEXT_PUBLIC_WS_URL: 'ws://localhost:3001',
          NEXT_PUBLIC_AUTH_MOCK: 'true',
          NEXT_TELEMETRY_DISABLED: '1',
        },
      },
});
