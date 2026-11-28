import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

/**
 * End-to-end configuration. Specs live in tests/e2e and are added together with
 * the features they cover. Set PLAYWRIGHT_BASE_URL to test a deployed environment
 * instead of starting a local production server.
 *
 * The standalone production server is used (as in Docker, not `next dev`) because the
 * service worker is only built and registered in production builds. PORT sets the port.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Mobile-first product: every journey also runs at phone size.
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start:standalone`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !isCI,
        timeout: 240_000,
      },
});
