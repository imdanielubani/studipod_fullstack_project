import { describe, expect, it } from 'vitest';

import {
  formatCountdown,
  formatShortCountdown,
  INACTIVITY_TIMEOUT_MS,
  INACTIVITY_WARNING_MS,
  inactivityPhase,
  readLastActivity,
  remainingMs,
  writeLastActivity,
} from './inactivity';

const LAST_ACTIVITY = Date.UTC(2026, 10, 28, 9, 0, 0);

describe('inactivityPhase', () => {
  it('is active until two minutes before the 24-hour limit', () => {
    const justBeforeWarning = LAST_ACTIVITY + INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS - 1;
    expect(inactivityPhase(LAST_ACTIVITY, justBeforeWarning)).toBe('active');
  });

  it('warns during the final two minutes', () => {
    const warningStart = LAST_ACTIVITY + INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS;
    expect(inactivityPhase(LAST_ACTIVITY, warningStart)).toBe('warning');
    expect(inactivityPhase(LAST_ACTIVITY, LAST_ACTIVITY + INACTIVITY_TIMEOUT_MS - 1)).toBe(
      'warning',
    );
  });

  it('expires at exactly 24 hours without activity', () => {
    expect(inactivityPhase(LAST_ACTIVITY, LAST_ACTIVITY + INACTIVITY_TIMEOUT_MS)).toBe('expired');
  });

  it('never reports negative time remaining', () => {
    expect(remainingMs(LAST_ACTIVITY, LAST_ACTIVITY + 2 * INACTIVITY_TIMEOUT_MS)).toBe(0);
  });
});

describe('countdown formatting', () => {
  it('formats the session countdown as mm:ss', () => {
    expect(formatCountdown(119_000)).toBe('01:59');
    expect(formatCountdown(10_000)).toBe('00:10');
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('rounds partial seconds up so the countdown never shows zero early', () => {
    expect(formatCountdown(500)).toBe('00:01');
  });

  it('formats short countdowns as m:ss', () => {
    expect(formatShortCountdown(45_000)).toBe('0:45');
    expect(formatShortCountdown(892_000)).toBe('14:52');
  });
});

describe('shared last-activity timestamp', () => {
  it('round-trips through localStorage', () => {
    writeLastActivity(LAST_ACTIVITY);
    expect(readLastActivity()).toBe(LAST_ACTIVITY);
  });

  it('ignores missing or corrupt values', () => {
    expect(readLastActivity()).toBeNull();
    window.localStorage.setItem('studipod-admin:last-activity', 'not-a-number');
    expect(readLastActivity()).toBeNull();
  });
});
