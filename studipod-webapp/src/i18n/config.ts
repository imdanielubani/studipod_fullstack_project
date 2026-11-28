/**
 * Internationalisation settings.
 *
 * The webapp launches in British English only, without locale-prefixed URLs. Adding a
 * locale means adding its messages file and switching to next-intl's locale routing
 * (docs/architecture/internationalisation.md).
 */
export const LOCALES = ['en-GB'] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en-GB';

/**
 * Fallback time zone for server-rendered dates. Session times are always shown in the
 * candidate's own time zone once their profile is loaded; this only avoids rendering
 * differences between server and browser before then.
 */
export const DEFAULT_TIME_ZONE = 'UTC';
