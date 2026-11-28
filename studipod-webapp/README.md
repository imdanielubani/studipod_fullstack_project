# Studipod Candidate Webapp

The candidate-facing application of Studipod: an installable Progressive Web App that helps
candidates preparing for UK and US medical examinations find study partners, schedule
sessions, communicate and practise together.

> **Status:** foundation only. Tooling, configuration, security headers, the PWA shell and
> documentation are in place. No product features, screens or API calls exist yet.

| Related application | Folder                        |
| ------------------- | ----------------------------- |
| Main backend (API)  | `../studipod-backend`         |
| Admin dashboard     | `../studipod-admin-dashboard` |

The backend is the source of truth for every business rule. This app presents data and
collects input; it never decides eligibility, pricing, matching or permissions.

## Stack

| Concern        | Choice                                                                |
| -------------- | --------------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router, Turbopack, standalone output), React 19       |
| Language       | TypeScript 6, strict mode with `noUncheckedIndexedAccess`             |
| Styling and UI | Tailwind CSS 4, shadcn/ui (new-york), Lucide icons                    |
| Server state   | TanStack Query 5 (in-memory cache only)                               |
| Client state   | Zustand 5                                                             |
| Forms          | React Hook Form 7, Zod 4, `@hookform/resolvers`                       |
| API            | Native `fetch` via `openapi-fetch`; types from `openapi-typescript`   |
| Real time      | Socket.IO client 4                                                    |
| Video          | LiveKit (`livekit-client`, `@livekit/components-react`)               |
| i18n           | next-intl 4 (British English at launch)                               |
| PWA            | Serwist 9 (service worker, precache, offline fallback)                |
| Testing        | Vitest + Testing Library (unit, integration), Playwright (end to end) |
| Quality        | ESLint 9 (Next.js rules), Prettier 3, `pnpm audit`                    |
| Runtime        | Node.js 22 LTS, pnpm 12, Docker, Dokploy                              |

## Getting started

```bash
cp .env.development.example .env.local
pnpm install
pnpm dev                  # http://localhost:3100
```

The service worker is only registered in production builds. To test PWA behaviour:

```bash
pnpm build && pnpm start --port 3100   # then open http://localhost:3100
```

## Scripts

| Script                | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `pnpm dev`            | Development server on port 3100                                |
| `pnpm build`          | `next build`, then bundle the service worker to `public/sw.js` |
| `pnpm start`          | Serve the production build                                     |
| `pnpm typecheck`      | Type-check the app and the service worker                      |
| `pnpm lint`           | ESLint                                                         |
| `pnpm format[:check]` | Prettier (with Tailwind class sorting)                         |
| `pnpm test`           | Vitest unit and integration tests                              |
| `pnpm test:coverage`  | Vitest with the 80% coverage threshold                         |
| `pnpm test:e2e`       | Playwright against a local production server                   |
| `pnpm api:generate`   | Generate API types from the backend OpenAPI document           |
| `pnpm icons:generate` | Regenerate PWA and favicon icons from the brand mark           |
| `pnpm validate`       | typecheck, lint, format check, tests and build                 |
| `pnpm audit`          | Fail on high or critical dependency advisories                 |

## Project layout

```text
public/                 manifest.json, offline.html, icons/, images/, fonts/
src/app/                routes: (marketing) (auth) onboarding (candidate) unauthorized forbidden
src/components/         shared UI: ui/ (shadcn) layout/ shared/ forms/ dialogs/ cards/ loading/
src/features/<name>/    one folder per product feature (components, api, schemas, stores)
src/lib/                api/ auth/ socket/ pwa/ storage/ utilities/
src/i18n/               next-intl request config and messages
src/config/             validated public environment configuration
src/providers/ hooks/ services/ stores/ types/ schemas/ constants/
tests/                  unit/ integration/ e2e/
docs/                   architecture, API, authentication, PWA, accessibility, security, deployment
infrastructure/         dokploy/ cloudflare/ scripts/
```

Details and conventions: [frontend architecture](docs/architecture/frontend-architecture.md).

## Documentation

| Topic                       | Document                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Architecture and structure  | [docs/architecture/frontend-architecture.md](docs/architecture/frontend-architecture.md)               |
| Internationalisation        | [docs/architecture/internationalisation.md](docs/architecture/internationalisation.md)                 |
| Feature modules             | [docs/features/README.md](docs/features/README.md)                                                     |
| Backend integration         | [docs/api-integration/api-integration.md](docs/api-integration/api-integration.md)                     |
| Authentication and sessions | [docs/authentication/authentication-and-session.md](docs/authentication/authentication-and-session.md) |
| PWA                         | [docs/pwa/pwa-architecture.md](docs/pwa/pwa-architecture.md)                                           |
| Caching rules               | [docs/pwa/caching-strategy.md](docs/pwa/caching-strategy.md)                                           |
| Push notifications          | [docs/pwa/push-notifications.md](docs/pwa/push-notifications.md)                                       |
| App icons                   | [docs/pwa/icons.md](docs/pwa/icons.md)                                                                 |
| Accessibility               | [docs/accessibility/accessibility-standards.md](docs/accessibility/accessibility-standards.md)         |
| Security                    | [docs/security/security-architecture.md](docs/security/security-architecture.md)                       |
| Environment variables       | [docs/deployment/environment-variables.md](docs/deployment/environment-variables.md)                   |
| Docker image                | [docs/deployment/docker.md](docs/deployment/docker.md)                                                 |
| Dokploy deployment          | [infrastructure/dokploy/README.md](infrastructure/dokploy/README.md)                                   |
| Cloudflare                  | [infrastructure/cloudflare/README.md](infrastructure/cloudflare/README.md)                             |

## Deployment summary

One Docker container (Next.js standalone server) deployed with Dokploy on the Hostinger VPS
behind Traefik and Cloudflare, at `https://app.studipod.com`. Health check:
`GET /api/health`. See [infrastructure/dokploy/README.md](infrastructure/dokploy/README.md).
