/** Signed out after this long without user activity (confirmed product rule). */
export const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/** The "about to expire" warning appears this long before sign-out. */
export const INACTIVITY_WARNING_MS = 2 * 60 * 1000;

/** Activity is recorded at most this often, to keep event handling cheap. */
export const ACTIVITY_WRITE_THROTTLE_MS = 5_000;

/** Shared between tabs so activity in one tab keeps every tab signed in. */
export const LAST_ACTIVITY_STORAGE_KEY = 'studipod-admin:last-activity';

export type InactivityPhase = 'active' | 'warning' | 'expired';

export function remainingMs(lastActivityAt: number, now: number): number {
  return Math.max(0, lastActivityAt + INACTIVITY_TIMEOUT_MS - now);
}

export function inactivityPhase(lastActivityAt: number, now: number): InactivityPhase {
  const remaining = remainingMs(lastActivityAt, now);
  if (remaining === 0) return 'expired';
  if (remaining <= INACTIVITY_WARNING_MS) return 'warning';
  return 'active';
}

/** Formats a countdown as mm:ss ("01:59"). */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Formats a short countdown as m:ss ("0:45", "14:52"). */
export function formatShortCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Reads the shared last-activity time; storage can be unavailable (private mode). */
export function readLastActivity(): number | null {
  try {
    const raw = globalThis.localStorage?.getItem(LAST_ACTIVITY_STORAGE_KEY);
    const value = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeLastActivity(at: number): void {
  try {
    globalThis.localStorage?.setItem(LAST_ACTIVITY_STORAGE_KEY, String(at));
  } catch {
    // Without storage, activity is tracked per tab only.
  }
}
