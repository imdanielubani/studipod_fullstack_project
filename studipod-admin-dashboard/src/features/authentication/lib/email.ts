/** Domain every administrator account belongs to. */
export const WORK_EMAIL_DOMAIN = 'studipod.com';

const MASK = '••••';

/** "daniel.ubani@studipod.com" → "d••••@studipod.com". */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return MASK;
  return `${email.charAt(0)}${MASK}${email.slice(at)}`;
}

export function isWorkEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${WORK_EMAIL_DOMAIN}`);
}

/** Two-letter initials from an email local part ("chiamaka.eze@…" → "CE"). */
export function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2 ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}` : local.slice(0, 2);
  return letters.toUpperCase() || '?';
}
