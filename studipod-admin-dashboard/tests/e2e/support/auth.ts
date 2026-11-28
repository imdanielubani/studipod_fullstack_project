import { expect, type Page } from '@playwright/test';

/** Values understood by the development auth mock (docs/api/admin-authentication-contract.md). */
export const MOCK = {
  password: 'correct-horse-battery',
  validCode: '123456',
  admin: 'daniel.ubani@studipod.com',
  locked: 'locked@studipod.com',
  noRole: 'no-role@studipod.com',
  candidate: 'chiamaka.eze@gmail.com',
  offline: 'offline@studipod.com',
  resetTokens: { valid: 'valid-reset-token', expired: 'expired-reset-token' },
} as const;

export async function submitCredentials(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  const submit = page.getByRole('button', { name: 'Sign in' });
  // Text typed before React hydrates, or lost to a development-server refresh, never
  // reaches the form; retry until the form has accepted both values.
  await expect(async () => {
    await page.getByLabel('Work email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await expect(submit).toBeEnabled({ timeout: 2_000 });
  }).toPass({ timeout: 45_000 });
  await submit.click();
}

export async function signInAsAdmin(page: Page) {
  await submitCredentials(page, MOCK.admin, MOCK.password);
  await expect(page).toHaveURL(/\/sign-in\/verify$/);
  await page.getByLabel('Digit 1 of 6').pressSequentially(MOCK.validCode);
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1, name: DASHBOARD_GREETING })).toBeVisible();
}

/** The dashboard title greets the administrator by time of day. */
export const DASHBOARD_GREETING = /^Good (morning|afternoon|evening), Daniel$/;
