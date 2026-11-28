# Frontend architecture

## Scope

The dashboard is a **client of `studipod-backend`**. It owns presentation, navigation and
client-side state only. It does not own database models, migrations, business rules,
payment provider secrets or authentication logic.

## Stack

| Concern              | Choice                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| Framework            | Next.js (App Router), React, TypeScript (strict)                        |
| Styling              | Tailwind CSS v4, design tokens in `src/app/globals.css`                 |
| Component primitives | shadcn/ui (Radix UI), Lucide icons                                      |
| Server state         | TanStack Query                                                          |
| Client state         | Zustand (session, UI preferences)                                       |
| Tables               | TanStack Table                                                          |
| Forms and validation | React Hook Form + Zod                                                   |
| Charts               | Recharts                                                                |
| Dates                | date-fns (UTC from the API, displayed in the admin's time zone)         |
| Realtime             | Socket.IO client (support inbox, moderation queue, live session status) |
| End-to-end tests     | Playwright                                                              |

## Directory layout

```text
src/
├── app/                  Routing only: layouts, pages, route boundaries
│   ├── (auth)/           Signed-out screens: sign-in, code, password reset, access denied
│   ├── (dashboard)/      Every protected area: session gate, app shell, catch-all route
│   └── api/health/       Container liveness probe
├── components/           Shared, feature-agnostic UI
│   ├── ui/               shadcn/ui primitives (generated with the shadcn CLI)
│   ├── layout/           App shell, page header, content containers
│   ├── navigation/       Sidebar, breadcrumbs, permission-aware nav items
│   ├── data-table/       TanStack Table wrapper: toolbar, pagination, column controls
│   ├── charts/           Recharts wrappers bound to the design tokens
│   ├── forms/            Field wrappers wired to React Hook Form
│   ├── dialogs/          Confirm, reason-and-code (sensitive action) dialogs
│   ├── filters/          Search, select, date-range filters synced to the URL
│   └── shared/           Loading, empty and error states, status badges
├── features/<feature>/   Everything specific to one admin area
├── hooks/                Cross-feature React hooks
├── lib/                  Framework-level helpers (cn, query client factory, API client)
├── providers/            React context providers (query client, session)
├── services/             Transport: HTTP client, WebSocket client
├── stores/               Zustand stores shared across features
├── types/                Shared TypeScript types (API envelope, pagination)
├── schemas/              Shared Zod schemas
├── utils/                Pure helpers (formatting, URL state)
└── config/               Typed public configuration (`env.ts`), navigation config
```

### Feature folders

Each folder in `src/features/` maps to one admin area and grows only the parts it needs:

```text
features/user-management/
├── api/          Query and mutation hooks, query-key factory, request functions
├── components/   Feature-only components
├── schemas/      Zod schemas for forms and API responses
├── types/        Feature types
└── index.ts      Public exports; other features import only from here
```

Rules:

- `app/` pages stay thin: they compose feature components and read route params.
- Features never import from another feature's internals, only from its `index.ts`.
- `components/` never imports from `features/`.

### Routes

Console addresses come from the navigation model in `src/config/navigation.ts` (see the
[app shell](app-shell.md)). Until a dedicated page exists, each address is served by the
catch-all route `app/(dashboard)/[...slug]`. Build a screen by adding
`app/(dashboard)/<address>/page.tsx` and its feature folder:

| Sidebar group    | Addresses                                                                                                 | Feature folder(s)                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Dashboard        | `/dashboard`, `/analytics`                                                                                | `dashboard-overview`, `analytics`                                                                               |
| Users            | `/users`, `/users/verification`                                                                           | `user-management`                                                                                               |
| Examinations     | `/examinations`, `/subjects`, `/examinations/import-export`                                               | `examination-management`, `subject-management`                                                                  |
| Matching         | `/matching`, `/matching/activity`                                                                         | `matching-management`                                                                                           |
| Bookings         | `/bookings`, `/bookings/problems`, `/scheduling`                                                          | `booking-management`, `scheduling-management`                                                                   |
| Community        | `/groups`                                                                                                 | `group-management`                                                                                              |
| Moderation       | `/moderation`, `/moderation/blocks`, `/moderation/history`                                                | `moderation`                                                                                                    |
| Support          | `/support`, `/support/agents`, `/support/help-centre`                                                     | `support-management`                                                                                            |
| Content          | `/resources`, `/resources/review`                                                                         | `resource-management`                                                                                           |
| Billing          | `/billing`, `/billing/plans`, `/subscriptions`, `/payments`, `/billing/entitlements`, `/billing/settings` | `subscription-management`, `payment-management`                                                                 |
| Video            | `/video-sessions`, `/video-sessions/usage`, `/video-sessions/failures`                                    | `video-management`                                                                                              |
| Notifications    | `/notifications`, `/notifications/delivery-log`, `/notifications/reminders`                               | `notification-management`                                                                                       |
| Admin & Security | `/administrators`, `/roles-permissions`, `/audit-logs`, `/security`                                       | `administrator-management`, `role-management`, `permission-management`, `audit-management`, `system-management` |
| Account          | `/profile`, `/profile/security`                                                                           | `administrator-management`                                                                                      |
| Signed out       | `/sign-in`, `/sign-in/verify`, `/forgot-password`, `/reset-password`, `/access-denied`                    | `authentication`                                                                                                |

## Data fetching and caching

- All backend reads go through TanStack Query hooks in `features/*/api`. Components never
  call `fetch` directly.
- Each feature exposes a **query-key factory** (`userKeys.list(filters)`,
  `userKeys.detail(id)`) so invalidation after mutations is precise.
- Defaults: `staleTime` 30 s for lists, retries only for network errors and `5xx`
  (never for `4xx`), refetch on window focus for operational queues.
- Mutations invalidate the affected keys; optimistic updates only where the backend
  operation is idempotent and reversible.
- The query cache is cleared on sign-out and session expiry.
- Server components are used for static shells and layout. Authenticated admin data is
  fetched in the browser, because the access token lives in browser memory.

## Pagination, filtering, search and sorting

- Table state (page or cursor, page size, filters, search, sort) lives in the **URL query
  string**, so views are shareable, bookmarkable and survive reloads.
- Request parameters follow the backend contract: cursor pagination by default, offset
  pagination (`page`, `pageSize`) for admin tables that need page numbers, explicit filter
  parameters, allowlisted `sort=field:direction`.
- Search inputs are debounced (300 ms) before they update the URL.

## Realtime

The Socket.IO client is created once per session (in `services/`), authenticates with the
in-memory access token during the handshake, and reconnects with a fresh token after
refresh. Realtime events invalidate or patch TanStack Query caches rather than keeping a
second copy of server state. Use it only where live updates matter (support inbox,
moderation queue, live session status); everything else uses normal queries.

## Loading, empty and error states

Every list and detail view has all four states: **loading** (skeleton matching the final
layout), **empty** (with a next action where one exists), **error** (message from the
stable error `code`, retry button, request ID) and **success**. Route-level `loading.tsx`
and `error.tsx` boundaries are the fallback, not the primary mechanism.

## Accessibility (WCAG 2.2 AA)

- Semantic landmarks (`header`, `nav`, `main`), one `h1` per page, skip-to-content link.
- Every interactive element is keyboard reachable with a visible focus ring; dialogs trap
  and restore focus (Radix primitives provide this).
- Tables use real `<table>` markup with header cells and an accessible caption; sort
  buttons announce their state.
- Charts always have a text or table alternative.
- Colour is never the only status signal; text and icons accompany badges.
- Contrast is at least 4.5:1 for text; targets are at least 24×24 px.
- Live updates use polite `aria-live` regions; toasts never carry the only copy of an
  important message.

## Conventions

- Language: British English in UI copy (`lang="en-GB"`).
- Dates: the API sends ISO 8601 UTC; format with date-fns at the edge of the UI.
- Imports use the `@/` alias for `src/`.
- Formatting and linting: Prettier (with Tailwind class sorting) and ESLint
  (`next/core-web-vitals`, TypeScript rules).
