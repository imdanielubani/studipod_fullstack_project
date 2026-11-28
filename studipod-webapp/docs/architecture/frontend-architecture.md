# Frontend architecture

> **Status:** structure and conventions. Folders marked with `.gitkeep` are reserved and
> filled in as features are built.

## Principles

1. **The backend decides.** Eligibility, pricing, matching scores, booking rules and
   permissions are computed and enforced by `studipod-backend`. The webapp validates input
   _shape_ for good feedback and renders what the API returns. Client checks only decide
   what to show.
2. **Feature first.** Code that belongs to one product capability lives in
   `src/features/<feature>`. Shared folders hold only what two or more features use.
3. **Server components by default.** Add `'use client'` only where state, effects, browser
   APIs or event handlers are needed, and keep client boundaries as low in the tree as
   possible.
4. **Mobile first and accessible.** Layouts start at 320 px wide and scale up. Every
   screen meets WCAG 2.2 AA ([accessibility standards](../accessibility/accessibility-standards.md)).
5. **Real-time features need a connection.** The PWA never pretends that messaging,
   matching, bookings or video work offline.

## Directory responsibilities

| Path                                         | Holds                                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/app`                                    | Routes, layouts and route-level `loading`/`error`/`not-found` files only. Thin: compose feature components. |
| `src/components/ui`                          | shadcn/ui primitives, added with `pnpm dlx shadcn@latest add <name>`. Not edited for feature needs.         |
| `src/components/layout`                      | App shells: candidate navigation, headers, mobile bottom navigation.                                        |
| `src/components/shared`                      | Cross-feature presentational pieces (avatars, empty states, status badges).                                 |
| `src/components/forms`                       | Form building blocks bound to React Hook Form (field, error message, submit button).                        |
| `src/components/dialogs`, `cards`, `loading` | Reusable dialogs, card layouts, skeletons and spinners.                                                     |
| `src/features/<name>`                        | Everything specific to one feature (see [feature modules](../features/README.md)).                          |
| `src/lib/api`                                | HTTP client, TanStack Query client factory, API error type.                                                 |
| `src/lib/auth`                               | In-memory session, silent refresh, route-guard helpers.                                                     |
| `src/lib/socket`                             | Socket.IO connection lifecycle (authenticate, reconnect after refresh).                                     |
| `src/lib/pwa`                                | Service worker source (`service-worker/`), install prompt and network-status helpers.                       |
| `src/lib/storage`                            | The only module allowed to touch Web Storage, for non-sensitive preferences.                                |
| `src/lib/utilities`                          | Framework-level helpers (`cn`).                                                                             |
| `src/providers`                              | Client providers mounted by the root layout (`AppProviders`).                                               |
| `src/hooks`                                  | Cross-feature hooks (media queries, online status, reduced motion).                                         |
| `src/services`                               | Cross-feature application services that combine `lib` clients (for example session bootstrap).              |
| `src/stores`                                 | Cross-feature Zustand stores (session, UI chrome). Feature stores stay in the feature.                      |
| `src/schemas`                                | Shared Zod schemas (email, password shape, pagination).                                                     |
| `src/types`                                  | Shared types; `generated/` holds OpenAPI output and is never edited by hand.                                |
| `src/config`                                 | Validated configuration (`env.ts`).                                                                         |
| `src/constants`                              | Shared constants (route paths, limits, query-key roots).                                                    |
| `src/i18n`                                   | next-intl request configuration and message catalogues.                                                     |

Imports flow one way: `app` → `features` → `components`/`lib`/`hooks`/`stores`. Features do
not import from other features' internals; promote shared code instead.

### Deliberate differences from the initial outline

- **No `src/utils`.** It would duplicate `src/lib/utilities`.
- **No `src/app/offline` route.** The offline fallback is the static `public/offline.html`,
  which the service worker precaches. A server-rendered route cannot be shown when the
  server is unreachable, so a second fallback would never be used.
- **No `infrastructure/docker`.** The `Dockerfile` and `docker-compose.yml` sit at the
  project root, where Dokploy and `docker build` expect them.
- **Added `src/i18n`** for next-intl and **`src/app/api/health`** for container health checks.

## Routing

| Route group / folder | Purpose                                                       | Access                           |
| -------------------- | ------------------------------------------------------------- | -------------------------------- |
| `(marketing)`        | Public pages (landing, pricing, legal)                        | Public, indexable                |
| `(auth)`             | Sign in, registration, password reset, email verification     | Signed-out only                  |
| `onboarding`         | Profile, examination, subject and preference set-up           | Signed in, onboarding incomplete |
| `(candidate)`        | Dashboard and every product feature                           | Signed in, onboarding complete   |
| `unauthorized`       | Session missing or expired                                    | Public                           |
| `forbidden`          | Signed in without access (for example, plan does not include) | Signed in                        |

Route groups share a layout without adding a URL segment. Protected groups get a session
gate in their layout ([authentication](../authentication/authentication-and-session.md)).
`typedRoutes` is enabled, so links to routes that do not exist fail the build.

## State management

| Kind of state                | Tool                      | Rule                                                        |
| ---------------------------- | ------------------------- | ----------------------------------------------------------- |
| Server data                  | TanStack Query            | Never copied into Zustand. In memory only, never persisted. |
| Session (access token, user) | Zustand, not persisted    | Cleared on sign-out together with the query cache.          |
| UI state across components   | Zustand (feature store)   | Small, serialisable, no server data.                        |
| Local UI state               | `useState` / `useReducer` | Default choice.                                             |
| Form state                   | React Hook Form + Zod     | Schema in the feature's `schemas/`.                         |
| URL state (filters, tabs)    | Search params             | Shareable and survives reloads.                             |

Query defaults live in `src/lib/api/query-client.ts`: one-minute stale time, query retries,
and **no automatic mutation retries** (bookings and payments must not be repeated).
Mutations that create bookings or payments send an `Idempotency-Key`.

## Data fetching

- Client components fetch through feature query hooks (`features/<f>/api/queries.ts`).
- Server components may fetch public data (examinations, plans) directly. Personal data is
  fetched in the browser with the in-memory access token, because the refresh cookie
  belongs to the API origin ([authentication](../authentication/authentication-and-session.md)).
- Socket events update the query cache (`setQueryData` or invalidation); they never become
  a second source of truth.

## Loading, empty and error states

Every data-driven view handles four states: **loading** (skeleton matching the final
layout, `role="status"`), **empty** (explains why and offers the next action), **error**
(plain message, retry, and the API `requestId` for support), and **success**.

- Route level: `loading.tsx`, `error.tsx` and `not-found.tsx` per route group as needed;
  the root versions already exist.
- Error boundaries show only the opaque digest or request ID, never error messages or stack
  traces.

## Styling

- Tailwind utility classes; design tokens are CSS variables in `src/app/globals.css`
  (brand navy `#0a1d54`, blue `#1c61f7`, coral `#fd6076`).
- `cn()` from `@/lib/utilities/cn` merges classes; variants use `class-variance-authority`.
- Touch targets are at least 44 × 44 px. Layouts respect `env(safe-area-inset-*)` for
  installed apps on notched devices.
- Fonts: system font stack until brand fonts are supplied. Self-hosted font files go in
  `public/fonts` and are loaded with `next/font/local` (no third-party font requests).

## Testing

| Level       | Tool                           | Location            | Scope                                             |
| ----------- | ------------------------------ | ------------------- | ------------------------------------------------- |
| Unit        | Vitest, Testing Library        | `tests/unit`        | Hooks, utilities, schemas, components             |
| Integration | Vitest, Testing Library        | `tests/integration` | Feature modules with a mocked network layer       |
| End to end  | Playwright (desktop + Pixel 7) | `tests/e2e`         | Critical candidate journeys on a production build |

Coverage threshold: 80% (`pnpm test:coverage`). Tests are added with each feature.
