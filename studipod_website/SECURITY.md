# Security

This document describes how the StudiPod website and waitlist are protected, what the remaining
risks are, and how to report a vulnerability.

> No website can be guaranteed to be immune to attack. The controls below follow OWASP guidance to
> reduce the attack surface, make abuse expensive and limit the impact of any failure.

---

## 1. Security architecture

```
Browser ──HTTPS──▶ Next.js (Node.js)
                     │
                     ├─ src/proxy.ts ─────────── per-request CSP nonce
                     ├─ next.config.ts headers ─ HSTS, nosniff, Referrer-Policy, …
                     │
                     └─ POST /api/waitlist
                          1. Same-origin check (Sec-Fetch-Site / Origin)      → 403
                          2. Content-Type must be application/json             → 415
                          3. Rate limit (hashed IP, Upstash Redis)             → 429
                          4. Body ≤ 4 KB, enforced on the stream              → 413
                          5. Zod validation + normalisation, strict keys       → 422
                          6. Honeypot                                          → fake 201
                          7. Cloudflare Turnstile (server-side verification)   → 403/503
                          8. Prisma (parameterised) → PostgreSQL               → 201 / 409
                                                       └─ least-privilege role, CHECK constraints
```

Only the waitlist endpoint accepts input. There are no user accounts, sessions or cookies.

## 2. Implemented protections

### HTTP security headers

| Header                       | Value / behaviour                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`    | Nonce-based, generated per request (`src/proxy.ts`). `script-src 'self' 'nonce-…' 'strict-dynamic'` (no `unsafe-inline`; `unsafe-eval` only in development), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, only `challenges.cloudflare.com` may be framed or contacted, `upgrade-insecure-requests` over HTTPS |
| API CSP                      | `default-src 'none'; frame-ancestors 'none'`                                                                                                                                                                                                                                                                                                             |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains; preload` (production)                                                                                                                                                                                                                                                                                              |
| `X-Content-Type-Options`     | `nosniff`                                                                                                                                                                                                                                                                                                                                                |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                                                                                                                                                                                                                                                                                                        |
| `X-Frame-Options`            | `DENY` (legacy fallback to `frame-ancestors`)                                                                                                                                                                                                                                                                                                            |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                                                                                                                                                                                                                                                                                                            |
| `Permissions-Policy`         | Camera, microphone, geolocation, payment, USB and similar features disabled                                                                                                                                                                                                                                                                              |
| `Cache-Control` (API)        | `no-store`                                                                                                                                                                                                                                                                                                                                               |
| `X-Powered-By`               | Removed                                                                                                                                                                                                                                                                                                                                                  |

### Input and data protection

- All input is validated on the server with Zod (`src/lib/validations/waitlist.schema.ts`);
  client validation is a convenience only.
- Normalisation before validation: Unicode NFKC, control and invisible/bidi characters removed,
  whitespace collapsed, emails trimmed and lower-cased.
- Length limits (name 100, email 254, category 100) and a raw-input cap before normalisation.
- Allow-lists for names (letters in any script, spaces, hyphens, apostrophes, dots) and categories.
- The `.strict()` request schema rejects unknown keys and the repository maps fields explicitly
  (mass-assignment protection).
- Output is rendered through React (escaped). No untrusted HTML is rendered; the only
  `dangerouslySetInnerHTML` is static JSON-LD from site configuration with `<` escaped.
- External links from configuration are restricted to `http(s)` URLs.

### API security

- POST only (other methods: 405), JSON only (415), 4 KB body cap (413), malformed JSON (400).
- Same-origin enforcement using Fetch Metadata and `Origin` blocks cross-site (CSRF-style)
  submissions. The API uses no cookies, so there is no session to ride.
- A generic, consistent error envelope; internal errors return a generic 500 and are logged by
  error type/code only.
- Rate limiting: 5 requests per 10 minutes per client (sliding window), Upstash Redis in
  production; IPs are SHA-256-hashed before use as keys. `Retry-After` on 429.

### Bot and spam protection

- Cloudflare Turnstile with server-side `siteverify` (timeout, expected action, hostname in
  production, single-use tokens, idempotency key). Verification failure → 403; verifier outage →
  503 (fails closed).
- Hidden honeypot field; filled submissions receive a success-looking response and are discarded.
- Rate limiting and duplicate protection (below).

### Database security

