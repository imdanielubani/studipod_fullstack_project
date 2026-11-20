import { e2eEmail, expect, gotoHome, test, waitlistForm } from "./fixtures";

test.describe("landing page", () => {
  test("renders the hero and every section with the supplied copy", async ({ page }) => {
    await gotoHome(page);

    await expect(page).toHaveTitle("StudiPod — The Study Experience, Reimagined");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "The Study Experience, Reimagined",
    );
    await expect(page.getByRole("heading", { name: "The Big Idea" })).toBeAttached();
    await expect(page.getByRole("heading", { name: "The Pod Experience" })).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "Be Part of our Study Experience." }),
    ).toBeAttached();
    for (const feature of [
      "Find Your Study Circle",
      "Study With Purpose",
      "Learn Interactively",
      "Practice Together",
      "Share Knowledge",
    ]) {
      await expect(page.getByRole("heading", { level: 3, name: feature })).toBeAttached();
    }
    await expect(page.getByText("© 2026 StudiPod. All rights reserved.")).toBeAttached();
  });

  test("hero CTA scrolls to the waitlist form", async ({ page }) => {
    await gotoHome(page);
    await page.getByRole("link", { name: "Join the Waitlist" }).click();

    await expect(page).toHaveURL(/#waitlist$/);
    await expect(waitlistForm(page)).toBeInViewport();
  });

  test("skip link is the first focusable element", async ({ page }) => {
    await gotoHome(page);
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();
  });

  test("has no horizontal overflow at common widths", async ({ page }) => {
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoHome(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("shows content for reduced-motion users", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoHome(page);
    await page.locator("#features").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Share Knowledge" })).toBeVisible();
  });
});

test.describe("security", () => {
  test("serves a nonce-based CSP and hardening headers", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};

    const csp = headers["content-security-policy"] ?? "";
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce).toBeTruthy();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-powered-by"]).toBeUndefined();

    // Every script Next.js renders carries this request's nonce.
    const scriptNonces = await page.$$eval("script[src]", (scripts) =>
      scripts.map((script) => script.nonce),
    );
    expect(scriptNonces.length).toBeGreaterThan(0);
    expect(new Set(scriptNonces)).toEqual(new Set([nonce]));
  });

  test("issues a fresh nonce for every request", async ({ request }) => {
    const first = (await request.get("/")).headers()["content-security-policy"];
    const second = (await request.get("/")).headers()["content-security-policy"];
    expect(first).not.toBe(second);
  });

  test("rejects non-POST methods and cross-site posts to the API", async ({ request }) => {
    expect((await request.get("/api/waitlist")).status()).toBe(405);

    const crossSite = await request.post("/api/waitlist", {
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      data: { fullName: "Ada Lovelace", email: e2eEmail("crosssite") },
    });
    expect(crossSite.status()).toBe(403);
    expect(crossSite.headers()["content-security-policy"]).toBe(
      "default-src 'none'; frame-ancestors 'none'",
    );
  });
});

test.describe("secondary pages", () => {
  test("footer legal links open clearly-marked placeholder pages", async ({ page }) => {
    await gotoHome(page);
    await page.getByRole("link", { name: "Privacy Policy" }).click();

    await expect(page).toHaveURL(/\/privacy-policy$/);
    await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByText("Placeholder — awaiting approved content")).toBeVisible();

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("unknown routes show the branded 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("This page");
  });

  test("publishes robots.txt and a sitemap", async ({ request }) => {
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /api/");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("<loc>");
  });
});
