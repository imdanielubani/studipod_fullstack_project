# Studipod Admin Dashboard

Internal administration console for the Studipod medical examination preparation and
peer-learning platform. Authorised administrators use it to manage candidates,
examinations, matching, bookings, messaging, groups, video sessions, subscriptions,
payments, support, administrators, roles, audit logs and system settings.

The dashboard is a **frontend only**. It talks to `studipod-backend` over REST and
WebSocket; the backend owns data, business rules, authentication and authorisation.

> **Status:** foundation only. Tooling, configuration, folder structure, Docker and
> documentation are in place. No screens, API integrations or authentication flows are
> implemented yet.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 6 (strict) · Tailwind CSS 4 · shadcn/ui ·
Lucide · TanStack Query 5 · TanStack Table 9 · Zustand 5 · React Hook Form 7 · Zod 4 ·
Recharts 3 · date-fns 4 · Socket.IO client 4 · Playwright · ESLint 9 · Prettier 3 · pnpm 12

Exact versions are pinned in `package.json`.

## Requirements

- Node.js 22.12 or newer (`.nvmrc` pins 22 to match the production image)
- pnpm 12 (`npm install --global pnpm@12.21.0`)
- Docker (optional, for the production image)
- A running `studipod-backend` for anything beyond the static shell

## Getting started

```bash
cp .env.development.example .env.local
pnpm install
pnpm dev                 # http://localhost:3100
```

## Scripts

| Script                         | Purpose                                   |
| ------------------------------ | ----------------------------------------- |
| `pnpm dev`                     | Development server                        |
| `pnpm build`                   | Production build (standalone output)      |
| `pnpm start`                   | Serve the production build                |
| `pnpm typecheck`               | TypeScript, no emit                       |
| `pnpm lint` / `lint:fix`       | ESLint                                    |
| `pnpm format` / `format:check` | Prettier (with Tailwind class sorting)    |
| `pnpm test:e2e`                | Playwright end-to-end tests (`tests/e2e`) |
| `pnpm test:e2e:install`        | Download the Playwright Chromium browser  |
| `pnpm validate`                | Typecheck, lint, format check and build   |
| `pnpm audit`                   | Fail on high or critical advisories       |

Add shadcn/ui primitives as they are needed: `pnpm dlx shadcn@latest add button`.
They are generated into `src/components/ui`.

## Project layout

```text
public/            Static assets (images, icons, logos, fonts)
src/app/           Routes: (auth), (dashboard)/<area>, unauthorized, forbidden, api/health
src/components/    Shared UI: ui, layout, navigation, data-table, charts, forms, dialogs, filters, shared
src/features/      One folder per admin area (api, components, schemas, types)
src/hooks/ lib/ providers/ services/ stores/ types/ schemas/ utils/ config/
tests/e2e/         Playwright specs
docs/              Architecture, API integration, security, deployment
infrastructure/    Dokploy and Cloudflare guides
```

Empty folders are kept with `.gitkeep` until they receive code.

## Documentation

| Topic                       | Document                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| Frontend architecture       | [docs/architecture/frontend-architecture.md](docs/architecture/frontend-architecture.md)   |
| Backend API integration     | [docs/api/api-integration.md](docs/api/api-integration.md)                                 |
| Authentication and sessions | [docs/security/authentication-and-session.md](docs/security/authentication-and-session.md) |
| Security architecture       | [docs/security/security-architecture.md](docs/security/security-architecture.md)           |
| Environment variables       | [docs/deployment/environment-variables.md](docs/deployment/environment-variables.md)       |
| Dokploy deployment          | [infrastructure/dokploy/README.md](infrastructure/dokploy/README.md)                       |
| Cloudflare and Access       | [infrastructure/cloudflare/README.md](infrastructure/cloudflare/README.md)                 |

## Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://stuadminapp.studipod.com \
  --build-arg NEXT_PUBLIC_API_URL=https://api.studipod.com/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=wss://ws.studipod.com \
  -t studipod-admin-dashboard .

docker compose up --build   # local production-like run on http://127.0.0.1:3100
```

The image runs the Next.js standalone server as the non-root `node` user on port 3000,
with a health check on `GET /api/health`.

## Security essentials

- No secrets live in this application. `NEXT_PUBLIC_*` values are public and build-time.
- Tokens are never stored in `localStorage`: access token in memory, refresh token in an
  `HttpOnly` cookie set by the backend.
- Dashboard permission checks only shape navigation; the backend authorises every request.
- Production sits behind Cloudflare Access in addition to application sign-in.
