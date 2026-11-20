import { expect, gotoHome, test } from "./fixtures";

test.describe("desktop navigation", () => {
  test.skip(({ isMobile }) => isMobile, "desktop-only navigation");

  test("section links scroll to their sections and mark the active item", async ({ page }) => {
    await gotoHome(page);
    const nav = page.getByRole("navigation", { name: "Primary" });

    for (const [label, id] of [
      ["About", "about"],
      ["Features", "features"],
      ["Home", "home"],
    ] as const) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute(
        "aria-current",
        "location",
      );
    }
  });

  test("Join Waitlist CTA in the navigation reaches the form", async ({ page }) => {
    await gotoHome(page);
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Join Waitlist" })
      .click();
    await expect(page).toHaveURL(/#waitlist$/);
  });

  test("hides the mobile menu toggle", async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
  });
});

test.describe("mobile navigation", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile-only navigation");

  test("menu opens, moves focus inside and closes with Escape", async ({ page }) => {
    await gotoHome(page);
    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    const close = page.getByRole("button", { name: "Close menu" });
    await expect(close).toHaveAttribute("aria-expanded", "true");
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "Home" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });

  test("choosing a link closes the menu and scrolls to the section", async ({ page }) => {
    await gotoHome(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.locator("#mobile-menu").getByRole("link", { name: "Features" }).click();

    await expect(page.locator("#mobile-menu")).toBeHidden();
    await expect(page).toHaveURL(/#features$/);
    await expect(page.locator("#features")).toBeInViewport();
  });

  test("menu includes the waitlist CTA", async ({ page }) => {
    await gotoHome(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.locator("#mobile-menu").getByRole("link", { name: "Join Waitlist" }).click();
    await expect(page).toHaveURL(/#waitlist$/);
  });
});
