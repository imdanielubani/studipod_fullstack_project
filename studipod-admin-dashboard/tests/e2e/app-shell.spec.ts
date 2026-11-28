import { expect, test } from '@playwright/test';

import { signInAsAdmin } from './support/auth';

test.describe('app shell', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('navigates from the sidebar and marks the current page', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('button', { name: 'Billing' }).click();
    await nav.getByRole('link', { name: 'Plans & pricing' }).click();

    await expect(page).toHaveURL(/\/billing\/plans$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Plans & pricing' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Plans & pricing' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(
      page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Billing' }),
    ).toHaveAttribute('href', '/billing');
  });

  test('remembers a collapsed sidebar across reloads and opens flyouts', async ({ page }) => {
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();

    await page.getByRole('button', { name: 'Users' }).hover();
    const flyout = page.getByRole('group', { name: 'Users' });
    await flyout.getByRole('link', { name: 'Verification queue' }).click();
    await expect(page).toHaveURL(/\/users\/verification$/);

    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
  });

  test('jumps to a page with Ctrl+K search', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search pages' }).fill('audit');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/audit-logs$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Audit log' })).toBeVisible();
  });

  test('opens notifications and the account menu, then signs out', async ({ page }) => {
    // The page header sits inside <main>, so it is not a banner landmark.
    await page.getByRole('button', { name: 'View notifications' }).click();
    await expect(page.getByText('You’re all caught up')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Account menu/ }).click();
    const menu = page.getByRole('menu', { name: 'Account' });
    await expect(menu.getByText(/Signed in today at \d{2}:\d{2} · Lagos, NG/)).toBeVisible();
    await menu.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByText('You’ve been signed out')).toBeVisible();
  });

  test('shows a not-found page for unknown addresses', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});

test.describe('mobile app shell @mobile', () => {
  test('opens the navigation drawer and follows a link', async ({ page }) => {
    await signInAsAdmin(page);
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const drawer = page.getByRole('dialog', { name: 'Navigation' });
    await drawer.getByRole('button', { name: 'Support' }).click();
    await drawer.getByRole('link', { name: 'Tickets' }).click();

    await expect(page).toHaveURL(/\/support$/);
    await expect(drawer).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Tickets' })).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });
});
