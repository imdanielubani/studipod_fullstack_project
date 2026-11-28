/** Static, non-secret application constants shared across the console. */
export const APP_CONFIG = {
  productName: 'StudiPod',
  consoleName: 'Admin Console',
  consoleVersionLabel: 'v1.0',
} as const;

/** Current calendar year for copyright lines. */
export function currentYear(): number {
  return new Date().getFullYear();
}
