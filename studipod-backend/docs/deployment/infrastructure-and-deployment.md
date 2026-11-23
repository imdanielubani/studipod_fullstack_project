# Infrastructure and deployment

## Target environment

| Layer          | Choice                                                        |
| -------------- | ------------------------------------------------------------- |
| Server         | Hostinger VPS, Ubuntu 24.04 LTS                               |
| Orchestration  | Dokploy (Docker + Docker Compose), Traefik managed by Dokploy |
| Edge           | Cloudflare DNS, CDN, WAF, TLS                                 |
| Object storage | Cloudflare R2                                                 |
| Video          | LiveKit Cloud (not self-hosted)                               |

Not used for the initial deployment: DigitalOcean, AWS, Vercel, Supabase, Kubernetes, Helm, Terraform.

## Files

| File                                                   | Purpose                                             |
| ------------------------------------------------------ | --------------------------------------------------- |
| `Dockerfile`                                           | Multi-stage image; targets `runtime` and `migrator` |
| `.dockerignore`                                        | Keeps secrets and non-runtime files out of builds   |
| `docker-compose.yml`                                   | Local development infrastructure                    |
| `infrastructure/dokploy/docker-compose.production.yml` | Staging and production stack                        |
| `infrastructure/docker/postgres/init/`                 | First-boot PostgreSQL extensions                    |
| `infrastructure/docker/valkey/valkey.conf`             | Valkey hardening and persistence                    |
| `infrastructure/cloudflare/`                           | DNS, TLS, WAF and R2 setup                          |
| `infrastructure/backups/`                              | PostgreSQL backup script and policy                 |
| `infrastructure/monitoring/`                           | Logging, uptime and alerting plan                   |
| `infrastructure/scripts/`                              | Secret generation, env-file check                   |

## Image

- Built from the **`studipod-backend` folder**: `docker build -t studipod-backend studipod-backend`
- One image runs all three processes. The compose `command` selects the entry point (`dist/main.js`, later `dist/websocket.main.js` and `dist/worker.main.js`).
- The `migrator` target includes the Prisma CLI and runs `prisma migrate deploy`; the slim `runtime` target does not.

## Server preparation (once per VPS)

1. Ubuntu 24.04: create a non-root sudo user, SSH keys only (`PasswordAuthentication no`, `PermitRootLogin no`), enable unattended security upgrades.
2. UFW: allow SSH from administrator IPs; allow 80 and 443 **only from Cloudflare IP ranges**; deny everything else. Docker publishes no database ports, so none need opening.
3. Install Dokploy (official install script), then restrict the Dokploy dashboard to administrators (strong password, 2FA, ideally reachable only over a VPN or SSH tunnel).
4. Cloudflare: DNS records proxied, SSL mode Full (strict).

## Deploying the backend (per environment)

1. In Dokploy create a **Compose** application from this GitHub repository.
2. Compose path: `studipod-backend/infrastructure/dokploy/docker-compose.production.yml`.
3. Environment: paste every key from `.env.production.example` with real values, plus `API_DOMAIN` and `WS_DOMAIN`.
4. Domains: `api.<domain>` → service `api`, port 3000 (and `ws.<domain>` → `websocket`, port 3001 once enabled), HTTPS with Let's Encrypt.
5. Deploy. Order: `postgres`/`valkey` healthy → `migrate` completes → `pgbouncer` → `api`.
6. Verify: `https://api.<domain>` responds through Cloudflare; `docker ps` on the server shows no published 5432, 6432 or 6379 ports.

Staging and production are separate Dokploy applications with separate volumes, secrets, buckets and domains (`api.staging.<domain>`).

## Releases and rollback

- `main` deploys to production; a `staging` branch (or manual trigger) deploys to staging first.
- Database migrations are expand-then-contract so the previous image still works against the new schema. Rollback = redeploy the previous image; the database is not rolled back.
- Destructive migrations (dropping columns or tables) ship in a later release than the code that stopped using them.

## Portability

Nothing assumes one server permanently. Data services are reached by hostname from environment variables, the application is stateless, and Socket.IO scales through Valkey. To move PostgreSQL or Valkey to another host, remove the service from the compose file and change `DATABASE_URL`, `DIRECT_DATABASE_URL` or `REDIS_URL`. See [scalability](../architecture/scalability.md).
