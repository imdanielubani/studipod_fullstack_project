# Docker image

The webapp ships as one image built from the root `Dockerfile` (build context: this folder).

## Stages

| Stage     | Does                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------- |
| `base`    | Node.js 22 slim (Debian trixie) with pnpm 12                                                   |
| `deps`    | `pnpm install --frozen-lockfile` with a BuildKit cache for the pnpm store                      |
| `build`   | Receives `NEXT_PUBLIC_*` build arguments; runs `pnpm build` (Next.js, then the service worker) |
| `runtime` | Copies only `.next/standalone`, `.next/static` and `public`; runs as `node`                    |

The runtime image contains no source code, dev dependencies, tests, docs or `.env` files.

## Health check

`GET /api/health` → `200 {"status":"ok"}` with `Cache-Control: no-store`. It reports only
that the Next.js server is serving requests and does not call the backend, so an API outage
never restarts the webapp. The image `HEALTHCHECK` calls it every 15 seconds (3 retries,
20-second start period) with Node's built-in `fetch`, so no `curl` is needed in the image.

## Local production-like run

```bash
cp .env.development.example .env.local
docker compose --env-file .env.local up --build
curl http://localhost:3100/api/health
```

Compose runs the container read-only with `no-new-privileges`, a tmpfs for
`/app/.next/cache`, and binds only to `127.0.0.1:3100`.

## Hardening notes

- Non-root user (`node`), read-only root filesystem in Compose, no secrets in the image.
- The base image tag is pinned (`ARG NODE_IMAGE`); update it deliberately and rebuild.
- `docker build` also runs in CI so a broken image fails before deployment.