- Prisma ORM with parameterised queries (no string-built SQL).
- A unique index on the normalised email rejects duplicates — including concurrent submissions —
  in the database itself (→ 409).
- `CHECK` constraints enforce a normalised email and non-blank name and category at the database
  level.
- Bounded connection pool with connection, statement and query timeouts.
- Least-privilege runtime role (`prisma/sql/least-privilege-role.sql`): `INSERT` on
  `waitlist_entries` plus `SELECT (id)` only — no reading of names or emails, no `UPDATE`,
  `DELETE` or DDL; a 5 s statement timeout and a connection limit. Verified against PostgreSQL 17.
- Data minimisation: only full name, email and optional category are stored. No IP addresses,
  user agents or tracking data.
- Database errors are never returned to clients.

### Secrets and configuration

- Secrets only via environment variables; `.env*` files are git-ignored (only `.env.example` is
  committed, with no real values).
- The server environment is validated on first use; error messages name variables but never print
  values.
- The Turnstile **secret** key and the Upstash token are server-only and never use `NEXT_PUBLIC_`.
- Modules touching secrets or the database import `server-only`, so bundling them into client code
  fails the build.
- Production browser source maps are disabled.

### Supply chain and CI

- `npm audit` gate (high/critical) in CI, Dependabot updates for npm and GitHub Actions, dependency
  review on pull requests, and CodeQL (`security-extended`) on push, pull requests and weekly.
- Exact dependency versions (`save-exact`), `engine-strict`, a committed lockfile and `npm ci` in
  CI.
- A high-severity ReDoS advisory (GHSA-7589-6fvf-x4pw) in the Prisma CLI's config loader is
  resolved with a scoped npm `overrides` entry pinning the patched `effect` release. The affected
  code ran only in the CLI at build/migration time.
- Workflows use read-only `contents` permissions, no persisted checkout credentials and job
  timeouts.

## 3. Threat model

| Threat                       | Example                            | Mitigations                                                                               | Residual risk                                                   |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Spam / fake sign-ups         | Scripted bulk submissions          | Turnstile, honeypot, rate limiting, validation                                            | Low–medium: determined attackers can solve challenges at a cost |
| Abuse / resource exhaustion  | Flooding the endpoint              | Rate limit before body parsing, 4 KB cap, pool limits, timeouts, platform DDoS protection | Medium: volumetric attacks must be absorbed by the host/CDN     |
| Injection (SQL)              | Malicious field values             | Prisma parameterisation, validation, least-privilege role                                 | Low                                                             |
| XSS                          | Script in a name or link           | Validation allow-lists, React escaping, strict nonce CSP                                  | Low                                                             |
| CSRF / cross-site submission | Another site posting the form      | Origin/Fetch-Metadata checks, no cookies                                                  | Low                                                             |
| Clickjacking                 | Framing the site                   | `frame-ancestors 'none'`, `X-Frame-Options: DENY`                                         | Low                                                             |
| Data exposure                | Leaking registrations or internals | No read endpoints, generic errors, runtime role cannot read PII, no PII in logs           | Low                                                             |
| Secret leakage               | Keys in code or bundle             | Env vars only, `server-only`, no `NEXT_PUBLIC_` secrets, git-ignored `.env`               | Low (depends on operational practice)                           |
| Email enumeration            | Checking whether an address exists | Rate limiting                                                                             | Accepted: the API returns 409 so people get clear feedback      |
| Dependency compromise        | Vulnerable or malicious package    | Lockfile, audit, Dependabot, dependency review, CodeQL                                    | Medium: inherent to the npm ecosystem                           |

## 4. OWASP mapping

**OWASP Top 10 (web)**

- _Broken Access Control_ — no privileged endpoints; least-privilege database role; same-origin
  checks.
- _Cryptographic Failures_ — HTTPS + HSTS; no sensitive data beyond contact details; IPs hashed.
- _Injection_ — parameterised Prisma queries; schema validation; React output encoding; CSP.
- _Insecure Design_ — layered checks ordered cheapest-first; duplicate safety enforced by the
  database.
- _Security Misconfiguration_ — hardened headers, no `X-Powered-By`, env validation, no public
  source maps.
- _Vulnerable and Outdated Components_ — audit gate, Dependabot, dependency review, CodeQL.
- _Identification and Authentication Failures_ — not applicable (no accounts).
- _Software and Data Integrity Failures_ — lockfile + `npm ci`, pinned action versions,
  least-privilege workflows.
