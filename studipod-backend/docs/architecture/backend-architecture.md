# Backend architecture

Studipod helps medical students and examination candidates prepare for UK and US professional examinations through peer matching, scheduled study sessions, messaging, group study and video practice. The backend is the single source of truth for the **candidate webapp** and the **admin dashboard**. Neither client talks to the database, queues or third-party secrets directly; everything goes through authenticated, documented APIs.

> **Status:** foundation only. Directories, configuration, dependencies, infrastructure and documentation exist. No feature has been implemented.

## System context

```text
                        Cloudflare (DNS, CDN, WAF, TLS)
                                     │
        ┌────────────────────────────┼─────────────────────────────┐
        │ app.<domain>               │ api.<domain> / ws.<domain>  │ admin.<domain>
   Candidate webapp            Traefik (Dokploy)              Admin dashboard
        │                            │                             │
        └──────── HTTPS / WSS ───────┤─────────────────────────────┘
                                     │
          ┌──────────────────────────┼───────────────────────────┐
          │                          │                           │
     API (REST)             WebSocket gateway              Worker (BullMQ)
     NestJS + Fastify       NestJS + Socket.IO             NestJS application context
          │                          │                           │
          ├──────────────┬───────────┴───────────┬───────────────┤
          │              │                       │               │
     PgBouncer ── PostgreSQL              Valkey (Redis protocol)
                                    cache · queues · pub/sub · Socket.IO adapter

   Outbound integrations: LiveKit Cloud · Cloudflare R2 · Stripe · Resend · Web Push / FCM
```

## Runtime services

One codebase and one Docker image produce three processes. Each runs a different entry point and scales independently.

| Process               | Entry point (planned)    | Responsibility                                                                                                    | Scales on              |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **API**               | `dist/main.js`           | REST endpoints for both clients, OpenAPI docs, webhooks (Stripe, LiveKit, Resend)                                 | Request rate, CPU      |
| **WebSocket gateway** | `dist/websocket.main.js` | Authenticated Socket.IO connections: message delivery, typing, presence, live notifications                       | Concurrent connections |
| **Worker**            | `dist/worker.main.js`    | BullMQ processors and scheduled jobs: email, push, reminders, matching recomputation, image processing, analytics | Queue depth            |

Only `main.ts` exists today. The gateway and worker entry points are created with their first feature, and the Dokploy stack already reserves services for them (profiles `realtime` and `workers`).

Why separate processes: the API must stay responsive while thousands of long-lived sockets are open and while heavy jobs (image resizing, match recomputation) run. Separating them lets each be sized and replicated for its own load, and a crash in one does not take down the others.

**Video is not a backend process.** LiveKit Cloud carries all audio and video. The API only issues short-lived LiveKit access tokens and receives LiveKit webhooks, so video load never competes with API traffic.

## Technology choices

| Concern        | Choice                                         | Reason                                                                                  |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| Runtime        | Node.js 22 LTS                                 | Long-term support; pinned in Docker and CI                                              |
| Framework      | NestJS 12 on Fastify                           | Module system and DI suit a large domain; Fastify has lower overhead than Express       |
| Language       | TypeScript 6 (strict)                          | Nest CLI 12 targets TypeScript 6; TypeScript 7 is adopted when Nest tooling supports it |
| API style      | REST + OpenAPI (`@nestjs/swagger`)             | Two first-party clients, generated typed clients, simple caching                        |
| Real-time      | Socket.IO + `@socket.io/redis-adapter`         | Rooms, acknowledgements, reconnection and fallbacks; horizontal scaling via Redis       |
| Database       | PostgreSQL 18 + Prisma 7 (`pg` driver adapter) | Relational integrity for bookings and payments; type-safe queries                       |
| Pooling        | PgBouncer (transaction mode)                   | Many app processes share a small number of PostgreSQL connections                       |
| Cache / queues | Valkey 9 (Redis protocol) + BullMQ             | One proven component for cache, queues, pub/sub and the socket adapter                  |
| Search         | PostgreSQL full-text search + `pg_trgm`        | No extra service; Meilisearch only if measured relevance or latency requires it         |
| Auth           | Passport (JWT, local), Argon2id                | Standard strategies; OWASP-recommended password hashing                                 |
| Files          | Cloudflare R2 via AWS S3 SDK, Sharp            | S3-compatible, no egress fees, direct browser uploads via presigned URLs                |
| Payments       | Stripe                                         | Subscriptions, customer portal, SCA handling                                            |
| Email          | Resend                                         | Transactional email with webhooks for delivery events                                   |
| Push           | Web Push (VAPID) + Firebase Cloud Messaging    | Browser push now; FCM covers future mobile apps                                         |
| Logging        | `nestjs-pino`                                  | Structured JSON logs with request IDs and redaction                                     |

