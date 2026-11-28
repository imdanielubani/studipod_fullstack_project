# Environment variables

| File                       | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `.env.example`             | Reference of every variable with explanations   |
| `.env.development.example` | Local defaults; copy to `.env.local`            |
| `.env.production.example`  | Production shape; values are entered in Dokploy |

Real `.env*` files are git-ignored and excluded from the Docker build context.

## Public build-time variables

Inlined into the browser bundle by `next build`. **Public by design: never put a secret in a
`NEXT_PUBLIC_*` variable.** Changing one requires a rebuild. Validated by `src/config/env.ts`.

| Variable                  | Local                          | Production                        | Purpose                   |
| ------------------------- | ------------------------------ | --------------------------------- | ------------------------- |
| `NEXT_PUBLIC_APP_URL`     | `http://localhost:3100`        | `https://app.studipod.com`        | This app's public origin  |
| `NEXT_PUBLIC_API_URL`     | `http://localhost:3000/api/v1` | `https://api.studipod.com/api/v1` | REST API base (versioned) |
| `NEXT_PUBLIC_WS_URL`      | `ws://localhost:3001`          | `wss://ws.studipod.com`           | Socket.IO gateway         |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit Cloud dev project      | LiveKit Cloud production project  | Video room connection     |

Staging uses the same keys with staging hosts (for example `https://app.staging.studipod.com`,
`https://api.staging.studipod.com/api/v1`).

## Runtime variables (server only)

| Variable                  | Default   | Purpose                               |
| ------------------------- | --------- | ------------------------------------- |
| `PORT`                    | `3000`    | Port inside the container             |
| `HOSTNAME`                | `0.0.0.0` | Bind address of the standalone server |
| `NEXT_TELEMETRY_DISABLED` | `1`       | Disable Next.js telemetry             |

## What never goes here

LiveKit API key or secret, Stripe secret or webhook keys, JWT or cookie secrets, R2
credentials, the VAPID private key, database or Valkey URLs. They belong to
`studipod-backend`. LiveKit access tokens are requested from the backend per session.

## Backend settings that must match

| Backend variable       | Must contain                            |
| ---------------------- | --------------------------------------- |
| `CORS_ALLOWED_ORIGINS` | `NEXT_PUBLIC_APP_URL` (exact origin)    |
| `WEBAPP_URL`           | `NEXT_PUBLIC_APP_URL` (links in emails) |
