# Deploying the Admin Dashboard with Dokploy

The dashboard is deployed **independently** from the backend as one Docker container
(Next.js standalone server). It has no database, cache or volumes.

| Item           | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Server         | Hostinger VPS, Ubuntu 24.04 LTS (shared with the backend stack)          |
| Orchestration  | Dokploy, Traefik managed by Dokploy                                      |
| Edge           | Cloudflare DNS, CDN, WAF, Cloudflare Access                              |
| Domain         | `stuadminapp.studipod.com` (staging: `stuadminapp.staging.studipod.com`) |
| Container port | `3000`                                                                   |
| Health check   | `GET /api/health` → `200 {"status":"ok"}`                                |

Server preparation (SSH hardening, UFW allowing 80/443 from Cloudflare ranges only,
Dokploy installation) is shared with the backend and described in
`studipod-backend/docs/deployment/infrastructure-and-deployment.md`.

## 1. Create the application

1. In Dokploy, create a new **Application** (not Compose) in the Studipod project.
2. Source: the GitHub repository, branch `main` (production) or `staging`.
3. Build type: **Dockerfile**.
   - Build path / context: `studipod-admin-dashboard`
   - Dockerfile path: `studipod-admin-dashboard/Dockerfile`
   - Target stage: `runtime` (default final stage)
4. Enable auto-deploy on push only if every merge to the branch has passed validation.
   Dokploy watch paths should be limited to `studipod-admin-dashboard/**` so backend
   changes do not redeploy the dashboard.

## 2. Build arguments (public, build time)

Set these under **Build-time Arguments**. They are inlined into the browser bundle.

```text
NEXT_PUBLIC_APP_URL=https://stuadminapp.studipod.com
NEXT_PUBLIC_API_URL=https://api.studipod.com/api/v1
NEXT_PUBLIC_WS_URL=wss://ws.studipod.com
```

## 3. Environment variables (runtime)

```text
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
```

No secrets are required. Do not add backend secrets to this application.

## 4. Domain and TLS

1. Dokploy → Domains: host `stuadminapp.studipod.com`, container port `3000`, HTTPS on,
   certificate provider Let's Encrypt.
2. Cloudflare: proxied DNS record for `stuadminapp` pointing at the VPS; SSL/TLS mode
   **Full (strict)**. See [Cloudflare setup](../cloudflare/README.md).
3. Backend: add `https://stuadminapp.studipod.com` to `CORS_ALLOWED_ORIGINS` in the backend
   application, then redeploy the backend.

## 5. Health check

The image defines a Docker `HEALTHCHECK` that calls `/api/health` every 15 seconds. The
route reports only that the dashboard server is up; it does not call the backend, so a
backend outage does not restart the dashboard. Optionally mirror it in Dokploy's
Advanced → Health check (Swarm) settings and in uptime monitoring (alert on 3 consecutive
failures).

## 6. Deploy and verify

1. Deploy and watch the build log (`pnpm install --frozen-lockfile`, `next build`).
2. Container status shows `healthy`.
3. `https://stuadminapp.studipod.com/api/health` returns `200` through Cloudflare (after
   passing Cloudflare Access).
4. Response headers include `X-Robots-Tag: noindex`, `X-Frame-Options: DENY` and no
   `X-Powered-By`.
5. The browser console shows no CORS errors against the API origin.

## Releases and rollback

- Each deploy builds an immutable image from a commit. Roll back by redeploying the
  previous successful deployment in Dokploy.
- The dashboard is stateless, so rollback never needs data changes. Check that the
  previous version still works with the current API version (`/api/v1` stays compatible).

## Local production-like run

```bash
docker compose up --build        # from studipod-admin-dashboard/
curl http://127.0.0.1:3100/api/health
```
