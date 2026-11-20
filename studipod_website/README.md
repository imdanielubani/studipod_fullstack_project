# StudiPod — Website & Early-Access Waitlist

**The Study Experience, Reimagined.**

StudiPod is a peer-to-peer collaborative learning and exam preparation platform that connects
individuals preparing for examinations to study, exchange knowledge, practise and learn together.

This repository contains the StudiPod marketing website: a one-page, animated, responsive landing
experience with a production-grade early-access waitlist backed by PostgreSQL.

---

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Bot protection (Cloudflare Turnstile)](#bot-protection-cloudflare-turnstile)
- [Rate limiting (Upstash Redis)](#rate-limiting-upstash-redis)
- [Testing](#testing)
- [Production build](#production-build)
- [Deployment](#deployment)
- [Security](#security)
- [Scripts reference](#scripts-reference)

---

## Features

**Website**

- One-page experience: Hero, The Big Idea, The Pod Experience, Waitlist and Footer, connected by a
  sticky navigation with smooth scrolling and active-section highlighting.
- Responsive mobile navigation with animated menu, focus management and Escape-to-close.
- Motion design: CSS-driven hero entrance (no hydration wait), scroll-triggered reveals, staggered
  feature cards, a scroll-linked "perspectives" diagram, hover micro-interactions and an animated
  success state — all respecting `prefers-reduced-motion`.
- Design system built on Tailwind CSS v4 tokens (StudiPod palette: `#2563EB`, `#FB7185`,
  `#172554`, `#EFF6FF`), Inter Tight with an Instrument Serif accent.
- Accessibility: semantic landmarks and heading hierarchy, skip link, visible focus states,
  labelled form fields with `aria-invalid`/`aria-describedby` errors and screen-reader announcements.
- SEO: metadata, canonical URL, Open Graph/Twitter cards with a generated social image, sitemap,
  robots.txt and Organization/WebSite structured data.
- Privacy Policy and Terms of Use routes, clearly marked as placeholders until approved content is
  supplied.

**Waitlist**

- Client-side validation (React Hook Form + Zod) for instant feedback; authoritative server-side
  validation with the same schema.
- Input normalisation (Unicode NFKC, invisible/control characters stripped, emails lower-cased).
- Duplicate protection enforced by a unique database index (race-safe).
- Rate limiting, Cloudflare Turnstile, honeypot field, same-origin checks, body size limits and
  generic error responses. See [SECURITY.md](./SECURITY.md).

## Technology stack

| Area      | Choice                                                                     |
| --------- | -------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict)                     |
| Styling   | Tailwind CSS v4 (design tokens in `src/app/globals.css`)                   |
| Motion    | Motion for React (`motion/react`, LazyMotion) + CSS keyframes              |
| Icons     | Lucide React                                                               |
| Forms     | React Hook Form + Zod                                                      |
| Database  | PostgreSQL 17, Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg`)  |
| Security  | Cloudflare Turnstile, Upstash Redis rate limiting, nonce-based CSP         |
| Testing   | Vitest (unit + integration, v8 coverage), Playwright (end-to-end)          |
| Tooling   | ESLint (flat config), Prettier (+ Tailwind plugin), GitHub Actions, CodeQL |

## Project structure

```
studipod_website/
├── design/brand/              # Source logo artwork (not served)
├── prisma/
│   ├── schema.prisma          # WaitlistEntry model + status enum
│   ├── migrations/            # SQL migrations (incl. CHECK constraints)
│   └── sql/least-privilege-role.sql
├── public/logo/               # Optimised wordmark
├── scripts/generate-brand-assets.mjs
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Fonts, metadata, CSP nonce, providers
│   │   ├── page.tsx           # One-page landing composition
│   │   ├── api/waitlist/route.ts
│   │   ├── privacy-policy/ · terms/
│   │   ├── error.tsx · global-error.tsx · not-found.tsx · loading.tsx
│   │   ├── opengraph-image.tsx · robots.ts · sitemap.ts · icon.svg
│   │   └── globals.css        # Design tokens
│   ├── components/
│   │   ├── layout/            # Navbar, mobile menu, footer, legal shell
│   │   ├── sections/          # Hero, Big Idea, Pod Experience, Waitlist
│   │   ├── features/          # Feature card + illustrations
│   │   ├── waitlist/          # Form + success state
│   │   ├── ui/                # Button, Input, Container, Logo, headings
│   │   ├── animations/        # Motion provider, Reveal, FadeIn
│   │   └── seo/               # JSON-LD
│   ├── config/                # Site, navigation and feature content
│   ├── hooks/                 # useScrolled/useActiveSection, useMediaQuery
│   ├── lib/
│   │   ├── api/               # Request/response helpers
│   │   ├── security/          # CSP/headers, rate limit, Turnstile, origin, sanitise
│   │   ├── validations/       # Shared Zod schema
│   │   ├── waitlist/          # Service + repository
│   │   └── env.ts · prisma.ts · logger.ts · utils.ts · constants.ts
│   ├── types/
│   └── proxy.ts               # Per-request CSP nonce
├── tests/{unit,integration,e2e}/
├── docker-compose.yml         # Local PostgreSQL
├── .env.example
└── SECURITY.md
```

> The GitHub Actions workflows live at the repository root in `../.github/` because GitHub only
> reads workflows from there.

## Prerequisites

- **Node.js ≥ 22.12** (Node 24 recommended) and npm 10+
- **PostgreSQL 17** — locally via Docker (`docker compose`) or any managed provider
- For production: an **Upstash Redis** database and a **Cloudflare Turnstile** widget

## Getting started

```bash
cd studipod_website
npm install                      # also runs `prisma generate`
cp .env.example .env             # then edit values as needed
npm run db:up                    # start local PostgreSQL (Docker) on 127.0.0.1:5433
npx prisma migrate deploy        # create the waitlist table
npm run dev                      # http://localhost:3000
```

With the default `.env` the waitlist works locally without Turnstile or Redis (an in-memory rate
limiter is used). Submissions are stored in the local database; inspect them with
`npm run db:studio`.

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env`. Anything prefixed `NEXT_PUBLIC_` is visible in
the browser — never put secrets there.

| Variable                          | Required      | Purpose                                                               |
| --------------------------------- | ------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`            | Production    | Canonical URL for metadata, sitemap, origin and Turnstile host checks |
| `DATABASE_URL`                    | Yes           | Runtime PostgreSQL connection (pooled URL is fine)                    |
| `DIRECT_URL`                      | With a pooler | Direct connection used by `prisma migrate`                            |
| `CLOUDFLARE_TURNSTILE_SITE_KEY`   | Production    | Public Turnstile site key (rendered in the page)                      |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | Production    | **Secret**, server-only; enables server-side token verification       |
| `UPSTASH_REDIS_REST_URL`          | Production    | Distributed rate limiting (HTTPS URL)                                 |
| `UPSTASH_REDIS_REST_TOKEN`        | Production    | **Secret**, Upstash REST token                                        |
| `NEXT_PUBLIC_INSTAGRAM_URL`       | Optional      | Footer link; shown as "Soon" until set                                |
| `NEXT_PUBLIC_LINKEDIN_URL`        | Optional      | Footer link; shown as "Soon" until set                                |
| `NEXT_PUBLIC_CONTACT_EMAIL`       | Optional      | Footer "Contact" / "Contact Us" mailto link                           |
| `NEXT_PUBLIC_FAQ_URL`             | Optional      | Footer "FAQs" link                                                    |

Server variables are validated with Zod on first use (`src/lib/env.ts`); misconfiguration fails
fast with the variable **name** only, never its value. `NEXT_PUBLIC_*` values and the Turnstile site
key are read at build time, so rebuild after changing them.

## Database

Schema: `prisma/schema.prisma` → table `waitlist_entries` (`id` UUIDv7, `full_name`, `email`
unique, `examination_category`, `status`, `created_at`, `updated_at`), with indexes for invitation
batching and database-level `CHECK` constraints.

```bash
npm run db:up            # local PostgreSQL via Docker
npm run db:migrate       # create a new migration during development (prisma migrate dev)
npm run db:deploy        # apply committed migrations (CI / production)
npm run db:studio        # browse data
npm run db:down          # stop the local database
```

**Production database role.** Run migrations with an owner role (`DIRECT_URL`), and give the
running application a least-privilege role (`DATABASE_URL`) created with
[`prisma/sql/least-privilege-role.sql`](./prisma/sql/least-privilege-role.sql): it can only insert
registrations and read back the generated id. Replace the password placeholder with a secret from
your secret manager before running it.

## Bot protection (Cloudflare Turnstile)

1. In the Cloudflare dashboard open **Turnstile → Add widget**, add your production hostname (and
   any preview hostnames), and choose **Managed** mode.
2. Set `CLOUDFLARE_TURNSTILE_SITE_KEY` and `CLOUDFLARE_TURNSTILE_SECRET_KEY` in your hosting
   provider's environment settings and rebuild.
3. The widget renders in interaction-only mode (most visitors never see a challenge). The server
   verifies each single-use token with Cloudflare, checks the `waitlist` action and, in production,
   the hostname. When the secret is not set, verification is skipped (intended for local
   development only).

For automated testing Cloudflare publishes dedicated test keys; use them only in non-production
environments.

## Rate limiting (Upstash Redis)

1. Create a Redis database at [upstash.com](https://upstash.com) (pick a region near your app).
2. Copy the **REST URL** and **REST token** into `UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN`.
3. Submissions are limited to 5 per 10 minutes per client (sliding window). Keys are SHA-256
   hashes of the client IP — raw IPs are never stored.

Without Upstash an in-memory limiter is used. That is fine locally but **not** in production:
serverless and multi-instance deployments do not share memory, so a production deployment without
Upstash logs an error.

## Testing

```bash
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test             # Vitest: unit + integration (needs the database)
npm run test:coverage    # with coverage (80% thresholds)
npm run test:e2e         # Playwright (needs `npm run build` and the database)
npm audit                # dependency vulnerabilities
```

- **Unit tests** (`tests/unit`): validation, normalisation, rate limiting, CSP/headers, origin
  checks, Turnstile verification, API helpers, client and configuration.
- **Integration tests** (`tests/integration`): the real `POST /api/waitlist` handler against
  PostgreSQL — success, invalid input, duplicates (including concurrent submissions), rate limits,
  bot verification failures and database errors.
- **End-to-end tests** (`tests/e2e`): navigation, mobile menu, hero CTA, section scrolling,
  waitlist success/error/loading states, responsive layouts, security headers and CSP. Any browser
  console error (including CSP violations) fails a test. First-time setup:
  `npx playwright install chromium`.

## Production build

```bash
npm run build            # prisma generate && next build
npm run start            # serve the production build
```

Pages are rendered per request because the Content-Security-Policy uses a fresh nonce for every
response.

## Deployment

The app is a standard Next.js Node.js application. A typical setup:

1. **Database** — create a managed PostgreSQL 17 database (e.g. Neon, Supabase, RDS). Use the
   pooled connection string for `DATABASE_URL` and the direct one for `DIRECT_URL`.
2. **Hosting** — e.g. Vercel: import the repository and set the **Root Directory** to
   `studipod_website`. Any Node.js host that runs `npm run build` and `npm run start` also works.
3. **Environment** — add every variable from the table above to the host's encrypted environment
   settings (never to the repository).
4. **Migrations** — run `npx prisma migrate deploy` against production (from CI or a release step)
   using the owner role, then apply `prisma/sql/least-privilege-role.sql` once.
5. **HTTPS** — serve only over HTTPS; HSTS is sent in production.
6. **Verify** — submit the waitlist form on the deployed site, confirm the row in the database, and
   check response headers (`Content-Security-Policy`, `Strict-Transport-Security`).

## Security

Security design, threat model, known limitations and the vulnerability reporting process are
documented in [SECURITY.md](./SECURITY.md). No website can be guaranteed immune to attack; the
controls here reduce the attack surface and limit impact.

## Scripts reference

| Script                                                                 | Description                                     |
| ---------------------------------------------------------------------- | ----------------------------------------------- |
| `dev`                                                                  | Development server                              |
| `build` / `start`                                                      | Production build / serve                        |
| `lint` / `lint:fix`                                                    | ESLint                                          |
| `format` / `format:check`                                              | Prettier                                        |
| `typecheck`                                                            | TypeScript                                      |
| `test`, `test:unit`, `test:integration`, `test:coverage`, `test:watch` | Vitest                                          |
| `test:e2e`                                                             | Playwright                                      |
| `db:up` / `db:down`                                                    | Local PostgreSQL via Docker                     |
| `db:generate`, `db:migrate`, `db:deploy`, `db:studio`                  | Prisma                                          |
| `brand:assets`                                                         | Regenerate logo/favicon assets from the sources |

---

© 2026 StudiPod. All rights reserved.
