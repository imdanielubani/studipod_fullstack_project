import { expect, gotoHome, test, type Page } from "./fixtures";

const banner = (page: Page) => page.getByRole("region", { name: "Your cookie choices" });

async function storedChoice(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "studipod_cookie_consent")?.value;
}

test.describe("cookie consent", () => {
  test.use({ hasCookieChoice: false });

  for (const [button, value] of [
    ["Accept all", "accepted"],
    ["Reject optional", "rejected"],
  ] as const) {
    test(`"${button}" is remembered after a reload`, async ({ page }) => {
      await gotoHome(page);
      await expect(banner(page)).toBeVisible();
      expect(await storedChoice(page)).toBeUndefined();

      await banner(page).getByRole("button", { name: button }).click();
      await expect(banner(page)).toBeHidden();
      expect(await storedChoice(page)).toBe(value);

      await page.reload();
      await expect(page.getByRole("button", { name: "Cookie settings" })).toBeAttached();
      await expect(banner(page)).toBeHidden();
    });
  }
});

test("the choice can be changed from the footer", async ({ page }) => {
  await gotoHome(page);
  const settings = page.getByRole("button", { name: "Cookie settings" });
  await settings.click();
  await expect(banner(page)).toBeFocused();

  await banner(page).getByRole("button", { name: "Accept all" }).click();
  await expect(banner(page)).toBeHidden();
  await expect(settings).toBeFocused();
  expect(await storedChoice(page)).toBe("accepted");
});
