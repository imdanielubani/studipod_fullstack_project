import { describe, expect, it } from 'vitest';

import { initialsFromEmail, isWorkEmail, maskEmail } from './email';

describe('maskEmail', () => {
  it('keeps the first letter and the domain', () => {
    expect(maskEmail('daniel.ubani@studipod.com')).toBe('d••••@studipod.com');
  });

  it('returns only the mask when there is no local part', () => {
    expect(maskEmail('@studipod.com')).toBe('••••');
    expect(maskEmail('not-an-email')).toBe('••••');
  });
});

describe('isWorkEmail', () => {
  it('accepts studipod.com addresses regardless of case and spacing', () => {
    expect(isWorkEmail(' Daniel.Ubani@StudiPod.com ')).toBe(true);
  });

  it('rejects other domains, including look-alikes', () => {
    expect(isWorkEmail('daniel.ubani@gmail.com')).toBe(false);
    expect(isWorkEmail('daniel@studipod.com.evil.io')).toBe(false);
    expect(isWorkEmail('daniel@notstudipod.com')).toBe(false);
  });
});

describe('initialsFromEmail', () => {
  it('uses the first letters of a dotted name', () => {
    expect(initialsFromEmail('chiamaka.eze@gmail.com')).toBe('CE');
  });

  it('falls back to the first two letters of a single word', () => {
    expect(initialsFromEmail('ifeanyi@studipod.com')).toBe('IF');
  });
});
