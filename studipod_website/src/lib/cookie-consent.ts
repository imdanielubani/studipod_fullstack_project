/**
 * Cookie consent: stores the visitor's choice in a first-party cookie and tells the
 * banner when to show. Optional (non-essential) cookies or scripts added in future
 * must only load when the stored choice is "accepted".
 */

export const CONSENT_COOKIE = "studipod_cookie_consent";

const CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

export type ConsentChoice = "accepted" | "rejected";

/** "initial": no choice yet. "reopened": visitor is changing their choice. */
export type BannerState = "hidden" | "initial" | "reopened";

export function parseConsent(cookieHeader: string): ConsentChoice | null {
  const prefix = `${CONSENT_COOKIE}=`;
  const value = cookieHeader
    .split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(prefix))
    ?.slice(prefix.length);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function serializeConsent(choice: ConsentChoice, isSecure: boolean): string {
  const attributes = `Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
  return `${CONSENT_COOKIE}=${choice}; ${attributes}${isSecure ? "; Secure" : ""}`;
}

/* Browser store, consumed with useSyncExternalStore. */

const listeners = new Set<() => void>();
let isReopened = false;
/** Remembers a choice for this visit when the browser blocks cookies. */
let hasChosenThisVisit = false;

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeToConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBannerState(): BannerState {
  if (isReopened) return "reopened";
  if (hasChosenThisVisit) return "hidden";
  return parseConsent(document.cookie) ? "hidden" : "initial";
}

/** The choice is only known in the browser, so the server never renders the banner. */
export function getServerBannerState(): BannerState {
  return "hidden";
}

export function openCookieSettings(): void {
  isReopened = true;
  notify();
}

export function saveConsent(choice: ConsentChoice): void {
  document.cookie = serializeConsent(choice, location.protocol === "https:");
  hasChosenThisVisit = true;
  isReopened = false;
  notify();
}
