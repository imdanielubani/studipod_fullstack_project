import { expect, test } from '@playwright/test';

import { DASHBOARD_GREETING, MOCK, signInAsAdmin, submitCredentials } from './support/auth';

test.describe('sign-in journey', () => {
  test('signs in with password and emailed code, survives a reload, and signs out', async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await expect(page.getByRole('status').filter({ hasText: 'Your last sign-in' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: DASHBOARD_GREETING })).toBeVisible();
    await expect(page.getByText('Daniel Ubani').first()).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByText('You’ve been signed out')).toBeVisible();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('protects console pages from signed-out visitors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('can be completed with the keyboard alone', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByLabel('Work email')).toBeFocused();
    await page.keyboard.type(MOCK.admin);
    await page.keyboard.press('Tab');
    await page.keyboard.type(MOCK.password);
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/sign-in\/verify$/);
    await expect(page.getByLabel('Digit 1 of 6')).toBeFocused();
    await page.keyboard.type(MOCK.validCode);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('sign-in errors', () => {
  test('reports wrong credentials without saying which one was wrong', async ({ page }) => {
    await submitCredentials(page, 'someone@studipod.com', 'not-the-password');
    const alert = page.getByRole('alert').filter({ hasText: 'Incorrect email or password' });
    await expect(alert).toContainText('4 attempts left before this account is locked');
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('locks the account with a countdown and sends a reset link', async ({ page }) => {
    await submitCredentials(page, MOCK.locked, 'anything-at-all');
    await expect(page.getByText('Account temporarily locked')).toBeVisible();
    await expect(page.getByText(/Try again in 14:\d{2}/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();

    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByText(`Check ${MOCK.locked} for a link`)).toBeVisible();
  });

  test('shows a connection problem when the API cannot be reached', async ({ page }) => {
    await submitCredentials(page, MOCK.offline, MOCK.password);
    await expect(page.getByRole('alert').filter({ hasText: 'Connection problem' })).toBeVisible();
  });

  test('rejects a wrong emailed code and keeps the user on the code step', async ({ page }) => {
    await submitCredentials(page, MOCK.admin, MOCK.password);
    await page.getByLabel('Digit 1 of 6').pressSequentially('999999');
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(
      page.getByText(/That code is incorrect or expired\. \d attempts? left\./),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in\/verify$/);
  });
});

test.describe('access denied', () => {
  test('explains that candidate accounts cannot use the console', async ({ page }) => {
    await submitCredentials(page, MOCK.candidate, MOCK.password);
    await expect(page).toHaveURL(/\/access-denied$/);
    await expect(
      page.getByRole('heading', { name: 'This account can’t use the admin console' }),
    ).toBeVisible();
    await expect(page.getByText(`Signed in as ${MOCK.candidate}`)).toBeVisible();
    await expect(page.getByText(/This sign-in attempt was logged\./)).toBeVisible();
  });

  test('lets staff without a role request access', async ({ page }) => {
    await submitCredentials(page, MOCK.noRole, MOCK.password);
    await expect(page.getByRole('heading', { name: 'You don’t have an admin role' })).toBeVisible();
    await page.getByRole('button', { name: 'Request access' }).click();
    await expect(page.getByText('Access request sent')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request sent' })).toBeDisabled();
  });
});

test.describe('password reset', () => {
  test('requests a link for a work email only', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Work email').fill('daniel.ubani@gmail.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(
      page.getByText('Use your StudiPod work email (ending @studipod.com).'),
    ).toBeVisible();

    await page.getByLabel('Work email').fill(MOCK.admin);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Resend link in 0:\d{2}/ })).toBeDisabled();
  });

  test('sets a new password and returns to sign-in', async ({ page }) => {
    await page.goto(`/reset-password?token=${MOCK.resetTokens.valid}`);
    await page.getByLabel('New password', { exact: true }).fill('a calm river at dawn');
    await page.getByLabel('Confirm new password').fill('a calm river at dusk');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText('These passwords don’t match.')).toBeVisible();

    await page.getByLabel('Confirm new password').fill('a calm river at dawn');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByText('Password changed')).toBeVisible();
  });

  test('explains an expired reset link', async ({ page }) => {
    await page.goto(`/reset-password?token=${MOCK.resetTokens.expired}`);
    await expect(page.getByRole('heading', { name: 'This link has expired' })).toBeVisible();
    await page.getByRole('button', { name: 'Send a new link' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});

test.describe('session timeout', () => {
  test('warns before signing out after 24 hours of inactivity', async ({ page }) => {
    await page.clock.install();
    await signInAsAdmin(page);

    await page.clock.fastForward('23:58:30');
    const warning = page.getByRole('alertdialog', { name: 'Your session is about to expire' });
    await expect(warning).toBeVisible();
    await expect(warning.getByRole('timer')).toHaveText(/^01:[0-3]\d$/);

    await page.clock.fastForward('02:00');
    await expect(page.getByRole('alertdialog', { name: 'Your session has expired' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign in again' }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByText('Your session expired')).toBeVisible();
    await expect(page.getByLabel('Work email')).toHaveValue(MOCK.admin);
  });
});

test.describe('responsive layout @mobile', () => {
  test('shows the compact brand header without horizontal scrolling', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('banner')).toContainText('Run StudiPod with confidence.');
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });
});