- _Security Logging and Monitoring Failures_ — structured server logs for rate limiting, bot
  verification, honeypot hits and failures (no PII). Connect them to your host's log drain and
  alerts.
- _SSRF_ — the only outbound call is a fixed Cloudflare URL; no user-controlled URLs are fetched.

**OWASP API Security Top 10** — object/property-level authorisation (no object reads; strict
schema), unrestricted resource consumption (rate limit, size caps, timeouts), unrestricted access
to sensitive business flows (Turnstile, honeypot), security misconfiguration (headers, method and
content-type restrictions), improper inventory management (a single documented endpoint) and unsafe
consumption of APIs (Turnstile responses validated, timeouts, fail closed).

## 5. Known limitations

- **In-memory fallback rate limiter**: used when Upstash is not configured or temporarily
  unavailable. It is per-instance and therefore weaker in serverless/multi-instance environments.
  Configure Upstash in production.
- **Duplicate responses reveal registration status** (see the threat model). A uniform response
  would trade clarity for people signing up against privacy.
- **Inline style attributes are allowed by the CSP** (`style-src-attr 'unsafe-inline'`) because the
  animation library animates through the `style` attribute. Scripts remain fully
  nonce-restricted.
- **Pages are dynamically rendered** to support per-request CSP nonces (slightly higher server cost
  than static pages).
- **Turnstile is optional at runtime**: if the secret is not configured, verification is skipped.
  Always configure it in production.
- **Client IP trust**: IPs are read from proxy headers set by the hosting platform. Deploy behind a
  platform that sets or overwrites these headers (e.g. Vercel, Cloudflare).
- **No email verification / double opt-in** yet; registrations are not confirmed by email.
- **No data-retention or deletion workflow** is implemented yet, and the Privacy Policy and Terms of
  Use are placeholders. Both should be completed before collecting registrations at scale.
- **No administrative interface**: registrations are accessed directly in the database by
  authorised staff.

## 6. Deployment security requirements

Before going live:

- [ ] Serve exclusively over HTTPS with the canonical `NEXT_PUBLIC_SITE_URL`.
- [ ] Configure `CLOUDFLARE_TURNSTILE_SITE_KEY` / `CLOUDFLARE_TURNSTILE_SECRET_KEY` (production
      widget restricted to your hostnames).
- [ ] Configure `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
- [ ] Use a managed PostgreSQL with TLS; run migrations with an owner role (`DIRECT_URL`) and the
      application with the least-privilege role (`DATABASE_URL`).
- [ ] Store all secrets in the hosting provider's encrypted environment settings or a secret
      manager, never in the repository. Rotate any secret that may have been exposed.
- [ ] Restrict database network access to the application where the provider allows it.
- [ ] Enable database backups and point-in-time recovery.
- [ ] Forward server logs to monitoring and alert on spikes of `waitlist.rate_limited`,
      `waitlist.bot_verification_failed` and `waitlist.registration_failed`.
- [ ] Publish an approved Privacy Policy and Terms of Use.

### Recommended GitHub settings

- **Branch protection on `main`**: require pull requests with at least one approving review;
  require the CI checks (format/lint/types/build, unit & integration tests, end-to-end tests,
  dependency audit, CodeQL) to pass; require branches to be up to date; block force pushes and
  deletions; require conversation resolution.
- **Secret scanning and push protection**: enable under _Settings → Code security_.
- **Dependabot alerts and security updates**: enable.
- **Private vulnerability reporting**: enable under _Settings → Code security_ (used below).
- **Actions secrets**: the CI workflow needs no repository secrets (it uses an ephemeral service
  database). If deployment jobs are added, store credentials as environment-scoped Actions secrets
  with required reviewers — never in workflow files.

## 7. Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report privately through GitHub's **Report a vulnerability** button on this repository's
**Security** tab (private vulnerability reporting). Please include:

- a description of the issue and its impact,
- steps to reproduce or a proof of concept,
- the affected URLs, endpoints or files.

The maintainers will acknowledge the report, investigate, keep you informed of progress and credit
you (if you wish) once a fix is released. Please allow reasonable time for remediation before any
public disclosure, and do not access or modify other people's data, degrade the service or use
social engineering while testing.
