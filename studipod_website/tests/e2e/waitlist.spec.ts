import { e2eEmail, expect, test, waitlistForm, type Page } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/#waitlist");
  await expect(waitlistForm(page)).toBeVisible();
});

test("shows validation errors and focuses the first invalid field", async ({ page }) => {
  await page.getByRole("button", { name: "Request Early Access" }).click();

  const fullName = page.getByLabel("Full name");
  await expect(fullName).toBeFocused();
  await expect(fullName).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Please enter your full name.")).toBeVisible();
  await expect(page.getByText("Please enter your email address.")).toBeVisible();

  await page.getByLabel("Email address").fill("not-an-email");
  await page.getByLabel("Email address").blur();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
});

test.describe("against the real API and database", () => {
  // Real submissions share the per-IP rate limit; run them on desktop only.
  test.skip(({ isMobile }) => isMobile, "real submissions run once, on desktop");

  test("registers a new person and shows the success state", async ({ page }) => {
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Email address").fill(e2eEmail("success"));
    await page.getByLabel(/Examination or professional category/).fill("PLAB 1");
    await page.getByRole("button", { name: "Request Early Access" }).click();

    const heading = page.getByRole("heading", { name: "You’re on the list, Ada." });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(page.getByRole("status")).toContainText("Invitations are sent in rolling batches");
  });

  test("tells people when their email is already registered", async ({ page }) => {
    const email = e2eEmail("duplicate");
    const first = await page.request.post("/api/waitlist", {
      headers: { "content-type": "application/json" },
      data: { fullName: "Grace Hopper", email },
    });
    expect(first.status()).toBe(201);

    await page.getByLabel("Full name").fill("Grace Hopper");
    await page.getByLabel("Email address").fill(email.toUpperCase());
    await page.getByRole("button", { name: "Request Early Access" }).click();

    await expect(page.getByText("This email address is already on the waitlist.")).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("UI states (network responses mocked)", () => {
  async function fillValidForm(page: Page) {
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Email address").fill("ada@example.com");
  }

  test("disables the button and shows progress while submitting", async ({ page }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/waitlist", async (route) => {
      await held;
      await route.fulfill({
        status: 201,
        json: { success: true, data: { message: "ok" }, error: null },
      });
    });

    await fillValidForm(page);
    await page.getByRole("button", { name: "Request Early Access" }).click();

    const pending = page.getByRole("button", { name: "Requesting access…" });
    await expect(pending).toBeDisabled();
    await expect(waitlistForm(page)).toHaveAttribute("aria-busy", "true");
    release();
    await expect(page.getByRole("heading", { name: /You’re on the list/ })).toBeVisible();
  });

  test("explains rate limiting", async ({ page }) => {
    await page.route("**/api/waitlist", (route) =>
      route.fulfill({
        status: 429,
        headers: { "Retry-After": "600" },
        json: {
          success: false,
          data: null,
          error: {
            code: "RATE_LIMITED",
            message: "Too many attempts. Please wait a few minutes and try again.",
          },
        },
      }),
    );

    await fillValidForm(page);
    await page.getByRole("button", { name: "Request Early Access" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Too many attempts. Please wait a few minutes and try again.",
    );
    await expect(page.getByRole("button", { name: "Request Early Access" })).toBeEnabled();
  });

  test("handles a lost connection gracefully", async ({ page }) => {
    await page.route("**/api/waitlist", (route) => route.abort("internetdisconnected"));

    await fillValidForm(page);
    await page.getByRole("button", { name: "Request Early Access" }).click();
    await expect(page.getByRole("alert")).toContainText("check your connection");
  });

  test("maps server-side field errors back onto the form", async ({ page }) => {
    await page.route("**/api/waitlist", (route) =>
      route.fulfill({
        status: 422,
        json: {
          success: false,
          data: null,
          error: {
            code: "INVALID_INPUT",
            message: "Please check the highlighted fields and try again.",
            fieldErrors: { fullName: "Please use letters, spaces, hyphens or apostrophes only." },
          },
        },
      }),
    );

    await fillValidForm(page);
    await page.getByRole("button", { name: "Request Early Access" }).click();
    await expect(
      page.getByText("Please use letters, spaces, hyphens or apostrophes only."),
    ).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true");
  });
});
