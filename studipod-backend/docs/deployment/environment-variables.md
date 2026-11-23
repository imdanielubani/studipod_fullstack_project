# Environment variables

| File                       | Purpose                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `.env.example`             | Complete reference of every variable                               |
| `.env.development.example` | Working local values matching `docker-compose.yml`; copy to `.env` |
| `.env.production.example`  | Production and staging shape; values are entered in Dokploy        |

Configuration is read once at startup by the typed loaders in `src/config/` and injected through `ConfigService` (for example `config.getOrThrow('jwt.candidate.accessSecret')`). Code outside `src/config/` must not read `process.env` directly. In `staging` and `production` (`APP_ENV`) the `.env` file is ignored and only the container environment is used.

Startup validation (fail fast when a required secret is missing or too short in staging or production) is added with the first module that consumes these values.

## Reference

Legend: **S** = secret (unique per environment, never logged).

### Application (`app`)

| Variable                                                            | Default                 | Description                                              |
| ------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------- |
| `NODE_ENV`                                                          | `development`           | Node/library behaviour (`production` in deployed images) |
| `APP_ENV`                                                           | `development`           | `development`, `test`, `staging` or `production`         |
| `HOST` / `PORT`                                                     | `0.0.0.0` / `3000`      | API listen address                                       |
| `WS_PORT`                                                           | `3001`                  | WebSocket gateway port                                   |
| `API_PREFIX` / `API_VERSION`                                        | `api` / `1`             | Routes are served under `/api/v1`                        |
| `APP_PUBLIC_URL`                                                    | `http://localhost:3000` | Public API URL (links in emails, webhooks)               |
| `WEBAPP_URL` / `ADMIN_DASHBOARD_URL`                                | local ports             | Client URLs used in emails and redirects                 |
| `CORS_ALLOWED_ORIGINS`                                              | empty                   | Comma-separated exact origins                            |
| `TRUST_PROXY_HOPS`                                                  | `0`                     | Trusted proxy hops; `2` behind Cloudflare and Traefik    |
| `LOG_LEVEL`                                                         | `info`                  | Pino log level                                           |
| `SWAGGER_ENABLED`                                                   | `false`                 | Serve OpenAPI UI at `/api/docs`                          |
| `RATE_LIMIT_TTL_SECONDS` / `RATE_LIMIT_MAX` / `RATE_LIMIT_AUTH_MAX` | `60` / `100` / `10`     | Throttling window and limits                             |
| `ARGON2_MEMORY_KIB` / `ARGON2_TIME_COST` / `ARGON2_PARALLELISM`     | `19456` / `2` / `1`     | Argon2id cost parameters                                 |

### Database (`database`)

| Variable                                                    | Description                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` **S** / `POSTGRES_DB` | Container bootstrap credentials                                                                                                                                                                                                                                                                       |
| `DATABASE_URL` **S**                                        | Application connection (PgBouncer `studipod-pgbouncer:6432` in production)                                                                                                                                                                                                                            |
| `DIRECT_DATABASE_URL` **S**                                 | Direct PostgreSQL connection for Prisma Migrate (`studipod-postgres:5432`)                                                                                                                                                                                                                            |
| `DATABASE_POOL_MAX`                                         | Max connections per process (default 10)                                                                                                                                                                                                                                                              |
| `DATABASE_STATEMENT_TIMEOUT_MS`                             | Per-statement timeout (default 15000). Applied server-side with `ALTER ROLE ... SET statement_timeout`, never as a client startup parameter (PgBouncer rejects those). Applied server-side with `ALTER ROLE ... SET statement_timeout`, never as a client startup parameter (PgBouncer rejects those) |

### Redis / Valkey (`redis`)

| Variable               | Description                                  |
| ---------------------- | -------------------------------------------- |
| `REDIS_PASSWORD` **S** | Valkey `requirepass`                         |
| `REDIS_URL` **S**      | `redis://:<password>@studipod-valkey:6379/0` |
| `REDIS_KEY_PREFIX`     | Cache key prefix (`studipod:`)               |
| `BULLMQ_PREFIX`        | Queue key prefix (`studipod:queue`)          |

### JWT and cookies (`jwt`)

| Variable                                                   | Description                            |
| ---------------------------------------------------------- | -------------------------------------- |
| `JWT_ISSUER`                                               | `iss` claim                            |
| `JWT_CANDIDATE_AUDIENCE` / `JWT_ADMIN_AUDIENCE`            | `aud` claims per realm                 |
| `JWT_ACCESS_SECRET` **S** / `JWT_ACCESS_TTL`               | Candidate access tokens (default 15m)  |
| `JWT_REFRESH_SECRET` **S** / `JWT_REFRESH_TTL`             | Candidate refresh tokens (default 30d) |
| `JWT_ADMIN_ACCESS_SECRET` **S** / `JWT_ADMIN_ACCESS_TTL`   | Admin access tokens (default 10m)      |
| `JWT_ADMIN_REFRESH_SECRET` **S** / `JWT_ADMIN_REFRESH_TTL` | Admin refresh tokens (default 12h)     |
| `COOKIE_SECRET` **S**                                      | Signs the refresh-token cookie         |

### Storage (`storage`)

| Variable                                          | Description                                          |
| ------------------------------------------------- | ---------------------------------------------------- |
| `R2_ACCOUNT_ID`                                   | Cloudflare account ID (derives the endpoint)         |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` **S** | R2 API token scoped to this environment's buckets    |
| `R2_ENDPOINT`                                     | Optional endpoint override                           |
| `R2_PRIVATE_BUCKET` / `R2_PUBLIC_BUCKET`          | Bucket names                                         |
| `R2_PUBLIC_BASE_URL`                              | Public bucket custom domain (`https://cdn.<domain>`) |
| `STORAGE_SIGNED_URL_TTL_SECONDS`                  | Presigned URL lifetime (default 300)                 |
| `STORAGE_MAX_UPLOAD_BYTES`                        | Max upload size (default 10 MiB)                     |

### Payments, email, video, push

| Variable                                                                       | Namespace | Description                               |
| ------------------------------------------------------------------------------ | --------- | ----------------------------------------- |
| `STRIPE_SECRET_KEY` **S**                                                      | `payment` | Test key outside production               |
| `STRIPE_WEBHOOK_SECRET` **S**                                                  | `payment` | Webhook signing secret                    |
| `RESEND_API_KEY` **S**                                                         | `email`   | Resend API key                            |
| `RESEND_WEBHOOK_SECRET` **S**                                                  | `email`   | Resend webhook signing secret             |
| `EMAIL_FROM` / `EMAIL_REPLY_TO`                                                | `email`   | Sender identity                           |
| `LIVEKIT_URL`                                                                  | `video`   | `wss://<project>.livekit.cloud`           |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` **S**                                 | `video`   | Token signing credentials                 |
| `LIVEKIT_TOKEN_TTL_SECONDS`                                                    | `video`   | Participant token lifetime (default 3600) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` **S** / `VAPID_SUBJECT`               | `push`    | Web Push keys                             |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` **S** | `push`    | FCM service account fields                |

### Deployment only (Dokploy compose)

| Variable        | Description                               |
| --------------- | ----------------------------------------- |
| `API_DOMAIN`    | Hostname for the API Traefik router       |
| `WS_DOMAIN`     | Hostname for the WebSocket Traefik router |
| `BACKEND_IMAGE` | Optional prebuilt image tag               |
