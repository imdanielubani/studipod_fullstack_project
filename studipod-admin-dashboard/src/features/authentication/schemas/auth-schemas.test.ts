import { describe, expect, it } from 'vitest';

import {
  forgotPasswordSchema,
  passwordRuleChecks,
  setPasswordSchema,
  signInSchema,
  verificationCodeSchema,
} from './auth-schemas';

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : (result.error?.issues[0]?.message ?? null);
}

describe('signInSchema', () => {
  it('trims the email and accepts any valid domain (the backend decides access)', () => {
    const result = signInSchema.safeParse({ email: ' chiamaka@gmail.com ', password: 'x' });
    expect(result.success && result.data.email).toBe('chiamaka@gmail.com');
  });

  it('rejects a malformed email with the designed message', () => {
    const result = signInSchema.safeParse({ email: 'daniel.ubani@studipod', password: 'x' });
    expect(firstMessage(result)).toBe('Enter a valid email address');
  });

  it('requires a password', () => {
    const result = signInSchema.safeParse({ email: 'a@studipod.com', password: '' });
    expect(firstMessage(result)).toBe('Enter your password');
  });
});

describe('forgotPasswordSchema', () => {
  it('only accepts StudiPod work emails', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'daniel@studipod.com' }).success).toBe(true);
    expect(firstMessage(forgotPasswordSchema.safeParse({ email: 'daniel.ubani@gmail.com' }))).toBe(
      'Use your StudiPod work email (ending @studipod.com).',
    );
  });
});

describe('verificationCodeSchema', () => {
  it('accepts exactly six digits', () => {
    expect(verificationCodeSchema.safeParse('123456').success).toBe(true);
    expect(verificationCodeSchema.safeParse('12345').success).toBe(false);
    expect(verificationCodeSchema.safeParse('12345a').success).toBe(false);
  });
});

describe('setPasswordSchema', () => {
  it('reports mismatched confirmation on the confirm field', () => {
    const result = setPasswordSchema.safeParse({
      password: 'a long new phrase',
      confirmPassword: 'a long new phras',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
    expect(firstMessage(result)).toBe('These passwords don’t match.');
  });

  it('enforces the 12-character minimum', () => {
    const result = setPasswordSchema.safeParse({ password: 'short', confirmPassword: 'short' });
    expect(firstMessage(result)).toBe('Use at least 12 characters.');
  });
});

describe('passwordRuleChecks', () => {
  const email = 'daniel.ubani@studipod.com';

  it('passes a long phrase without personal details', () => {
    expect(passwordRuleChecks('correct horse battery', email)).toEqual({
      minLength: true,
      maxLength: true,
      noPersonalInfo: true,
    });
  });

  it('flags passwords that contain part of the name or email', () => {
    expect(passwordRuleChecks('daniel-is-great-2026', email).noPersonalInfo).toBe(false);
    expect(passwordRuleChecks('my UBANI password!!', email).noPersonalInfo).toBe(false);
  });

  it('does not mark the personal-info rule as met for an empty password', () => {
    expect(passwordRuleChecks('', email).noPersonalInfo).toBe(false);
  });
});
