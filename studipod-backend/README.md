# Studipod backend

The backend for Studipod, a platform where medical students and examination candidates prepare for UK and US professional examinations together: peer matching, study-partner recommendations, scheduling, messaging, group study, video practice sessions, resources, subscriptions and administration.

It is the single source of truth for the **candidate webapp** and the **admin dashboard**, both of which use its authenticated, documented REST and WebSocket APIs.

> **Status: foundation.** Project structure, dependencies, configuration, infrastructure templates, CI and documentation are in place. No product feature is implemented yet. Each folder under `src/modules/` has a README describing what it will own.

## Stack

Node.js 22 · NestJS 12 on Fastify · TypeScript 6 · PostgreSQL 18 + Prisma 7 · PgBouncer · Valkey 9 (Redis protocol) + BullMQ · Socket.IO · Passport/JWT · Argon2id · LiveKit Cloud · Cloudflare R2 · Stripe · Resend · Web Push / FCM · Jest, Supertest, k6, Artillery · Docker + Dokploy on a Hostinger VPS behind Cloudflare.

## Quick start

```bash
pnpm install                                   # from the repository root
cd studipod-backend
cp .env.development.example .env
pnpm infra:up                                  # PostgreSQL + Valkey (localhost only)
pnpm prisma:generate
pnpm start:dev                                 # http://localhost:3000
```

Full instructions: [docs/deployment/local-development.md](docs/deployment/local-development.md).

## Layout

```text
src/            main.ts, app.module.ts, config/, common/, database/, modules/, websocket/, queues/, integrations/, shared/
prisma/         schema.prisma (placeholder, no models yet), migrations/, seed/
test/           unit/, integration/, e2e/, load/ (k6, Artillery)
docs/           architecture, api, database, security, integrations, deployment
infrastructure/ docker/, dokploy/, cloudflare/, monitoring/, backups/, scripts/
```

## Documentation

| Topic                         | Document                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Backend architecture          | [docs/architecture/backend-architecture.md](docs/architecture/backend-architecture.md)               |
| Monorepo structure            | [docs/architecture/monorepo-structure.md](docs/architecture/monorepo-structure.md)                   |
| API architecture              | [docs/api/api-architecture.md](docs/api/api-architecture.md)                                         |
| Database plan                 | [docs/database/database-architecture.md](docs/database/database-architecture.md)                     |
| Authentication plan           | [docs/security/authentication-architecture.md](docs/security/authentication-architecture.md)         |
| WebSocket plan                | [docs/architecture/websocket-architecture.md](docs/architecture/websocket-architecture.md)           |
| Background jobs               | [docs/architecture/background-jobs.md](docs/architecture/background-jobs.md)                         |
| Scalability                   | [docs/architecture/scalability.md](docs/architecture/scalability.md)                                 |
| Integrations                  | [docs/integrations/integrations.md](docs/integrations/integrations.md)                               |
| Security standards            | [docs/security/security-standards.md](docs/security/security-standards.md)                           |
| Infrastructure and deployment | [docs/deployment/infrastructure-and-deployment.md](docs/deployment/infrastructure-and-deployment.md) |
| Environment variables         | [docs/deployment/environment-variables.md](docs/deployment/environment-variables.md)                 |
| Local development             | [docs/deployment/local-development.md](docs/deployment/local-development.md)                         |

## Security

Never commit real credentials. Only `*.example` environment templates are tracked; real values live in a local `.env` (ignored) or in Dokploy. Report vulnerabilities privately to the maintainers rather than in public issues.
