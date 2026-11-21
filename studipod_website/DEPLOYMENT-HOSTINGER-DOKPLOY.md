# Deploying StudiPod to a Hostinger VPS with Dokploy — Step by Step

This guide takes you from an empty Hostinger VPS to the live StudiPod website at
`https://studipod.com`, with:

- the website and waitlist (Next.js) built automatically from GitHub,
- PostgreSQL (the waitlist database) and Redis (rate limiting) on the same server,
- free HTTPS certificates,
- Cloudflare Turnstile bot protection,
- a daily email of new sign-ups to `hello@studipod.com`,
- backups.

Follow the steps **in order** — later steps depend on earlier ones. Each step ends with a
**✅ Check** so you know it worked before moving on.

**Time needed:** about 1–1½ hours the first time.

> Dokploy's screens change a little between versions. If a button name differs, look for the
> equivalent option in the same area of the screen.

---

## Overview

| Part                                                            | Steps |
| --------------------------------------------------------------- | ----- |
| [A. Before you start](#part-a--before-you-start)                | 0     |
| [B. Prepare the server](#part-b--prepare-the-server)            | 1–6   |
| [C. Create the services](#part-c--create-the-services)          | 7–11  |
| [D. Deploy the website](#part-d--deploy-the-website)            | 12–15 |
| [E. Harden and automate](#part-e--harden-and-automate)          | 16–19 |
| [F. Final checks](#part-f--final-checks)                        | 20    |
| [Updating, rollbacks and troubleshooting](#updating-the-site)   | —     |
| [Appendix: Dockerfile build](#appendix-dockerfile-build-option) | —     |

```
Visitor ──HTTPS──▶ Hostinger VPS
                    ├─ Traefik (Dokploy) — HTTPS certificates, ports 80/443
                    │    └─▶ StudiPod website container (port 3000)
                    │            ├─▶ PostgreSQL container  (private network only)
                    │            └─▶ Redis container       (private network only)
                    └─ Dokploy panel (https://panel.studipod.com, admin only)

Website ──▶ Cloudflare Turnstile (bot checks)
Website ──▶ smtp.hostinger.com (daily digest email to hello@studipod.com)
```

---

## Part A — Before you start

### Step 0 — Gather accounts and prepare a values worksheet

**You need:**

- [ ] A Hostinger VPS — **KVM 2 (8 GB RAM) recommended**; KVM 1 (4 GB) works with swap (Step 3).
- [ ] The domain `studipod.com` and access to its DNS settings.
- [ ] Access to the GitHub repository `imdanielubani/studipod_fullstack_project`.
- [ ] A free Cloudflare account (for Turnstile).
- [ ] A Hostinger email plan for `hello@studipod.com`.
- [ ] A password manager.

**Create a private note in your password manager** and fill it in as you go. Never put these
values in GitHub, chat messages or screenshots.

```text
VPS_IP                    =
DOKPLOY_ADMIN_PASSWORD    =
POSTGRES_OWNER_PASSWORD   =        (Step 8)
POSTGRES_INTERNAL_HOST    =        (Step 8)
REDIS_PASSWORD            =        (Step 9)
REDIS_INTERNAL_HOST       =        (Step 9)
TURNSTILE_SITE_KEY        =        (Step 10)
TURNSTILE_SECRET_KEY      =        (Step 10)
MAILBOX_PASSWORD          =        (Step 11, hello@studipod.com)
CRON_SECRET               =        (Step 13)
APP_DB_PASSWORD           =        (Step 16, studipod_app)
REPORTER_DB_PASSWORD      =        (Step 16, studipod_reporter)
```

> **Tip:** for database and Redis passwords use only letters and numbers (e.g. the output of
> `openssl rand -hex 24`). Symbols such as `@`, `/` or `#` break connection URLs.

---

## Part B — Prepare the server

### Step 1 — Install Dokploy on the VPS

1. Log in to **hPanel** → **VPS** → select your server.
2. Go to **OS & Panel → Operating System**.
3. Choose **Applications / Panels → Dokploy** and install it.
   > Reinstalling the OS **erases** the server. Only do this on a new or empty VPS.
4. When it finishes, copy the server's **IP address** into `VPS_IP`.

✅ **Check:** `http://VPS_IP:3000` shows the Dokploy sign-up page.

### Step 2 — Create the Dokploy admin account (immediately)

The first person to open the panel becomes its administrator, so do this straight away.

1. Open `http://VPS_IP:3000`.
2. Register with your email and a strong password (save it as `DOKPLOY_ADMIN_PASSWORD`).
3. After logging in, open your **profile** and turn on **two-factor authentication**.

✅ **Check:** you can log out and back in with 2FA.

### Step 3 — Secure the server over SSH

1. **Add your SSH key:** hPanel → **VPS → Settings → SSH keys** → add your public key.
2. Connect: `ssh root@VPS_IP` — it should log in without asking for a password.
3. Run these commands one block at a time:

   ```bash
   # Turn off password logins (keys only)
   sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
   systemctl restart ssh

   # Automatic security updates
   apt update && apt install -y unattended-upgrades
   dpkg-reconfigure -f noninteractive unattended-upgrades

   # 4 GB swap so builds never run out of memory (strongly recommended on 4 GB plans)
   fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```

4. Keep this SSH window open in case you need to undo something, and test a **second** SSH login
   in a new window before closing it.

✅ **Check:** `free -h` shows a `Swap` line of about 4.0Gi, and a new SSH session still works.

### Step 4 — Turn on Hostinger's firewall

Docker bypasses the server's own firewall (UFW), so use Hostinger's network firewall instead.

1. hPanel → **VPS → Security → Firewall** → **Create firewall** → attach it to your VPS.
2. Add these **inbound** rules (drop everything else):

   | Port | Protocol | Source                              | Why                               |
   | ---- | -------- | ----------------------------------- | --------------------------------- |
   | 22   | TCP      | Your IP (or Anywhere if it changes) | SSH                               |
   | 80   | TCP      | Anywhere                            | HTTP (redirects to HTTPS)         |
   | 443  | TCP      | Anywhere                            | HTTPS                             |
   | 3000 | TCP      | Your IP only                        | Dokploy panel — removed in Step 6 |

   Never open 5432 (PostgreSQL) or 6379 (Redis).

✅ **Check:** the Dokploy panel still opens from your computer.

### Step 5 — Point the domain at the server

At your DNS provider (hPanel → **Domains → DNS / Nameservers** if the domain is at Hostinger):

| Type | Name    | Value    |
| ---- | ------- | -------- |
| A    | `@`     | `VPS_IP` |
| A    | `www`   | `VPS_IP` |
| A    | `panel` | `VPS_IP` |

If the domain's DNS is on **Cloudflare**, set these records to **DNS only** (grey cloud). The
orange-cloud proxy would make every visitor look like the same IP to the rate limiter and can
block certificate issuing.

✅ **Check:** after a few minutes, `nslookup studipod.com` and `nslookup panel.studipod.com`
return `VPS_IP`.

### Step 6 — Put the Dokploy panel behind HTTPS

1. In Dokploy open **Settings → Web Server** (or **Server → Domain**).
2. Set the domain to `panel.studipod.com`, enable **HTTPS** with **Let's Encrypt**, save.
3. Open `https://panel.studipod.com` and log in.
4. Back in the Hostinger firewall, **delete the port 3000 rule**.

✅ **Check:** `https://panel.studipod.com` works with a padlock, and `http://VPS_IP:3000` no
longer loads.

---

## Part C — Create the services

### Step 7 — Create the project

Dokploy → **Projects → Create Project** → name: `StudiPod`.

✅ **Check:** the `StudiPod` project opens and is empty.

### Step 8 — Create the PostgreSQL database

1. In the project: **Create Service → Database → PostgreSQL**.

   | Field         | Value                                                   |
   | ------------- | ------------------------------------------------------- |
   | Name          | `studipod-db`                                           |
   | Database name | `studipod`                                              |
   | User          | `studipod_owner`                                        |
   | Password      | new random password → save as `POSTGRES_OWNER_PASSWORD` |
   | Docker image  | `postgres:17`                                           |

2. **Create**, then **Deploy**.
3. Open the database's connection details and copy the **internal host** (the service name in
   the internal connection URL) into `POSTGRES_INTERNAL_HOST`.
4. Leave **External port** empty.

✅ **Check:** the database shows as running (green) in Dokploy.

### Step 9 — Create the Redis service (rate limiting)

1. In the project: **Create Service → Database → Redis**.

   | Field        | Value                                          |
   | ------------ | ---------------------------------------------- |
   | Name         | `studipod-redis`                               |
   | Password     | new random password → save as `REDIS_PASSWORD` |
   | Docker image | `redis:7.4` (or Dokploy's default)             |

2. **Create**, then **Deploy**.
3. Copy the **internal host** from its connection details into `REDIS_INTERNAL_HOST`.
4. Leave **External port** empty. No backups are needed (it only stores short-lived counters).

✅ **Check:** Redis shows as running.

### Step 10 — Create the Cloudflare Turnstile widget (bot protection)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile → Add widget**.
2. Name: `StudiPod waitlist`. Hostnames: `studipod.com` and `www.studipod.com`.
3. Mode: **Managed** → **Create**.
4. Save the **Site key** (`TURNSTILE_SITE_KEY`) and **Secret key** (`TURNSTILE_SECRET_KEY`).

✅ **Check:** the widget is listed with both hostnames.

### Step 11 — Set up the hello@studipod.com mailbox

The daily sign-up digest is sent through this mailbox.

1. hPanel → **Emails** → make sure `hello@studipod.com` exists (create it if not), with a strong
   password → save as `MAILBOX_PASSWORD`. Turn on two-factor authentication for webmail if
   available.
2. hPanel → **Emails → DNS / Email authentication**: if the domain's DNS is **not** managed by
   Hostinger, copy the **MX, SPF, DKIM and DMARC** records shown there into your DNS provider.
3. Send a test email to `hello@studipod.com` from another address.

✅ **Check:** the test email arrives in the `hello@studipod.com` inbox (webmail).

---

## Part D — Deploy the website

### Step 12 — Create the application from GitHub

1. In the project: **Create Service → Application** → name `studipod-web`.
2. **Provider: GitHub.** If asked, install the **Dokploy GitHub App** and give it access to
   **only** `studipod_fullstack_project`.
3. Fill in:

   | Field          | Value                                      |
   | -------------- | ------------------------------------------ |
   | Repository     | `imdanielubani/studipod_fullstack_project` |
   | Branch         | `main`                                     |
   | **Build Path** | `/studipod_website` ← important            |
   | Build Type     | **Nixpacks**                               |
   | Auto deploy    | On (deploy on push)                        |

4. In **Advanced** (Run / Start command) enter:

   ```
   npx prisma migrate deploy && npm run start
   ```

   This creates/updates the database tables every time the app starts.

5. **Save** — do **not** deploy yet.

✅ **Check:** `studipod-web` appears in the project with the repository connected.

### Step 13 — Add the environment variables

1. On the VPS, generate the cron secret and save it as `CRON_SECRET`:

   ```bash
   openssl rand -hex 32
   ```

2. Open `studipod-web` → **Environment**, paste the block below and **replace every `<…>`** with
   the values from your worksheet:

   ```dotenv
   # --- Site
   NEXT_PUBLIC_SITE_URL=https://studipod.com
   NEXT_TELEMETRY_DISABLED=1
   NIXPACKS_NODE_VERSION=22

   # --- Database (owner login for now; Step 16 switches the website to a restricted login)
   DATABASE_URL=postgresql://studipod_owner:<POSTGRES_OWNER_PASSWORD>@<POSTGRES_INTERNAL_HOST>:5432/studipod?schema=public
   DIRECT_URL=postgresql://studipod_owner:<POSTGRES_OWNER_PASSWORD>@<POSTGRES_INTERNAL_HOST>:5432/studipod?schema=public

   # --- Rate limiting (Redis on this VPS)
   REDIS_URL=redis://default:<REDIS_PASSWORD>@<REDIS_INTERNAL_HOST>:6379

   # --- Bot protection
   CLOUDFLARE_TURNSTILE_SITE_KEY=<TURNSTILE_SITE_KEY>
   CLOUDFLARE_TURNSTILE_SECRET_KEY=<TURNSTILE_SECRET_KEY>

   # --- Daily sign-up digest to hello@studipod.com
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_USER=hello@studipod.com
   SMTP_PASSWORD=<MAILBOX_PASSWORD>
   SMTP_FROM=StudiPod Waitlist <hello@studipod.com>
   WAITLIST_DIGEST_TO=hello@studipod.com
   CRON_SECRET=<CRON_SECRET>

   # --- Optional footer links (leave empty to show "Soon")
   NEXT_PUBLIC_INSTAGRAM_URL=
   NEXT_PUBLIC_LINKEDIN_URL=
   NEXT_PUBLIC_FAQ_URL=
   ```

3. **Save.**

Good to know:

- `NEXT_PUBLIC_…` values and the Turnstile **site** key are baked in when the site is built —
  after changing them, use **Redeploy**, not just restart.
- The contact email `hello@studipod.com` is built in; you don't need to set it.
- These values are secrets: never commit them to GitHub.

✅ **Check:** the Environment tab shows all variables with no `<…>` placeholders left.

### Step 14 — First deployment

1. `studipod-web` → **Deploy**.
2. Watch **Deployments → Logs**. The build takes a few minutes and should end with a route list
   including `ƒ /api/waitlist`, `ƒ /api/internal/waitlist-digest` and `ƒ Proxy (Middleware)`.
3. Then open the runtime **Logs**: you should see the migrations being applied
   (`All migrations have been successfully applied` on the first start) and `Ready`.

✅ **Check:** the application status is **Running** and the logs show no errors.

### Step 15 — Connect the domain with HTTPS

1. `studipod-web` → **Domains → Add Domain**:

   | Field          | Value          |
   | -------------- | -------------- |
   | Host           | `studipod.com` |
   | Path           | `/`            |
   | Container port | `3000`         |
   | HTTPS          | On             |
   | Certificate    | Let's Encrypt  |

2. Add a second domain for `www.studipod.com` the same way (or a redirect from `www` to the main
   domain if your Dokploy version offers it).
3. Wait about a minute for the certificates.

✅ **Check:** `https://studipod.com` loads the StudiPod homepage with a padlock, and the browser
console (F12 → Console) shows no red errors.

---

## Part E — Harden and automate

### Step 16 — Switch to restricted database logins

So far the website connects as the database **owner**. Now create two limited logins:

- `studipod_app` — used by the website; can **only add** sign-ups (cannot read or delete them).
- `studipod_reporter` — used by the daily digest; can **read** sign-ups, cannot change them.

1. Generate two different passwords (save as `APP_DB_PASSWORD` and `REPORTER_DB_PASSWORD`):

   ```bash
   openssl rand -hex 24
   openssl rand -hex 24
   ```

2. Open a database shell. Either `studipod-db` → **Terminal** in Dokploy, or over SSH:

   ```bash
   docker ps --format '{{.Names}}' | grep studipod-db        # note the container name
   docker exec -it <db-container-name> psql -U studipod_owner -d studipod
   ```

3. Open [`prisma/sql/least-privilege-role.sql`](./prisma/sql/least-privilege-role.sql) from
   GitHub, copy its contents into a text editor, replace:
   - `REPLACE_WITH_A_LONG_RANDOM_SECRET` → `APP_DB_PASSWORD`
   - `REPLACE_WITH_A_DIFFERENT_LONG_RANDOM_SECRET` → `REPORTER_DB_PASSWORD`

   then paste it into the `psql` prompt and press Enter. Type `\q` to exit.
   **Do not save the edited file anywhere.**

4. In `studipod-web` → **Environment**, change `DATABASE_URL` and add `DIGEST_DATABASE_URL`
   (leave `DIRECT_URL` on the owner login — migrations need it):

   ```dotenv
   DATABASE_URL=postgresql://studipod_app:<APP_DB_PASSWORD>@<POSTGRES_INTERNAL_HOST>:5432/studipod?schema=public
   DIGEST_DATABASE_URL=postgresql://studipod_reporter:<REPORTER_DB_PASSWORD>@<POSTGRES_INTERNAL_HOST>:5432/studipod?schema=public
   ```

5. **Save**, then **Redeploy**.

✅ **Check:** submit the waitlist form on `https://studipod.com` with your own details — you see
"You're on the list, …". Submitting the same email again shows "This email address is already on
the waitlist."

### Step 17 — Schedule the daily sign-up digest

Every day at 07:00 UTC, `hello@studipod.com` receives the people who joined since the previous
digest (with a CSV attachment). Days with no sign-ups send nothing.

1. `studipod-web` → **Schedules** → **Add schedule**:
   - **Name:** `Waitlist digest`
   - **Cron expression:** `0 7 * * *`
   - **Command:**

     ```bash
     node -e "fetch('http://127.0.0.1:3000/api/internal/waitlist-digest',{method:'POST',headers:{Authorization:'Bearer '+process.env.CRON_SECRET}}).then(async r=>{console.log(r.status,await r.text());if(!r.ok)process.exit(1)})"
     ```

2. **No Schedules tab in your Dokploy version?** Use the server's cron instead (over SSH):

   ```bash
   echo 'CRON_SECRET=<CRON_SECRET>' > /root/.studipod-cron && chmod 600 /root/.studipod-cron
   (crontab -l 2>/dev/null; echo '0 7 * * * . /root/.studipod-cron && curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://studipod.com/api/internal/waitlist-digest > /dev/null') | crontab -
   ```

3. **Send one now to test** (from your computer):

   ```bash
   curl -X POST -H "Authorization: Bearer <CRON_SECRET>" https://studipod.com/api/internal/waitlist-digest
   ```

   - `"status":"sent"` → check the `hello@studipod.com` inbox (and spam folder).
   - `"status":"skipped"` → no new sign-ups since the last digest (expected if you just tested).
   - `401` wrong secret · `503` a setting is missing · `500` see Troubleshooting.

✅ **Check:** the digest email with your test sign-up arrives at `hello@studipod.com`.

### Step 18 — Set up backups

1. Create an S3-compatible bucket (e.g. Cloudflare R2 or Backblaze B2) and an access key that can
   only use that bucket.
2. Dokploy → **Settings → S3 Destinations → Add** → enter the bucket details → **Test**.
3. `studipod-db` → **Backups → Create backup**: destination = your bucket, schedule `0 3 * * *`
   (daily 03:00), keep e.g. 14 backups.
4. Optional second layer: hPanel → **VPS → Backups / Snapshots** — enable automatic backups.

✅ **Check:** run the backup once manually and confirm the file appears in the bucket.

### Step 19 — Protect the code that gets deployed

Every push to `main` deploys automatically, so make sure only tested code reaches `main`:

1. GitHub → repository **Settings → Branches → Add rule** for `main`:
   require a pull request, require status checks (the **CI** and **CodeQL** workflows) to pass,
   and block force pushes.
2. **Settings → Code security:** enable secret scanning, push protection, Dependabot alerts and
   private vulnerability reporting.

✅ **Check:** the rule appears under Branch protection rules.

---

## Part F — Final checks

### Step 20 — Go-live checklist

Run these from your own computer:

```bash
# Security headers (look for content-security-policy, strict-transport-security, x-frame-options)
curl -sI https://studipod.com | grep -iE "content-security-policy|strict-transport|x-content-type|x-frame"

# SEO files use the real domain
curl -s https://studipod.com/robots.txt
curl -s https://studipod.com/sitemap.xml

# API protections: expect 405 then 415
curl -s -o /dev/null -w "%{http_code}\n" https://studipod.com/api/waitlist
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://studipod.com/api/waitlist -H "Content-Type: text/plain" -d x

# Database and Redis are NOT reachable from the internet (both should fail / time out)
nc -vz -w 5 VPS_IP 5432
nc -vz -w 5 VPS_IP 6379
```

- [ ] Site loads on `https://studipod.com` and `https://www.studipod.com` with a padlock.
- [ ] Browser console shows no errors; the menu, sections and form work on desktop and mobile.
- [ ] Test sign-up works; duplicate email is rejected.
- [ ] Footer "Contact" opens an email to `hello@studipod.com`.
- [ ] Digest email received at `hello@studipod.com`.
- [ ] App logs show **none** of: `rate_limit.distributed_store_missing`,
      `rate_limit.redis_connection_error`, `waitlist.registration_failed`.
- [ ] Ports 3000, 5432 and 6379 are closed from outside.
- [ ] A database backup exists in the bucket.
- [ ] Privacy Policy and Terms of Use content is approved and published (currently placeholders).

**To see everyone on the waitlist at any time** (over SSH):

```bash
docker exec -it <db-container-name> psql -U studipod_owner -d studipod \
  -c "SELECT full_name, email, examination_category, created_at FROM waitlist_entries ORDER BY created_at DESC;"
```

🎉 **StudiPod is live.**

---

## Updating the site

| Task                     | How                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Ship code changes        | Merge to `main` → Dokploy builds and deploys automatically                                |
| Change a setting         | `studipod-web` → Environment → save → **Redeploy**                                        |
| Database changes         | Applied automatically on start (`prisma migrate deploy` in the start command)             |
| Roll back                | Deployments → previous deployment → **Rollback** (if available), or `git revert` and push |
| Update Dokploy           | Settings → update when a new version is offered                                           |
| Rotate a password/secret | Change it at the source (database, mailbox, Cloudflare), update Environment, **Redeploy** |
| Monitor                  | Dokploy **Monitoring** (CPU, memory, disk) and the app **Logs**                           |

Database changes are not undone by a rollback — restore from a backup if ever needed.

---

## Troubleshooting

| Symptom                                                   | Likely cause and fix                                                                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build fails: no `package.json` / Next.js not detected     | **Build Path** is not `/studipod_website` (Step 12).                                                                                                                                              |
| Build killed, "heap out of memory" or exit code 137       | Not enough memory — add swap (Step 3) or upgrade the VPS, then redeploy.                                                                                                                          |
| Build fails with a Node.js / `engines` error              | Make sure `NIXPACKS_NODE_VERSION=22` is set (Step 13).                                                                                                                                            |
| Container restarts; log says `prisma: not found`          | Use the [Dockerfile build](#appendix-dockerfile-build-option), or set the default start command and run `docker exec -it <app-container> npx prisma migrate deploy` after each deploy.            |
| `P1001: Can't reach database server`                      | Wrong internal host or the database is stopped — recheck `POSTGRES_INTERNAL_HOST` (Step 8).                                                                                                       |
| Form says "Something went wrong…"; logs show `P2021`      | Tables don't exist yet — migrations didn't run (check the start command, Step 12).                                                                                                                |
| `permission denied for table waitlist_entries`            | The restricted logins are missing permissions — rerun the SQL in Step 16 as the owner.                                                                                                            |
| "We couldn't verify that you're human" for everyone       | Turnstile mismatch: the domain must be in the widget's hostnames, `NEXT_PUBLIC_SITE_URL` must match the address people use, and both keys must come from the same widget. Redeploy after changes. |
| "We couldn't verify your request right now" (503)         | The server can't reach Cloudflare or the Turnstile secret is wrong — check the logs (`turnstile.siteverify_*`).                                                                                   |
| Logs show `rate_limit.redis_connection_error`             | Wrong Redis host/password or Redis stopped — fix `REDIS_URL` (Steps 9, 13). Sign-ups keep working meanwhile.                                                                                      |
| Many visitors get "Too many attempts" together            | Cloudflare proxy (orange cloud) is on — switch DNS records to **DNS only** (Step 5).                                                                                                              |
| No HTTPS certificate                                      | DNS not pointing at `VPS_IP` yet, ports 80/443 closed, or Cloudflare proxy on (Steps 4–5). Re-save the domain afterwards.                                                                         |
| Digest returns 500 with `EAUTH` in the logs               | Wrong mailbox password, or `SMTP_FROM` isn't the same mailbox as `SMTP_USER` (Steps 11, 13).                                                                                                      |
| Digest returns 500 with `permission denied`               | `DIGEST_DATABASE_URL` missing or the reporter login wasn't created (Step 16).                                                                                                                     |
| Digest emails land in spam                                | Missing SPF/DKIM/DMARC records for studipod.com (Step 11).                                                                                                                                        |
| Social previews show `localhost`                          | `NEXT_PUBLIC_SITE_URL` was missing at build time — set it and **Redeploy**.                                                                                                                       |
| Console error "Refused to load … Content Security Policy" | A new third-party resource was added without updating `src/lib/security/headers.ts`.                                                                                                              |

---

## Appendix: Dockerfile build option

Nixpacks (Step 12) needs no extra files. If you prefer a fully reproducible image — pinned Node.js
version, Prisma CLI guaranteed inside the container, runs as a non-root user — add these two files
to `studipod_website/`, commit them, then in Dokploy set **Build Type → Dockerfile**, **Dockerfile
path** `Dockerfile` and keep Build Path `/studipod_website`.

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

- Add the public values (`NEXT_PUBLIC_SITE_URL`, `CLOUDFLARE_TURNSTILE_SITE_KEY` and any
  `NEXT_PUBLIC_*` links) under **Build-time arguments** as well as in **Environment**.
- Remove `NIXPACKS_NODE_VERSION` and clear the custom start command (the Dockerfile's `CMD`
  already runs migrations and starts the site).
- Never pass secrets (database URLs, `REDIS_URL`, SMTP password, Turnstile secret,
  `CRON_SECRET`) as build arguments — they can end up in the image.

---

More detail: [README.md](./README.md) (configuration and local development),
[SECURITY.md](./SECURITY.md) (security model) and [DEPLOYMENT.md](./DEPLOYMENT.md) (Vercel).
