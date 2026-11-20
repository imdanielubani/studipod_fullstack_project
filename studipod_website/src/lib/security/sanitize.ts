/**
 * Input normalisation helpers. Pure functions, safe on client and server.
 *
 * These normalise *representation* (Unicode form, whitespace, invisible
 * characters) before validation. They are not an XSS defence on their own:
 * output is always rendered through React, which escapes text, and untrusted
 * HTML is never rendered.
 */

/** C0/C1 control characters (tabs, newlines, NUL, escape sequences, …). */
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/g;

/** Zero-width characters, bidirectional overrides/isolates and the BOM. */
const INVISIBLE_CHARACTERS = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

const WHITESPACE_RUN = /\s+/g;

/**
 * Normalises free text: NFKC form, control characters become spaces,
 * invisible/bidi characters are removed, whitespace is collapsed and trimmed.
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}

/**
 * Normalises an email address for storage and duplicate detection: NFKC form,
 * invisible characters removed, trimmed and lower-cased. Control characters are
 * intentionally kept so that validation rejects the address instead of silently
 * rewriting it.
 */
export function normalizeEmail(value: string): string {
  return value.normalize("NFKC").replace(INVISIBLE_CHARACTERS, "").trim().toLowerCase();
}

/** Returns undefined for empty input so optional fields are stored as NULL. */
export function emptyToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}