## Source layout

```text
src/
├── main.ts                 HTTP API bootstrap
├── app.module.ts           Root module (ConfigModule today; feature modules as they land)
├── config/                 Typed, namespaced configuration loaded from environment variables
├── common/                 Cross-cutting framework pieces: guards, interceptors, filters, pipes, decorators
├── database/               Prisma client module; generated client in database/prisma/generated (git-ignored)
├── modules/                One folder per business domain (see "Domain modules")
├── websocket/              Socket.IO gateways, Redis adapter, event contracts
├── queues/                 Queue names, job payload contracts, producers and processors
├── integrations/           Thin clients for LiveKit, R2, Stripe, Resend, Firebase
└── shared/                 Framework-free types, validators and helpers
```

## Domain modules

Each folder under `src/modules/` has a README that states what it will own. Summary:

| Area           | Modules                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Identity       | `authentication`, `users`, `candidates`, `profiles`                                                              |
| Exam catalogue | `examinations`, `subjects`                                                                                       |
| Matching       | `study-preferences`, `matching`                                                                                  |
| Scheduling     | `availability`, `bookings`, `scheduling`, `calendar`                                                             |
| Communication  | `conversations`, `messaging`, `groups`, `notifications`, `email`, `push-notifications`                           |
| Practice       | `video-sessions`, `feedback`, `resources`, `file-storage`                                                        |
| Commerce       | `subscriptions`, `payments`                                                                                      |
| Administration | `admin/administrators`, `admin/roles`, `admin/permissions`, `admin/audit-logs`, `analytics`, `support`, `system` |
| Operations     | `health`                                                                                                         |

## Module conventions

These rules apply when features are implemented:

1. **One module per domain.** A module owns its tables. Other modules call its exported service; they never query its tables directly.
2. **Layers inside a module:** `*.controller.ts` (HTTP only: parse, authorise, delegate) → `*.service.ts` (business rules) → `*.repository.ts` (Prisma access). DTOs live in `dto/` and are validated with `class-validator`.
3. **No circular imports between modules.** Cross-domain reactions (for example "booking confirmed" → "send reminder") use domain events or queue jobs, not mutual service calls.
4. **Integrations are wrapped.** Feature modules depend on `src/integrations/*` clients, never on vendor SDKs directly, so a vendor can be swapped or mocked.
5. **Admin routes live in `modules/admin`** or are mounted under `/api/v1/admin` with the admin guard. Candidate controllers never expose admin capabilities.
6. **Side effects run off the request path.** Email, push, image processing and recomputation are enqueued as jobs.
7. **Tests:** unit tests next to the code (`*.spec.ts`) or in `test/unit`; integration tests against real PostgreSQL and Valkey in `test/integration`; HTTP end-to-end tests with Supertest in `test/e2e`.

## Related documents

- [Monorepo structure](monorepo-structure.md)
- [API architecture](../api/api-architecture.md)
- [Database architecture](../database/database-architecture.md)
- [Authentication architecture](../security/authentication-architecture.md)
- [WebSocket architecture](websocket-architecture.md)
- [Background jobs](background-jobs.md)
- [Scalability](scalability.md)
- [Integrations](../integrations/integrations.md)
- [Security standards](../security/security-standards.md)
- [Infrastructure and deployment](../deployment/infrastructure-and-deployment.md)
- [Environment variables](../deployment/environment-variables.md)
- [Local development](../deployment/local-development.md)
