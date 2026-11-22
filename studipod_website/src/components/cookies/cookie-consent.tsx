"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { COOKIE_SETTINGS_BUTTON_ID } from "@/components/cookies/cookie-settings-button";
import { Button } from "@/components/ui/button";
import {
  getBannerState,
  getServerBannerState,
  saveConsent,
  subscribeToConsent,
  type ConsentChoice,
} from "@/lib/cookie-consent";

/**
 * Cookie consent banner. Non-modal, so the page stays usable; accepting and
 * rejecting are equally prominent, and the footer button reopens it at any time.
 */
export function CookieConsent() {
  const bannerRef = useRef<HTMLElement>(null);
  const state = useSyncExternalStore(subscribeToConsent, getBannerState, getServerBannerState);
  const isReopened = state === "reopened";

  useEffect(() => {
    if (isReopened) bannerRef.current?.focus();
  }, [isReopened]);

  if (state === "hidden") return null;

  function handleChoice(choice: ConsentChoice) {
    saveConsent(choice);
    if (isReopened) {
      document.getElementById(COOKIE_SETTINGS_BUTTON_ID)?.focus({ preventScroll: true });
    }
  }

  return (
    <section
      ref={bannerRef}
      tabIndex={-1}
      aria-labelledby="cookie-consent-heading"
      className="fixed inset-x-4 bottom-4 z-40 animate-rise rounded-lg bg-surface p-5 shadow-[var(--shadow-hairline),var(--shadow-lift)] sm:right-auto sm:bottom-6 sm:left-6 sm:w-[26rem] sm:p-6 print:hidden"
    >
      <h2 id="cookie-consent-heading" className="text-lg font-semibold tracking-tight text-ink">
        Your cookie choices
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        We use an essential cookie to remember your choice. With your permission, we may also use
        optional cookies to understand how the site is used. You can change this any time in Cookie
        settings.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-2.5 min-[22rem]:grid-cols-2">
        <Button variant="dark" className="px-3" onClick={() => handleChoice("rejected")}>
          Reject optional
        </Button>
        <Button variant="dark" className="px-3" onClick={() => handleChoice("accepted")}>
          Accept all
        </Button>
      </div>
    </section>
  );
}
