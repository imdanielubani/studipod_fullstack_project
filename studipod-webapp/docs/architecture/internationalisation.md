# Internationalisation

The webapp uses **next-intl** from the start so that no user-facing text is hard-coded,
even though it launches in one language.

## Current set-up

| Item              | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| Locales           | `en-GB` only (`src/i18n/config.ts`)                       |
| URL strategy      | No locale prefix (`/dashboard`, not `/en-GB/dashboard`)   |
| Messages          | `src/i18n/messages/en-GB.json`                            |
| Request config    | `src/i18n/request.ts` (registered in `next.config.ts`)    |
| Type safety       | `src/types/next-intl.d.ts`: message keys are type-checked |
| Default time zone | `UTC` for server rendering only                           |

Server components use `getTranslations`; client components use `useTranslations`. The root
layout wraps the app in `NextIntlClientProvider`.

## Rules

- All user-facing text, including `aria-label`s and alt text, comes from the message files.
- Messages are grouped by feature (`"Bookings": { ... }`), with `Common` and `Errors` shared.
- Use ICU placeholders (`{name}`) and plurals; never concatenate translated fragments.
- Dates, times, numbers and currency go through next-intl formatters.
- **Times:** session times are shown in the candidate's own time zone (from their profile)
  and stored and sent as ISO 8601 UTC. Show the time zone next to booking times, because
  candidates and partners may be in different countries.
- Medical terminology and examination names come from the backend; they are not translated
  in the webapp.

## Adding a locale (for example `en-US`)

1. Add the locale to `LOCALES` and create its messages file.
2. Switch to next-intl locale routing (`defineRouting`, a `[locale]` segment and a request
   proxy), or select the locale from the candidate's profile without URL prefixes.
3. Add hreflang alternates to public `(marketing)` pages.
