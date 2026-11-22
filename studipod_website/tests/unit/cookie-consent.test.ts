import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_COOKIE, parseConsent, serializeConsent } from "@/lib/cookie-consent";

describe("parseConsent", () => {
  it.each([
    ["", null],
    ["other=1", null],
    [`${CONSENT_COOKIE}=accepted`, "accepted"],
    [`a=1; ${CONSENT_COOKIE}=rejected; b=2`, "rejected"],
    [`${CONSENT_COOKIE}=tampered`, null],
    [`x${CONSENT_COOKIE}=accepted`, null],
  ])("reads %j as %j", (header, expected) => {
    expect(parseConsent(header)).toBe(expected);
  });
});

describe("serializeConsent", () => {
  it("limits the cookie to this site for 180 days", () => {
    expect(serializeConsent("accepted", false)).toBe(
      `${CONSENT_COOKIE}=accepted; Path=/; Max-Age=15552000; SameSite=Lax`,
    );
  });

  it("marks the cookie Secure over HTTPS", () => {
    expect(serializeConsent("rejected", true)).toMatch(/; Secure$/);
  });
});

describe("consent store", () => {
  /** Minimal `document.cookie` stand-in; `isBlocked` ignores writes. */
  function stubBrowser({ cookie = "", isBlocked = false } = {}) {
    let jar = cookie;
    vi.stubGlobal("document", {
      get cookie() {
        return jar;
      },
      set cookie(value: string) {
        if (!isBlocked) jar = value.split(";")[0] ?? "";
      },
    });
    vi.stubGlobal("location", { protocol: "https:" });
  }

  const loadStore = () => import("@/lib/cookie-consent");

  beforeEach(() => vi.resetModules());

  it("asks visitors who have not chosen yet and never asks on the server", async () => {
    stubBrowser();
    const store = await loadStore();
    expect(store.getBannerState()).toBe("initial");
    expect(store.getServerBannerState()).toBe("hidden");
  });

  it("stays hidden for visitors who already chose", async () => {
    stubBrowser({ cookie: `${CONSENT_COOKIE}=rejected` });
    expect((await loadStore()).getBannerState()).toBe("hidden");
  });

  it("stores the choice, hides the banner and notifies subscribers", async () => {
    stubBrowser();
    const store = await loadStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribeToConsent(listener);

    store.saveConsent("accepted");
    expect(document.cookie).toBe(`${CONSENT_COOKIE}=accepted`);
    expect(store.getBannerState()).toBe("hidden");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.saveConsent("rejected");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reopens from the footer and lets the visitor change their mind", async () => {
    stubBrowser({ cookie: `${CONSENT_COOKIE}=accepted` });
    const store = await loadStore();
    store.openCookieSettings();
    expect(store.getBannerState()).toBe("reopened");

    store.saveConsent("rejected");
    expect(store.getBannerState()).toBe("hidden");
    expect(document.cookie).toBe(`${CONSENT_COOKIE}=rejected`);
  });

  it("does not keep asking in the same visit when cookies are blocked", async () => {
    stubBrowser({ isBlocked: true });
    const store = await loadStore();
    store.saveConsent("rejected");
    expect(store.getBannerState()).toBe("hidden");
  });
});
