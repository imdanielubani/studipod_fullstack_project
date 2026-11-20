import { test as base, expect, type Page } from "@playwright/test";

/**
 * Shared fixture: fails any test that logs a browser console error or an
 * uncaught exception. Content-Security-Policy violations are reported as
 * console errors, so this also proves the CSP does not block the site itself.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(String(error)));
      await use(errors);
      expect(errors, "browser console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export type { Page };

/** Unique, clearly-marked e2e address (cleaned up by global teardown). */
export function e2eEmail(label: string): string {
  return `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@e2e.studipod.test`;
}

export async function gotoHome(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export const waitlistForm = (page: Page) =>
  page.getByRole("form", { name: "Join the StudiPod waitlist" });
