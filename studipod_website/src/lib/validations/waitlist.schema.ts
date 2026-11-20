import { z } from "zod";
import { WAITLIST_LIMITS } from "@/lib/constants";

/**
 * Waitlist form schema shared by the client form (instant feedback) and the
 * server (authoritative validation). Client-side validation is a UX aid only.
 */
export const waitlistFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(WAITLIST_LIMITS.fullNameMin, { error: "Please enter your full name." })
    .max(WAITLIST_LIMITS.fullNameMax, {
      error: `Please keep your name under ${WAITLIST_LIMITS.fullNameMax} characters.`,
    }),
  email: z
    .string()
    .trim()
    .min(1, { error: "Please enter your email address." })
    .max(WAITLIST_LIMITS.emailMax, { error: "That email address is too long." })
    .pipe(z.email({ error: "Please enter a valid email address." })),
  examinationCategory: z
    .string()
    .trim()
    .max(WAITLIST_LIMITS.categoryMax, {
      error: `Please keep this under ${WAITLIST_LIMITS.categoryMax} characters.`,
    })
    .optional(),
});

export type WaitlistFormInput = z.input<typeof waitlistFormSchema>;
export type WaitlistFormValues = z.output<typeof waitlistFormSchema>;
