# Security standards

These standards apply to all backend work. Items marked **(configured)** are in place in this foundation. **(values configured)** means the settings exist but the middleware is wired up with the API. Everything else is a requirement for implementation.

Studipod stores personal data about medical candidates (identity, training background, messages, video session records, payments), and the UK GDPR applies. Treat every endpoint as internet-facing.

## Secrets and environment variables

- **(configured)** Real `.env` files are ignored by Git; only `*.example` templates are tracked. `infrastructure/scripts/check-env-files.sh` fails CI if an env file or a recognisable live key is committed.
- Production and staging secrets are entered in Dokploy only. They never appear in images (`.dockerignore` excludes `.env*`), build arguments, logs or chat tools.
- Every environment (development, staging, production) has unique secrets. Generate them with `infrastructure/scripts/generate-secrets.sh`.
- Rotate a secret immediately if it may have been exposed; rotate JWT and cookie secrets at least yearly (rotation invalidates sessions by design).
- Third-party keys use least privilege: R2 tokens scoped to one environment's buckets; Stripe restricted keys where possible; a separate R2 token for backups.
- Firebase service-account JSON is never committed; its fields are supplied as environment variables.

## JWT

- HS512 with secrets of at least 64 random characters; separate secrets for candidate access, candidate refresh, admin access, admin refresh and cookies.
- `iss` and `aud` are always set and always verified. Algorithm is pinned on verification (`algorithms: ['HS512']`), so `none` or algorithm confusion is impossible.
- Short-lived access tokens (15 min; admin 10 min). Refresh tokens are opaque, rotated on every use, stored hashed, and reuse revokes the token family.
- See [authentication architecture](authentication-architecture.md).

## Password hashing

- Argon2id (`argon2` package), memory 19 MiB, 2 iterations, parallelism 1 (configurable upward via `ARGON2_*`).
- Never log, return or store passwords in plain text, including in error messages and audit logs.

## API security

