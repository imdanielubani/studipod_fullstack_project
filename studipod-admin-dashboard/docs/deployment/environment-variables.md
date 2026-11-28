# Environment variables

## Files

| File                       | Tracked | Purpose                                         |
| -------------------------- | ------- | ----------------------------------------------- |
| `.env.example`             | Yes     | Reference for every variable, with explanations |
| `.env.development.example` | Yes     | Local defaults; copy to `.env.local`            |
| `.env.production.example`  | Yes     | Production values for Dokploy                   |
| `.env.local`, `.env.*`     | **No**  | Real values; git-ignored and docker-ignored     |

## Variables

| Variable                          | Scope            | Set at     | Required | Description                                                                         |
| --------------------------------- | ---------------- | ---------- | -------- | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`             | Browser + server | Build time | Yes      | Public origin of the dashboard, no trailing slash                                   |
| `NEXT_PUBLIC_API_URL`             | Browser + server | Build time | Yes      | REST base including `/api/v1`, no trailing slash                                    |
| `NEXT_PUBLIC_WS_URL`              | Browser + server | Build time | Yes      | Socket.IO endpoint, `ws://` or `wss://`                                             |
| `NEXT_PUBLIC_WEBAPP_URL`          | Browser + server | Build time | No       | Candidate web app, linked from "Access denied"; hidden when unset                   |
| `NEXT_PUBLIC_ADMIN_SUPPORT_EMAIL` | Browser + server | Build time | No       | Super Admin mailbox for "Contact a Super Admin"; hidden when unset                  |
| `NEXT_PUBLIC_AUTH_MOCK`           | Browser          | Build time | No       | `true` uses the in-memory auth mock; development builds only, ignored in production |
| `PORT`                            | Server           | Runtime    | No       | Listening port (image default `3000`; local dev `3100`)                             |
| `HOSTNAME`                        | Server           | Runtime    | No       | Bind address (image default `0.0.0.0`)                                              |
| `NEXT_TELEMETRY_DISABLED`         | Build + server   | Both       | No       | `1` disables Next.js telemetry                                                      |

## Rules

- **`NEXT_PUBLIC_*` values are public.** Next.js inlines them into the JavaScript sent to
  every visitor. They hold URLs only, never keys, tokens or passwords.
- **They are build-time values.** In Docker and Dokploy they are passed as **build
  arguments**. Changing one requires a rebuild and redeploy, not only a restart.
- **The dashboard has no secrets.** If a feature appears to need one (a payment key, an
  email key, a signing secret), the work belongs in `studipod-backend`.
- Validation: `src/config/env.ts` validates the public variables with Zod and throws a
  clear error naming the invalid keys.
- New variables are added to all three example files and to this table in the same change.

## Per environment

| Environment | `NEXT_PUBLIC_APP_URL`                      | `NEXT_PUBLIC_API_URL`                     | `NEXT_PUBLIC_WS_URL`            |
| ----------- | ------------------------------------------ | ----------------------------------------- | ------------------------------- |
| Local       | `http://localhost:3100`                    | `http://localhost:3000/api/v1`            | `ws://localhost:3001`           |
| Staging     | `https://stuadminapp.staging.studipod.com` | `https://api.staging.studipod.com/api/v1` | `wss://ws.staging.studipod.com` |
| Production  | `https://stuadminapp.studipod.com`         | `https://api.studipod.com/api/v1`         | `wss://ws.studipod.com`         |

The API and WebSocket hostnames follow the backend deployment plan (`api.<domain>`,
`ws.<domain>`); confirm them when the backend domains are provisioned.
