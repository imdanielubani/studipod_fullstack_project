"use client";

import { FooterLinkLabel, footerLinkClasses } from "@/components/layout/footer-link";
import { openCookieSettings } from "@/lib/cookie-consent";

export const COOKIE_SETTINGS_BUTTON_ID = "cookie-settings-button";

/** Footer control that reopens the cookie banner, styled like the links beside it. */
export function CookieSettingsButton() {
  return (
    <button
      id={COOKIE_SETTINGS_BUTTON_ID}
      type="button"
      onClick={openCookieSettings}
      className={footerLinkClasses}
    >
      <FooterLinkLabel>Cookie settings</FooterLinkLabel>
    </button>
  );
}
