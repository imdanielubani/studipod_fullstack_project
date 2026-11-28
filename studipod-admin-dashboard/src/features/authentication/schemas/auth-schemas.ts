import { z } from 'zod';

import { isWorkEmail, WORK_EMAIL_DOMAIN } from '../lib/email';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const VERIFICATION_CODE_LENGTH = 6;

const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your work email')
  .max(254, 'Enter a valid email address')
  .pipe(z.email('Enter a valid email address'));

/**
 * Sign-in validates the email format only. Domain checks happen on the backend,
 * so a candidate account still reaches the "Access denied" explanation.
 */
export const signInSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, 'Enter your password')
    .max(PASSWORD_MAX_LENGTH, 'Enter your password'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField.refine(
    isWorkEmail,
    `Use your StudiPod work email (ending @${WORK_EMAIL_DOMAIN}).`,
  ),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const verificationCodeSchema = z
  .string()
  .regex(new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`), 'Enter the 6-digit code');

/** Rules the client can check while typing. The backend re-checks all of them. */
export function passwordRuleChecks(password: string, email: string) {
  const lowered = password.toLowerCase();
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  const nameParts = local.split(/[._-]+/).filter((part) => part.length >= 3);
  const containsPersonalInfo =
    (local.length >= 3 && lowered.includes(local)) ||
    nameParts.some((part) => lowered.includes(part));

  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    maxLength: password.length <= PASSWORD_MAX_LENGTH,
    noPersonalInfo: password.length > 0 && !containsPersonalInfo,
  };
}

export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'These passwords don’t match.',
  });
export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