- Global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`: unknown fields are rejected, not ignored.
- Ownership checks in services for every resource access (protects against IDOR); UUIDv7 IDs are not a substitute for authorisation.
- Prisma parameterises all queries. Raw SQL is allowed only through `Prisma.sql` tagged templates, never string concatenation.
- Request body size limits (default 1 MB; uploads go directly to R2, never through the API).
- Uploads: content type and size are validated before a presigned URL is issued; images are re-encoded with Sharp (strips EXIF, neutralises polyglot files).
- Webhooks: signature verification on the raw body, timestamp tolerance, idempotency on event ID.
- Error responses never leak stack traces, SQL or vendor errors.

## Rate limiting

- **(values configured)** Defaults: `RATE_LIMIT_MAX=100` requests per `RATE_LIMIT_TTL_SECONDS=60` per client, `RATE_LIMIT_AUTH_MAX=10` for authentication routes.
- `@nestjs/throttler` with Valkey storage so limits hold across replicas.
- Authentication: per-IP and per-account limits plus progressive lockout.
- Cloudflare WAF rate-limiting rules provide the outer layer ([Cloudflare](../../infrastructure/cloudflare/README.md)).

## CORS

- **(values configured)** Exact origin allowlist from `CORS_ALLOWED_ORIGINS` (the webapp and admin dashboard origins). Never `*`, never reflected origins.
- `credentials: true` only because the refresh cookie needs it; methods and headers are allowlisted.

## HTTP security headers

Registered with `@fastify/helmet`:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (after domains are stable)
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` for API responses (the Swagger UI route gets its own relaxed policy and is disabled in production)
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cross-Origin-Resource-Policy: same-site`
- `X-Powered-By` removed.

## Database access

- **(configured)** PostgreSQL publishes no ports in production; it is attached only to the internal Docker network (`internal: true`). Local development binds to `127.0.0.1` only.
- **(configured)** SCRAM-SHA-256 authentication.
- Application connects through PgBouncer; migrations use a direct connection.
- Least-privilege roles (owner for migrations, app role for DML, read-only role for reporting): see [database architecture](../database/database-architecture.md#database-roles).
- `statement_timeout` limits runaway queries.

## Redis / Valkey access

- **(configured)** No published ports in production; internal network only; password required (`--requirepass`); `protected-mode yes`.
- **(configured)** `FLUSHALL`, `FLUSHDB` and `DEBUG` are disabled in `valkey.conf`. The password is passed on stdin, not in process arguments.
- No personal data is cached without a TTL. Keys are namespaced (`REDIS_KEY_PREFIX`).

## Audit logging

- Append-only `audit_logs` table: actor (user or administrator ID), action (`resource.action`), target type and ID, timestamp, IP address, user agent, request ID, and a structured diff of changed fields with sensitive values removed.
- Logged events: every admin mutation; role and permission changes; logins, failed logins, lockouts, password changes and resets; refresh-token reuse; subscription and payment state changes; data exports and deletions.
- The application database role cannot update or delete audit rows. Retention: 2 years, then archived.
- Admins can read audit logs (permission `audit-logs:read`) but nobody can edit them through the API.

## Logging and privacy

- Structured logs (`nestjs-pino`) with redaction of `authorization`, `cookie`, `set-cookie`, `password`, `token`, `refreshToken` and similar fields.
- Message content, video session content and payment card data are never logged. Card data never touches Studipod servers (Stripe Checkout and Elements).

## Container security

- **(configured)** Multi-stage Dockerfile; runtime image contains only `dist`, production `node_modules` and `package.json`.
- **(configured)** Runs as the non-root `node` user; base image pinned to an exact Node.js 22 version.
- **(configured)** Production compose: application containers use a `read_only` root filesystem, `tmpfs` for `/tmp`, `no-new-privileges`, `cap_drop: ALL`, memory and CPU limits and rotated logs. Data services use `no-new-privileges` (PgBouncer also drops all capabilities).
- **(configured)** PostgreSQL never logs bound query parameters (`log_parameter_max_length=0`), so slow-query logs cannot capture emails or tokens.
- **(configured)** CI builds the image and scans it with Trivy (fails on fixable high and critical vulnerabilities).
- Rebuild images at least monthly to pick up base image patches.

## Dependency security

- **(configured)** Exact versions and a single lockfile; installs in CI use `--frozen-lockfile`.
- **(configured)** pnpm blocks dependency install scripts except an explicit allowlist (`allowBuilds` in `pnpm-workspace.yaml`); telemetry install scripts are denied.
- **(configured)** CI runs `pnpm audit --audit-level=high`; the existing Dependency Review workflow blocks pull requests that add high-severity vulnerabilities; Dependabot proposes weekly updates; CodeQL scans the repository.

## GitHub Actions security

- **(configured)** Workflows declare `permissions: contents: read` by default; jobs request more only when needed.
- **(configured)** `actions/checkout` uses `persist-credentials: false`.
- **(configured)** No secrets are needed for CI; database and Redis are ephemeral service containers with throwaway passwords.
- `pull_request_target` is not used. **(configured)** Actions in `backend-ci.yml` are pinned to full commit SHAs (with the version in a comment); Dependabot updates the pins.
- Branch protection on `main`: required status checks, at least one review, no force pushes.

## Environment separation

| Concern    | Development      | Staging                                                  | Production              |
| ---------- | ---------------- | -------------------------------------------------------- | ----------------------- |
| Hosting    | Local Docker     | Separate Dokploy app                                     | Separate Dokploy app    |
| Database   | Local container  | Own PostgreSQL + volume                                  | Own PostgreSQL + volume |
| Valkey     | Local container  | Own instance                                             | Own instance            |
| R2 buckets | `studipod-dev-*` | `studipod-staging-*`                                     | `studipod-prod-*`       |
| Stripe     | Test mode        | Test mode                                                | Live mode               |
| Secrets    | Local `.env`     | Dokploy, unique                                          | Dokploy, unique         |
| Data       | Synthetic        | Synthetic only; never copies of production personal data | Real                    |
| API docs   | Enabled          | Enabled behind auth or IP allowlist                      | Disabled                |
