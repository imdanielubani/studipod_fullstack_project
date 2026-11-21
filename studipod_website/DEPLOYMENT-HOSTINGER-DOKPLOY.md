# Deploying StudiPod to a Hostinger VPS with Dokploy

Step-by-step guide for self-hosting the StudiPod website and waitlist on a
[Hostinger VPS](https://www.hostinger.com/vps-hosting) running the
[Dokploy](https://dokploy.com) panel. Dokploy builds the app from GitHub, runs it in Docker behind
Traefik, issues Let's Encrypt certificates and hosts the PostgreSQL database on the same server.

Expected time: about 45–60 minutes for a first deployment.

> Dokploy's interface changes between versions. Menu names below match recent releases; if a label
> differs slightly on your panel, look for the equivalent setting in the same area.

---

## Contents

1. [Architecture](#1-architecture)
2. [What you need](#2-what-you-need)
3. [Prepare the Hostinger VPS](#3-prepare-the-hostinger-vps)
4. [Secure the server and the Dokploy panel](#4-secure-the-server-and-the-dokploy-panel)
5. [Point your domain at the VPS](#5-point-your-domain-at-the-vps)
6. [Create the project, PostgreSQL and Redis](#6-create-the-project-postgresql-and-redis)
7. [Create the external services (Turnstile, optional Upstash)](#7-create-the-external-services-turnstile-optional-upstash)
8. [Create the application](#8-create-the-application)
9. [Configure environment variables](#9-configure-environment-variables)
10. [Database migrations](#10-database-migrations)
11. [Deploy and attach the domain](#11-deploy-and-attach-the-domain)
12. [Create the least-privilege database role](#12-create-the-least-privilege-database-role)
13. [Verify the deployment](#13-verify-the-deployment)
14. [Backups, updates and rollbacks](#14-backups-updates-and-rollbacks)
15. [Troubleshooting](#15-troubleshooting)
16. [Appendix: Dockerfile build option](#appendix-dockerfile-build-option)

---

## 1. Architecture

```
Visitor ──HTTPS──▶ Hostinger VPS
                    ├─ Traefik (managed by Dokploy) — TLS (Let's Encrypt), ports 80/443
                    │    └─▶ StudiPod app container (Next.js, port 3000)
                    │            ├─▶ PostgreSQL container (internal Docker network only)
                    │            └─▶ Redis container — rate limiting (internal network only)
                    └─ Dokploy panel (admin only)

App ──HTTPS──▶ Cloudflare Turnstile (bot verification)
```

PostgreSQL and Redis are **never** exposed to the internet — only the app container can reach
them.

---

## 2. What you need

| Requirement        | Notes                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hostinger VPS      | **KVM 2 (2 vCPU / 8 GB RAM) recommended.** KVM 1 (4 GB) works if you add swap (§3.3) — the Next.js build needs about 2 GB of memory while it runs |
| Domain name        | e.g. `studipod.com`, with access to its DNS settings                                                                                              |
| GitHub access      | to `imdanielubani/studipod_fullstack_project`                                                                                                     |
| Cloudflare account | Free — for a Turnstile widget (**required in production**)                                                                                        |
| Redis              | A Redis service in Dokploy on the same VPS (§6.2) — no external account needed. Upstash is an optional alternative (§7.2)                         |
| SSH client         | Built into Windows Terminal, macOS and Linux                                                                                                      |
| Password manager   | To generate and store the database and panel passwords                                                                                            |

> **Important:** the Next.js app lives in the `studipod_website/` sub-folder of the repository.
> Dokploy must be told this (the **Build Path**, §8), otherwise the build will fail.

---

## 3. Prepare the Hostinger VPS

### 3.1 Install Dokploy

**New VPS:** during setup, choose the **Dokploy** template (hPanel: _VPS → OS & Panel → Operating
System → Applications / Panels → Dokploy_). It installs Ubuntu with Docker and Dokploy
preconfigured.

**Existing VPS:** reinstall it with the Dokploy template from the same menu (this **erases** the
server), or install Dokploy on a fresh Ubuntu 22.04/24.04 over SSH with the official installer:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

### 3.2 Create the Dokploy admin account — immediately

Open `http://YOUR_VPS_IP:3000` in your browser and **create the admin account straight away** —
the first person to open this page becomes the administrator. Use a strong, unique password from
your password manager, and enable two-factor authentication in your Dokploy profile once logged in.

### 3.3 Add swap (recommended on 4 GB plans)

Connect over SSH (`ssh root@YOUR_VPS_IP`) and add 4 GB of swap so builds cannot run out of memory:

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h   # the Swap line should show 4.0Gi
```

---

## 4. Secure the server and the Dokploy panel

1. **SSH keys instead of passwords.** In hPanel (_VPS → Settings → SSH keys_) add your public key,
   confirm you can log in with it, then disable password login:

   ```bash
   sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
   systemctl restart ssh
   ```

2. **Automatic security updates:**

   ```bash
   apt update && apt install -y unattended-upgrades
   dpkg-reconfigure -f noninteractive unattended-upgrades
   ```

3. **Firewall — use Hostinger's firewall, not only UFW.** Docker publishes container ports directly
   through iptables, which **bypasses UFW**. In hPanel open _VPS → Security → Firewall_, create a
   firewall and attach it to the VPS with these inbound rules:

   | Port | Protocol | Source                                      | Purpose                    |
   | ---- | -------- | ------------------------------------------- | -------------------------- |
   | 22   | TCP      | Your IP address (or anywhere if it changes) | SSH                        |
   | 80   | TCP      | Anywhere                                    | HTTP → redirected to HTTPS |
   | 443  | TCP      | Anywhere                                    | HTTPS                      |
   | 3000 | TCP      | Your IP address — **remove after step 4.4** | Dokploy panel (temporary)  |

   Everything else (including PostgreSQL port 5432) stays closed.

4. **Put the panel behind HTTPS** once DNS is ready (§5): in Dokploy open _Settings → Web Server_
   (or _Server → Domain_), set the panel domain to e.g. `panel.studipod.com`, enable HTTPS with
   Let's Encrypt, then reach the panel at `https://panel.studipod.com` and **delete the port 3000
   rule** from the Hostinger firewall.

---

## 5. Point your domain at the VPS

At your DNS provider (Hostinger's DNS zone editor or wherever the domain is managed) create:

| Type | Name    | Value         | Purpose                              |
| ---- | ------- | ------------- | ------------------------------------ |
| A    | `@`     | `YOUR_VPS_IP` | `studipod.com`                       |
| A    | `www`   | `YOUR_VPS_IP` | `www.studipod.com`                   |
| A    | `panel` | `YOUR_VPS_IP` | Dokploy panel (`panel.studipod.com`) |

Add `AAAA` records too if your VPS has an IPv6 address. Wait until `nslookup studipod.com` returns
your VPS IP before requesting certificates.

> **Using Cloudflare DNS?** Set these records to **DNS only** (grey cloud). If you enable the
> Cloudflare proxy (orange cloud), every request reaches the server from Cloudflare's IP addresses,
> so per-visitor rate limiting would group many visitors together, and Let's Encrypt HTTP
> challenges can fail. Only proxy through Cloudflare if you also configure Traefik to trust
> Cloudflare's IP ranges.

---

## 6. Create the project, PostgreSQL and Redis

### 6.1 PostgreSQL

1. Dokploy → **Projects → Create Project** → name it `StudiPod`.
2. Inside the project: **Create Service → Database → PostgreSQL**.

   | Field         | Value                                              |
   | ------------- | -------------------------------------------------- |
   | Name          | `studipod-db`                                      |
   | Database name | `studipod`                                         |
   | User          | `studipod_owner`                                   |
   | Password      | Generate a long random password (password manager) |
   | Docker image  | `postgres:17`                                      |

3. Click **Create**, then **Deploy** the database.
4. Open the database's **General / Connection** tab and copy the **Internal connection URL**. It
   looks like:

   ```
   postgresql://studipod_owner:<password>@<internal-host>:5432/studipod
   ```

   `<internal-host>` is the database's internal service name, reachable only from containers on the
   same Dokploy network.

5. **Do not** set an external port for the database. Leave it internal-only.

### 6.2 Redis (rate limiting)

The waitlist limits each visitor to 5 submissions per 10 minutes. A Redis service on the same VPS
stores these counters so they are shared and survive app redeploys.

1. Inside the `StudiPod` project: **Create Service → Database → Redis**.

   | Field        | Value                                              |
   | ------------ | -------------------------------------------------- |
   | Name         | `studipod-redis`                                   |
   | Password     | Generate a long random password (password manager) |
   | Docker image | `redis:7.4` (or Dokploy's default Redis image)     |

2. **Create**, then **Deploy**.
3. Copy the **Internal connection URL** from the Redis service page. It looks like:

   ```
   redis://default:<redis-password>@<redis-internal-host>:6379
   ```

   You will use it as `REDIS_URL` in §9.

4. **Do not** set an external port and **never** open port 6379 in the firewall. Redis must only
   be reachable from the app container, and it must always have a password.
5. No backups are needed: it only holds short-lived rate-limit counters that expire on their own.

> **Already have Redis installed directly on the VPS (outside Dokploy)?** It can be used too, but
> the Dokploy service above is simpler and safer: a host-level Redis must listen on the Docker
> network gateway (not `0.0.0.0`), have `requirepass` set, and be referenced from the container by
> the gateway IP (e.g. `redis://default:<password>@172.17.0.1:6379`).

---

## 7. Create the external services (Turnstile, optional Upstash)

### 7.1 Cloudflare Turnstile

1. Cloudflare dashboard → **Turnstile → Add widget**, name it `StudiPod waitlist`.
2. **Hostnames:** `studipod.com` and `www.studipod.com` (your real domains).
3. **Mode:** _Managed_. Copy the **Site key** and **Secret key**.

### 7.2 Upstash Redis (optional alternative)

Not needed if you created the Dokploy Redis service in §6.2. Use Upstash instead only if you prefer
a managed service: create a database at [console.upstash.com](https://console.upstash.com) and set
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (and leave `REDIS_URL` empty — when both are
set, `REDIS_URL` wins).

---

## 8. Create the application

1. In the `StudiPod` project: **Create Service → Application** → name it `studipod-web`.
2. **Provider:** GitHub. If this is the first time, follow Dokploy's prompt to install the
   **Dokploy GitHub App** and grant it access to `studipod_fullstack_project` only.
3. Select:

   | Field          | Value                                      |
   | -------------- | ------------------------------------------ |
   | Repository     | `imdanielubani/studipod_fullstack_project` |
   | Branch         | `main`                                     |
   | **Build Path** | `/studipod_website`                        |
   | Trigger        | On push (auto-deploy)                      |

4. **Build Type:** _Nixpacks_ (default). Nixpacks detects Next.js, runs `npm ci` and
   `npm run build` (which runs `prisma generate && next build`), then starts the app with
   `npm run start`. If you prefer a fully reproducible container, use the **Dockerfile** option in
   the [appendix](#appendix-dockerfile-build-option) instead.
5. **Start command** (Advanced / Run command — optional but recommended):

   ```
   npx prisma migrate deploy && npm run start
   ```

   This applies any pending database migrations each time the container starts, before the site
   begins serving traffic (§10).

6. Save. **Do not deploy yet** — add the environment variables first.

---

## 9. Configure environment variables

Open `studipod-web` → **Environment** and paste (replace every placeholder):

```dotenv
# --- Site --------------------------------------------------------------------
NEXT_PUBLIC_SITE_URL=https://studipod.com

# --- Database (internal Dokploy network) ---------------------------------------
# Runtime connection. After §12, replace this with the least-privilege role.
DATABASE_URL=postgresql://studipod_owner:<password>@<internal-host>:5432/studipod?schema=public
# Used by `prisma migrate deploy` (owner role). No pooler, so same host.
DIRECT_URL=postgresql://studipod_owner:<password>@<internal-host>:5432/studipod?schema=public

# --- Bot protection --------------------------------------------------------------
CLOUDFLARE_TURNSTILE_SITE_KEY=<turnstile site key>
CLOUDFLARE_TURNSTILE_SECRET_KEY=<turnstile secret key>

# --- Rate limiting (Dokploy Redis service, §6.2) ------------------------------------
REDIS_URL=redis://default:<redis-password>@<redis-internal-host>:6379
# Optional alternative instead of REDIS_URL (§7.2):
# UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
# UPSTASH_REDIS_REST_TOKEN=<upstash rest token>

# --- Build settings ----------------------------------------------------------------
NIXPACKS_NODE_VERSION=22
NEXT_TELEMETRY_DISABLED=1

# --- Optional footer links (leave empty to show "Soon") ------------------------------
NEXT_PUBLIC_INSTAGRAM_URL=
NEXT_PUBLIC_LINKEDIN_URL=
NEXT_PUBLIC_CONTACT_EMAIL=
NEXT_PUBLIC_FAQ_URL=
```

Notes:

- `NEXT_PUBLIC_*` values and `CLOUDFLARE_TURNSTILE_SITE_KEY` are baked in **at build time**. After
  changing them, **redeploy** (a restart is not enough). Dokploy passes the Environment tab to
  Nixpacks builds; with the Dockerfile option they must also be set as **build arguments** (see
  the appendix).
- The internal database connection stays on Docker's private network, so `sslmode` is not needed.
- **Never** put secrets in `NEXT_PUBLIC_*` variables, and never commit them to the repository.
- `NIXPACKS_NODE_VERSION=22` pins a Node.js version the project supports (≥ 22.12).

---

## 10. Database migrations

Migrations create the `waitlist_entries` table, its indexes and integrity constraints.

**Recommended (automatic):** with the start command from §8 —
`npx prisma migrate deploy && npm run start` — migrations run on every container start using
`DIRECT_URL` (the owner role). `migrate deploy` only applies migrations that have not run yet, so
repeated starts are safe.

**Manual alternative:** leave the default start command and run migrations yourself after each
deploy that adds one. Over SSH:

```bash
docker ps --format '{{.Names}}' | grep studipod-web       # find the app container name
docker exec -it <container-name> npx prisma migrate deploy
```

Expected output ends with `All migrations have been successfully applied.` (or
`No pending migrations to apply.`).

---

## 11. Deploy and attach the domain

1. `studipod-web` → **Deploy**. Follow the build in **Deployments → Logs**. A successful build ends
   with the Next.js route list (including `ƒ /api/waitlist` and `ƒ Proxy (Middleware)`), and the
   runtime log shows the migration output followed by `Ready`.
2. `studipod-web` → **Domains → Add Domain**:

   | Field          | Value          |
   | -------------- | -------------- |
   | Host           | `studipod.com` |
   | Path           | `/`            |
   | Container port | `3000`         |
   | HTTPS          | On             |
   | Certificate    | Let's Encrypt  |

   Repeat for `www.studipod.com` (or add a redirect from `www` to the apex if your Dokploy version
   offers it).

3. Wait a minute for the certificate, then open `https://studipod.com`.

---

## 12. Create the least-privilege database role

The app should not run as the database owner. This role can **only insert** sign-ups — it cannot
read names or emails, update, delete or change the schema (see
[SECURITY.md](./SECURITY.md#database-security)).

1. Generate a long random password for the new role (32+ characters).
2. Open a `psql` session in the database container — in Dokploy: database → **Terminal** /
   **Docker terminal**, or over SSH:

   ```bash
   docker ps --format '{{.Names}}' | grep studipod-db
   docker exec -it <db-container-name> psql -U studipod_owner -d studipod
   ```

3. Paste the contents of
   [`prisma/sql/least-privilege-role.sql`](./prisma/sql/least-privilege-role.sql) with
   `REPLACE_WITH_A_LONG_RANDOM_SECRET` replaced by the new password, then `\q`. **Do not save the
   password into the repository.**
4. In `studipod-web` → **Environment**, change **only** `DATABASE_URL` to use the new role:

   ```dotenv
   DATABASE_URL=postgresql://studipod_app:<new-password>@<internal-host>:5432/studipod?schema=public
   ```

   Keep `DIRECT_URL` on the owner role (migrations need it).

5. **Redeploy** (or restart) the application.

---

## 13. Verify the deployment

**Headers and SEO files** (from your computer):

```bash
curl -sI https://studipod.com | grep -iE "content-security-policy|strict-transport|x-content-type|referrer-policy|x-frame"
curl -s https://studipod.com/robots.txt
curl -s https://studipod.com/sitemap.xml
```

You should see a `Content-Security-Policy` with `'nonce-…'` and `'strict-dynamic'`,
`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` and
`X-Frame-Options: DENY`; robots.txt and the sitemap should use `https://studipod.com`.

**API protections**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://studipod.com/api/waitlist            # 405
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://studipod.com/api/waitlist \
  -H "Content-Type: text/plain" -d "x"                                                 # 415
```

**In the browser**

1. Open the site and check the browser console shows **no errors** (CSP problems appear here).
2. Click **Join the Waitlist** and register with your own details → "You're on the list, …".
3. Submit the same email again → "This email address is already on the waitlist."
4. Confirm the row in the database (as the owner):

   ```bash
   docker exec -it <db-container-name> psql -U studipod_owner -d studipod \
     -c "SELECT full_name, email, status, created_at FROM waitlist_entries ORDER BY created_at DESC LIMIT 5;"
   ```

**Logs:** `studipod-web` → **Logs**. There should be no `rate_limit.distributed_store_missing`,
`rate_limit.redis_connection_error`, `rate_limit.store_unavailable` or
`waitlist.registration_failed` entries.

**Rate limiting uses Redis:** after a test submission, check a counter key exists (it expires
after 10 minutes):

```bash
docker exec -it <redis-container-name> redis-cli -a '<redis-password>' --no-auth-warning \
  --scan --pattern 'studipod:ratelimit:waitlist:*'
```

**Security checks**

- `https://panel.studipod.com` loads with a valid certificate, and `http://YOUR_VPS_IP:3000` no
  longer responds.
- From your computer, `nc -vz YOUR_VPS_IP 5432` and `nc -vz YOUR_VPS_IP 6379` both fail
  (PostgreSQL and Redis are not exposed).

---

## 14. Backups, updates and rollbacks

**Database backups (essential)**

1. Dokploy → _Settings → S3 Destinations_ → add an S3-compatible bucket (e.g. Cloudflare R2,
   Backblaze B2, AWS S3) with credentials limited to that bucket.
2. `studipod-db` → **Backups** → create a scheduled backup (e.g. daily at 03:00) to that
   destination, with a retention count.
3. Test a restore occasionally.
4. Optionally enable **Hostinger VPS snapshots / automatic backups** in hPanel as a second layer.

**Updates**

- **Code:** push or merge to `main` → Dokploy rebuilds and redeploys automatically. Require the
  GitHub CI checks to pass before merging (branch protection), so only green code is deployed.
- **Environment changes:** edit **Environment**, then **Redeploy**.
- **Dokploy itself:** update from _Settings_ when new versions are released.
- **Server:** unattended-upgrades applies security patches; reboot occasionally for kernel updates
  during a quiet period.

**Rollbacks**

- Use **Deployments → Rollback** on a previous successful deployment if your Dokploy version
  offers it, or revert the commit on GitHub (`git revert <sha>`) and push — Dokploy redeploys the
  previous code.
- Database migrations are not rolled back automatically.

**Monitoring**

- Dokploy's **Monitoring** tab shows CPU, memory and disk for the server and each service.
- Watch app logs for spikes of `waitlist.rate_limited`, `waitlist.bot_verification_failed` and
  `waitlist.registration_failed`.
- Optionally add an external uptime monitor for `https://studipod.com`.

---

## 15. Troubleshooting

| Symptom                                                                              | Likely cause and fix                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build fails: no `package.json` / Next.js not detected                                | **Build Path** is not `/studipod_website` (§8).                                                                                                                                                                                       |
| Build killed / "JavaScript heap out of memory" / exit code 137                       | Not enough RAM. Add swap (§3.3) or upgrade the VPS plan, then redeploy.                                                                                                                                                               |
| Build fails with an `engines` / Node version error                                   | Set `NIXPACKS_NODE_VERSION=22` (§9) and redeploy.                                                                                                                                                                                     |
| Container restarts; log shows `prisma: not found` / `Cannot find module 'prisma'`    | The run image does not include the Prisma CLI. Use the manual migration method (§10) with the default start command, or switch to the Dockerfile option (appendix), which includes it.                                                |
| Log shows `P1001: Can't reach database server`                                       | Wrong `<internal-host>` or the database is not running. Copy the **internal** URL from the database page; make sure the app and database are in the same Dokploy project/network.                                                     |
| Form shows "Something went wrong on our side…"; logs show `P2021`                    | The table does not exist yet — migrations did not run (§10).                                                                                                                                                                          |
| `permission denied for table waitlist_entries`                                       | The least-privilege role is missing grants — re-run the script from §12 as the owner.                                                                                                                                                 |
| Every submission fails with "We couldn't verify that you're human"                   | Turnstile hostname mismatch or wrong keys: the domain must be in the widget's hostnames, `NEXT_PUBLIC_SITE_URL` must match the domain people use, and both keys must belong to the same widget. Redeploy after changing the site key. |
| Submissions fail with "We couldn't verify your request right now" (503)              | The server cannot reach `challenges.cloudflare.com` (outbound firewall/DNS) or the secret key is invalid. Check the app logs (`turnstile.siteverify_*`).                                                                              |
| Logs show `rate_limit.redis_connection_error` / `rate_limit.store_unavailable`       | The app cannot reach Redis (wrong `<redis-internal-host>` or password, or the Redis service is stopped). Sign-ups keep working on the per-instance in-memory fallback, but fix `REDIS_URL` (§6.2, §9) and redeploy.                   |
| Many different visitors get "Too many attempts" together                             | All requests appear to come from one IP — typically the Cloudflare proxy (orange cloud) is on. Switch the DNS records to **DNS only** (§5) or configure Traefik to trust Cloudflare's IP ranges.                                      |
| Certificate not issued / browser shows "not secure"                                  | DNS does not point at the VPS yet, ports 80/443 are closed in the Hostinger firewall, or the Cloudflare proxy is on. Fix, then re-save the domain in Dokploy.                                                                         |
| Social previews or canonical URLs show `localhost`                                   | `NEXT_PUBLIC_SITE_URL` was missing at build time — set it and **redeploy**.                                                                                                                                                           |
| Browser console: "Refused to load … because it violates the Content Security Policy" | A new third-party resource was added without updating the CSP in `src/lib/security/headers.ts`. Add only the specific origin needed.                                                                                                  |

---

## Appendix: Dockerfile build option

Nixpacks needs no extra files. If you want a fully reproducible image (pinned Node version, Prisma
CLI guaranteed at runtime, non-root user), add these two files to `studipod_website/`, commit them,
and in Dokploy set **Build Type → Dockerfile** with **Dockerfile path** `Dockerfile` and the same
Build Path `/studipod_website`.

**`studipod_website/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# --- Dependencies (also runs `prisma generate` via postinstall) ---------------
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# --- Build ------------------------------------------------------------------------
FROM base AS build
# Public values are baked into the client bundle at build time.
ARG NEXT_PUBLIC_SITE_URL
ARG CLOUDFLARE_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_INSTAGRAM_URL
ARG NEXT_PUBLIC_LINKEDIN_URL
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_FAQ_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    CLOUDFLARE_TURNSTILE_SITE_KEY=$CLOUDFLARE_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_INSTAGRAM_URL=$NEXT_PUBLIC_INSTAGRAM_URL \
    NEXT_PUBLIC_LINKEDIN_URL=$NEXT_PUBLIC_LINKEDIN_URL \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_FAQ_URL=$NEXT_PUBLIC_FAQ_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Runtime ------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
# Apply pending migrations (uses DIRECT_URL), then serve.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
```

**`studipod_website/.dockerignore`**

```gitignore
node_modules
.next
coverage
test-results
playwright-report
.env
.env.*
!.env.example
*.log
```

With the Dockerfile option:

- In Dokploy, add the six public values (`NEXT_PUBLIC_SITE_URL`, `CLOUDFLARE_TURNSTILE_SITE_KEY`
  and the four optional `NEXT_PUBLIC_*` links) under **Build-time arguments**, _and_ keep all
  variables in **Environment** for runtime.
- Remove `NIXPACKS_NODE_VERSION` (the Node version is pinned in the Dockerfile) and leave the start
  command empty (the Dockerfile's `CMD` already runs migrations and starts the server).
- Secrets (database URLs, `REDIS_URL`, Turnstile secret, Upstash token) are **runtime only** — never pass them
  as build arguments, because build arguments can end up in image metadata.

---

For local development, testing and the full environment reference see [README.md](./README.md);
for the security model see [SECURITY.md](./SECURITY.md); for Vercel see
[DEPLOYMENT.md](./DEPLOYMENT.md).
