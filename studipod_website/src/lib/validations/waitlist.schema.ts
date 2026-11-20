import { z } from "zod";
import { WAITLIST_LIMITS } from "@/lib/constants";
import { emptyToUndefined, normalizeEmail, normalizeText } from "@/lib/security/sanitize";
import type { FieldErrors } from "@/types/waitlist";

/**
 * Waitlist validation shared by the client form (instant feedback) and the
 * server (authoritative). Every field is normalised first, then validated, so
 * both sides agree on exactly what is stored.
 */

/** Upper bound on raw input before normalisation — rejects oversized strings early. */
const RAW_INPUT_MAX = 512;

/** Letters (any script), combining marks, spaces, apostrophes, hyphens and dots. */
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;

/** Letters, numbers, spaces and common punctuation used in exam/specialty names. */
const CATEGORY_PATTERN = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} '’.,&()/+:\-]*$/u;

const fullNameField = z
  .string({ error: "Please enter your full name." })
  .max(RAW_INPUT_MAX, { error: "Please enter a shorter name." })
  .transform(normalizeText)
  .pipe(
    z
      .string()
      .min(WAITLIST_LIMITS.fullNameMin, { error: "Please enter your full name." })
      .max(WAITLIST_LIMITS.fullNameMax, {
        error: `Please keep your name under ${WAITLIST_LIMITS.fullNameMax} characters.`,
      })
      .regex(NAME_PATTERN, {
        error: "Please use letters, spaces, hyphens or apostrophes only.",
      }),
  );

const emailField = z
  .string({ error: "Please enter your email address." })
  .max(RAW_INPUT_MAX, { error: "That email address is too long." })
  .transform(normalizeEmail)
  .pipe(
    z
      .string()
      .min(1, { error: "Please enter your email address." })
      .max(WAITLIST_LIMITS.emailMax, { error: "That email address is too long." })
      .pipe(z.email({ error: "Please enter a valid email address." })),
  );

const examinationCategoryField = z
  .string({ error: "Please enter a valid category." })
  .max(RAW_INPUT_MAX, { error: "Please enter a shorter category." })
  .optional()
  .transform((value) => emptyToUndefined(value === undefined ? undefined : normalizeText(value)))
  .pipe(
    z
      .string()
      .max(WAITLIST_LIMITS.categoryMax, {
        error: `Please keep this under ${WAITLIST_LIMITS.categoryMax} characters.`,
      })
      .regex(CATEGORY_PATTERN, {
        error: "Please use letters, numbers and simple punctuation only.",
      })
      .optional(),
  );

/** Fields shown in the form. */
export const waitlistFormSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  examinationCategory: examinationCategoryField,
});

export type WaitlistFormInput = z.input<typeof waitlistFormSchema>;
export type WaitlistFormValues = z.output<typeof waitlistFormSchema>;

/**
 * Server request schema. `.strict()` rejects unknown keys so clients cannot
 * smuggle extra properties (e.g. `status`, `id`) into persistence — only the
 * explicitly allowed fields are ever read (mass-assignment protection).
 */
export const waitlistRequestSchema = waitlistFormSchema.strict();

export type WaitlistRequest = z.output<typeof waitlistRequestSchema>;

export type ParseResult =
  | { success: true; data: WaitlistRequest }
  | { success: false; fieldErrors: FieldErrors; hasUnknownKeys: boolean };

const FIELD_KEYS = ["fullName", "email", "examinationCategory"] as const;

/** Validates an untrusted request body, returning clean data or per-field messages. */
export function parseWaitlistRequest(input: unknown): ParseResult {
  const result = waitlistRequestSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  const flattened = z.flattenError(result.error);
  const fieldErrors: FieldErrors = {};
  for (const key of FIELD_KEYS) {
    const message = flattened.fieldErrors[key]?.[0];
    if (message) fieldErrors[key] = message;
  }
  const hasUnknownKeys = result.error.issues.some((issue) => issue.code === "unrecognized_keys");
  return { success: false, fieldErrors, hasUnknownKeys };
}
