# Deploying the Candidate Webapp with Dokploy

The webapp is deployed **independently** from the backend and the admin dashboard as one
Docker container (Next.js standalone server). It has no database, cache or volumes.

| Item           | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| Server         | Hostinger VPS, Ubuntu 24.04 LTS (shared with the backend stack) |
| Orchestration  | Dokploy, Traefik managed by Dokploy                             |
| Edge           | Cloudflare DNS, CDN, WAF                                        |
| Domain         | `app.studipod.com` (staging: `app.staging.studipod.com`)        |
| Container port | `3000`                                                          |
| Health check   | `GET /api/health` → `200 {"status":"ok"}`                       |

Server preparation (SSH hardening, UFW allowing 80/443 from Cloudflare ranges only, Dokploy
installation) is shared with the backend and described in
`studipod-backend/docs/deployment/infrastructure-and-deployment.md`.

## 1. Create the application

1. In Dokploy, create a new **Application** (not Compose) in the Studipod project.
2. Source: the GitHub repository, branch `main` (production) or `staging`.
3. Build type: **Dockerfile**.
   - Build path / context: `studipod-webapp`
   - Dockerfile path: `studipod-webapp/Dockerfile`
   - Target stage: `runtime` (default final stage)
4. Watch paths: `studipod-webapp/**`, so backend or dashboard changes do not redeploy the
   webapp. Enable auto-deploy only if every merge to the branch has passed validation.

## 2. Build arguments (public, build time)

Set these under **Build-time Arguments**. They are inlined into the browser bundle.

```text
NEXT_PUBLIC_APP_URL=https://app.studipod.com
NEXT_PUBLIC_API_URL=https://api.studipod.com/api/v1
NEXT_PUBLIC_WS_URL=wss://ws.studipod.com
NEXT_PUBLIC_LIVEKIT_URL=wss://<production-project>.livekit.cloud
```

## 3. Environment variables (runtime)

```text
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
```

No secrets are required. Do not add backend secrets to this application.

## 4. Domain and TLS

1. Dokploy → Domains: host `app.studipod.com`, container port `3000`, HTTPS on,
   certificate provider Let's Encrypt.
2. Cloudflare: proxied DNS record for `app`, SSL/TLS **Full (strict)**, cache rules from
   [Cloudflare setup](../cloudflare/README.md).
3. Backend: add `https://app.studipod.com` to `CORS_ALLOWED_ORIGINS` and set
   `WEBAPP_URL=https://app.studipod.com`, then redeploy the backend.

## 5. Health check

The image defines a Docker `HEALTHCHECK` on `/api/health` every 15 seconds. It does not call
the backend, so a backend outage does not restart the webapp. Optionally mirror it in
Dokploy (Advanced → Health check) and in uptime monitoring (alert after 3 failures).

## 6. Deploy and verify

1. Deploy and watch the build log: `pnpm install --frozen-lockfile`, `next build`, then
   "The service worker will precache … URLs".
2. Container status shows `healthy`.
3. `https://app.studipod.com/api/health` returns `200` through Cloudflare.
4. Response headers include `Strict-Transport-Security`, `X-Frame-Options: DENY`,
   `Permissions-Policy` and no `X-Powered-By`.
5. `https://app.studipod.com/sw.js` returns JavaScript with `Cache-Control: no-cache, no-store`
   and `cf-cache-status` of `BYPASS` or `DYNAMIC`.
6. Chrome DevTools → Application → Manifest shows the app as installable.
7. The browser console shows no CORS errors against the API origin.

## Releases and rollback

- Each deploy builds an immutable image from a commit. Roll back by redeploying the
  previous successful deployment in Dokploy.
- The webapp is stateless, so rollback never needs data changes. Check that the previous
  version still works with the current API version (`/api/v1` stays compatible).
- Installed PWAs pick up the new (or rolled-back) service worker on their next navigation,
  because `/sw.js` is never cached.

## Local production-like run

```bash
docker compose --env-file .env.local up --build   # from studipod-webapp/
curl http://localhost:3100/api/health
```
