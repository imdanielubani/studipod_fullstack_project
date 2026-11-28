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
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function signInAsAdmin(page: Page) {
  await submitCredentials(page, MOCK.admin, MOCK.password);
  await expect(page).toHaveURL(/\/sign-in\/verify$/);
  await page.getByLabel('Digit 1 of 6').pressSequentially(MOCK.validCode);
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}
