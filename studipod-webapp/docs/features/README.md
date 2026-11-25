# Feature modules

Each product capability has a folder in `src/features`. All folders are reserved; none
contain code yet.

## Module layout

```text
src/features/<feature>/
├── api/          keys.ts (query keys), requests.ts (typed calls), queries.ts (hooks)
├── components/   UI used only by this feature
├── hooks/        feature hooks
├── schemas/      Zod schemas for this feature's forms
├── stores/       Zustand store, only if the feature needs shared client state
├── types.ts      feature types not covered by generated API types
└── index.ts      public surface used by routes and other features
```

Create only the subfolders a feature needs.

## Features and backend modules

| Feature folder   | Covers                                               | Backend module(s)                             | Needs connectivity |
| ---------------- | ---------------------------------------------------- | --------------------------------------------- | ------------------ |
| `authentication` | Sign-in, registration, verification, password reset  | `authentication`, `users`                     | Yes                |
| `onboarding`     | First-run profile, examination and preference set-up | `candidates`, `profiles`, `study-preferences` | Yes                |
| `dashboard`      | Overview of upcoming sessions, matches, tasks        | Aggregates several modules                    | Yes                |
| `profile`        | Candidate profile and background                     | `candidates`, `profiles`                      | Yes                |
| `examinations`   | Examination selection                                | `examinations`                                | Yes                |
| `subjects`       | Subject management                                   | `subjects`                                    | Yes                |
| `matching`       | Discovery, recommendations, partner requests         | `study-preferences`, `matching`               | Yes                |
| `availability`   | Weekly availability                                  | `availability`                                | Yes                |
| `bookings`       | Study session bookings                               | `bookings`, `scheduling`                      | Yes                |
| `calendar`       | Calendar view of sessions                            | `calendar`                                    | Yes                |
| `messaging`      | One-to-one messages                                  | `messaging`                                   | Yes (real time)    |
| `conversations`  | Conversation list and state                          | `conversations`                               | Yes (real time)    |
| `groups`         | Group communication                                  | `groups`                                      | Yes (real time)    |
| `video-sessions` | LiveKit practice sessions                            | `video-sessions`                              | Yes (real time)    |
| `feedback`       | Post-session feedback                                | `feedback`                                    | Yes                |
| `notifications`  | In-app inbox, push subscription, reminders           | `notifications`, `push-notifications`         | Yes                |
| `resources`      | Study resources                                      | `resources`, `file-storage`                   | Yes                |
| `subscriptions`  | Plans, checkout, billing portal                      | `subscriptions`, `payments`                   | Yes                |
| `settings`       | Account and notification settings                    | `users`, `notifications`                      | Yes                |

Backend module names come from `studipod-backend/docs/architecture/backend-architecture.md`.
Endpoints are taken from the backend OpenAPI document when each module ships.

## Definition of done for a feature

1. Endpoints confirmed in the OpenAPI document; types generated (`pnpm api:generate`).
2. Loading, empty, error and success states implemented.
3. Messages added to `src/i18n/messages`.
4. Keyboard and screen-reader checked; axe checks pass.
5. Offline behaviour defined (usually: disabled actions plus a clear notice).
6. Unit and integration tests (80% coverage) and a Playwright journey for critical flows.
