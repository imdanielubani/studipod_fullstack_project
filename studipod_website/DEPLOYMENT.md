# Deploying StudiPod to Vercel

Step-by-step guide for deploying the StudiPod website and waitlist to [Vercel](https://vercel.com)
with a managed PostgreSQL database, Upstash Redis rate limiting and Cloudflare Turnstile.

Expected time: about 30–45 minutes for a first deployment.

---

## Contents

1. [What you need](#1-what-you-need)
2. [Create the production services](#2-create-the-production-services)
3. [Import the project into Vercel](#3-import-the-project-into-vercel)
4. [Configure environment variables](#4-configure-environment-variables)
5. [Run the database migrations](#5-run-the-database-migrations)
6. [Create the least-privilege database role](#6-create-the-least-privilege-database-role)
7. [Deploy](#7-deploy)
8. [Add your custom domain](#8-add-your-custom-domain)
9. [Verify the deployment](#9-verify-the-deployment)
10. [Preview deployments](#10-preview-deployments)
11. [Recommended Vercel settings](#11-recommended-vercel-settings)
12. [Updating, redeploying and rolling back](#12-updating-redeploying-and-rolling-back)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What you need

| Requirement              | Notes                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| Vercel account           | Hobby works for testing; Pro is recommended for a commercial launch   |
| GitHub repository access | `imdanielubani/studipod_fullstack_project`                            |
| PostgreSQL 15+ database  | Neon, Supabase, Prisma Postgres, AWS RDS… (PostgreSQL 17 recommended) |
| Upstash Redis database   | Distributed rate limiting — **required in production**                |
| Cloudflare account       | For a Turnstile widget (free) — **required in production**            |
| Node.js ≥ 22.12 locally  | Only to run migrations from your machine (step 5)                     |
| A domain (optional)      | e.g. `studipod.com`; Vercel provides a `*.vercel.app` URL otherwise   |

> **Important:** the Next.js app lives in the `studipod_website/` sub-folder of the repository.
> Vercel must be told this (step 3), otherwise the build will fail.

---

## 2. Create the production services

### 2.1 PostgreSQL database

**Option A — Vercel Marketplace (simplest):** in your Vercel dashboard open **Storage → Create
Database**, choose a Postgres provider (e.g. Neon) and pick a region close to your users (e.g.
London for a UK audience). You will connect it to the project in step 4.

**Option B — Provider dashboard:** create a database directly with your provider.

Either way you need **two connection strings**:

| Purpose                                           | Usually called                                 | Used as        |
| ------------------------------------------------- | ---------------------------------------------- | -------------- |
| **Pooled** connection (for the running website)   | "pooled", "transaction pooler", `-pooler` host | `DATABASE_URL` |
| **Direct** connection (for `prisma migrate` only) | "direct", "unpooled", "session"                | `DIRECT_URL`   |

Make sure both include `sslmode=require` (most providers add it automatically).

### 2.2 Upstash Redis

Either add **Upstash for Redis** from the Vercel Marketplace, or create a database at
[console.upstash.com](https://console.upstash.com) in a region near your Vercel functions. Copy:

- **REST URL** → `UPSTASH_REDIS_REST_URL` (must start with `https://`)
- **REST Token** → `UPSTASH_REDIS_REST_TOKEN`

> **Alternative:** any standard Redis reachable over TLS (e.g. Redis Cloud) can be used instead by
> setting `REDIS_URL=rediss://…`. On Vercel, Upstash is recommended because its HTTPS API suits
> short-lived serverless functions.

> Some Marketplace integrations inject these under different names (for example
> `KV_REST_API_URL` / `KV_REST_API_TOKEN`). The app only reads `UPSTASH_REDIS_REST_URL` and
> `UPSTASH_REDIS_REST_TOKEN`, so add those two variables with the same values if needed.

### 2.3 Cloudflare Turnstile

1. Cloudflare dashboard → **Turnstile** → **Add widget**.
2. **Widget name:** `StudiPod waitlist`.
3. **Hostnames:** your production domain(s), e.g. `studipod.com` and `www.studipod.com`. If you
   launch on the Vercel URL first, also add `your-project.vercel.app`.
4. **Widget mode:** _Managed_.
5. Copy the **Site key** and the **Secret key**.

---

## 3. Import the project into Vercel

1. Vercel dashboard → **Add New… → Project** → **Import** the `studipod_fullstack_project`
   GitHub repository (grant Vercel access to it if asked).
2. In **Configure Project**:

   | Setting            | Value                                           |
   | ------------------ | ----------------------------------------------- |
   | **Root Directory** | `studipod_website` ← click _Edit_ and select it |
   | Framework Preset   | Next.js (detected automatically)                |
   | Build Command      | _leave default_ (`npm run build`)               |
   | Install Command    | _leave default_ (`npm install`)                 |
   | Output Directory   | _leave default_                                 |

   `npm run build` already runs `prisma generate && next build`, and `npm install` runs
   `prisma generate` via `postinstall`, so no extra build configuration is needed.

3. **Do not click Deploy yet** — add the environment variables first (step 4). If you already
   deployed, that's fine: add the variables and redeploy.
4. After the project is created, go to **Settings → Build and Deployment → Node.js Version** and
   select **24.x** (22.x also works; the project requires ≥ 22.12).
5. **Settings → Functions → Function Region:** choose the region closest to your database (for a
   London database, `lhr1`). Keeping the API next to the database keeps sign-ups fast.

---

## 4. Configure environment variables

**Settings → Environment Variables.** Add each variable and tick the **Production** environment
(see [section 10](#10-preview-deployments) for Preview). Mark secrets as **Sensitive** so their
values cannot be read back in the dashboard.

| Variable                          | Production value                                               | Sensitive |
| --------------------------------- | -------------------------------------------------------------- | --------- |
| `NEXT_PUBLIC_SITE_URL`            | `https://your-domain.com` (no trailing slash)                  | No        |
| `DATABASE_URL`                    | Pooled connection string (later: the least-privilege role, §6) | **Yes**   |
| `DIRECT_URL`                      | Direct connection string (owner role)                          | **Yes**   |
| `CLOUDFLARE_TURNSTILE_SITE_KEY`   | Turnstile site key                                             | No        |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | Turnstile secret key                                           | **Yes**   |
| `UPSTASH_REDIS_REST_URL`          | Upstash REST URL (`https://…`)                                 | No        |
| `UPSTASH_REDIS_REST_TOKEN`        | Upstash REST token                                             | **Yes**   |
| `NEXT_PUBLIC_INSTAGRAM_URL`       | Optional — e.g. `https://www.instagram.com/<handle>`           | No        |
| `NEXT_PUBLIC_LINKEDIN_URL`        | Optional — e.g. `https://www.linkedin.com/company/<page>`      | No        |
| `NEXT_PUBLIC_CONTACT_EMAIL`       | Optional — overrides the default `hello@studipod.com`          | No        |
| `NEXT_PUBLIC_FAQ_URL`             | Optional — FAQ page URL                                        | No        |

Rules:

- **Never** prefix a secret with `NEXT_PUBLIC_` — those values are sent to every browser.
- `NEXT_PUBLIC_*` values and `CLOUDFLARE_TURNSTILE_SITE_KEY` are read **at build time**. After
  changing them, **redeploy** (step 12).
- Footer links left empty show a "Soon" label instead of a dead link.
- If you connected a database through the Vercel Marketplace, it may have added its own variables
  (e.g. `POSTGRES_URL`, `DATABASE_URL_UNPOOLED`). Make sure `DATABASE_URL` and `DIRECT_URL` exist
  with the pooled and direct values respectively.

---

## 5. Run the database migrations

Migrations create the `waitlist_entries` table, its indexes and integrity constraints. Run them
**once now**, and again whenever a new migration is added. They use `DIRECT_URL` (owner role).

From your machine, inside `studipod_website/` (after `npm install`):

**PowerShell (Windows)**

```powershell
$env:DIRECT_URL = "postgresql://OWNER_USER:OWNER_PASSWORD@DIRECT_HOST/DB?sslmode=require"
npx prisma migrate deploy
Remove-Item Env:DIRECT_URL
```

**bash / zsh (macOS, Linux)**

```bash
DIRECT_URL="postgresql://OWNER_USER:OWNER_PASSWORD@DIRECT_HOST/DB?sslmode=require" \
  npx prisma migrate deploy
```

Expected output ends with: `All migrations have been successfully applied.`

> Do not add `prisma migrate deploy` to the Vercel build command: preview deployments would then
> run migrations against whichever database they are connected to. Run migrations deliberately
> (from your machine or a release job) before deploying code that depends on them.

---

## 6. Create the least-privilege database role

So far the app would connect as the database owner. For production, the running website should
use a restricted role that can **only insert** sign-ups — it cannot read names or emails, update,
delete or change the schema. See [SECURITY.md](./SECURITY.md#database-security).

1. Generate a long random password (e.g. from your password manager, 32+ characters).
2. Open your provider's **SQL editor**, connected to the production database as the owner.
3. Paste the contents of
   [`prisma/sql/least-privilege-role.sql`](./prisma/sql/least-privilege-role.sql), replace
   `REPLACE_WITH_A_LONG_RANDOM_SECRET` with the generated password, and run it. **Do not save the
   password into the repository.**
4. Build the new **pooled** connection string using the role `studipod_app` and that password,
   e.g. `postgresql://studipod_app:<password>@<pooled-host>/<db>?sslmode=require`.
5. In Vercel, **replace the value of `DATABASE_URL`** (Production) with this string. Keep
   `DIRECT_URL` on the owner role for future migrations.

> Some providers manage roles in their dashboard rather than via `CREATE ROLE`. If the script's
> `CREATE ROLE` step is not permitted, create a role called `studipod_app` in the dashboard, then
> run the remaining `GRANT` / `REVOKE` / `ALTER ROLE` statements from the script.

---

## 7. Deploy

- **First deployment:** _Deployments_ → **Redeploy** (or click **Deploy** if you have not deployed
  yet).
- **From then on:** every push to `main` deploys to Production automatically, and every pull
  request gets a Preview deployment.

Wait for the build to finish (a few minutes). The build log should end with the route list,
including `ƒ /api/waitlist` and `ƒ Proxy (Middleware)`.

---

## 8. Add your custom domain

1. **Settings → Domains → Add** → enter `studipod.com` (and optionally `www.studipod.com`, set to
   redirect to the apex or vice versa).
2. Add the DNS records Vercel shows at your domain registrar. HTTPS certificates are issued
   automatically.
3. Update **`NEXT_PUBLIC_SITE_URL`** to `https://studipod.com` and make sure the domain is in the
   **Turnstile widget's hostnames**.
4. **Redeploy** so the new URL is used for metadata, the sitemap and Turnstile hostname checks.

---

## 9. Verify the deployment

Replace `https://your-domain.com` with your URL.

**Pages and headers**

```bash
curl -sI https://your-domain.com | grep -iE "content-security-policy|strict-transport|x-content-type|referrer-policy|x-frame"
curl -s https://your-domain.com/robots.txt
curl -s https://your-domain.com/sitemap.xml
```

You should see a `Content-Security-Policy` containing `'nonce-…'` and `'strict-dynamic'`,
`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` and
`X-Frame-Options: DENY`; robots.txt and the sitemap should use your production domain.

**API protections**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/waitlist            # 405
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://your-domain.com/api/waitlist \
  -H "Content-Type: text/plain" -d "x"                                                       # 415
```

**End-to-end check in a browser**

1. Open the site and check the browser console has **no errors** (a CSP problem would appear
   here).
2. Click **Join the Waitlist** and submit the form with your own details → the success message
   "You're on the list, …" appears.
3. Submit the same email again → "This email address is already on the waitlist."
4. Confirm the row exists in your database (provider's table viewer or SQL editor, as the owner):
   `SELECT full_name, email, status, created_at FROM waitlist_entries ORDER BY created_at DESC LIMIT 5;`
5. Delete your test row afterwards if you wish.

**Logs:** _Deployments → (latest) → Logs_. There should be **no**
`rate_limit.distributed_store_missing` entries — if there are, the Upstash variables are missing.

**Social card:** paste your URL into a link-preview tool (e.g. the LinkedIn Post Inspector) to
check the Open Graph image.

---

## 10. Preview deployments

Vercel builds a Preview for each pull request. Previews also run with `NODE_ENV=production`, so
configure them deliberately:

| Variable                      | Preview recommendation                                                                                                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL` / `DIRECT_URL` | Point at a **separate** preview/staging database (e.g. a Neon branch) — never the production database                                                                                                                                                                          |
| `NEXT_PUBLIC_SITE_URL`        | Your staging URL if you have a fixed one; otherwise leave unset                                                                                                                                                                                                                |
| Turnstile keys                | **Leave unset** for previews. Preview URLs change per deployment, and in production mode the server checks the token's hostname against `NEXT_PUBLIC_SITE_URL`, so tokens from preview URLs would be rejected. With the secret unset, verification is skipped on previews only |
| Upstash keys                  | Optional — a separate small Upstash database, or leave unset (per-instance memory limiter)                                                                                                                                                                                     |

Protect previews from the public with **Settings → Deployment Protection → Vercel
Authentication** (enabled for previews by default on new projects — keep it on).

---

## 11. Recommended Vercel settings

- **Deployment Protection:** keep Vercel Authentication on for Preview deployments.
- **Sensitive environment variables:** mark every secret as _Sensitive_.
- **Ignored Build Step** (optional, _Settings → Git_): skip builds when nothing in
  `studipod_website/` changed, using the command `git diff --quiet HEAD^ HEAD -- .`
- **Firewall (optional):** Vercel's Firewall can add an edge rate-limit rule on `/api/waitlist`
  (e.g. 20 requests per minute per IP) as an outer layer in front of the app's own limits.
- **Logs and monitoring:** connect a Log Drain or check function logs regularly; alert on spikes of
  `waitlist.rate_limited`, `waitlist.bot_verification_failed` and `waitlist.registration_failed`.
- **Required checks before production:** in GitHub branch protection, require the CI workflow
  (lint, types, build, tests, end-to-end, audit, CodeQL) to pass before merging to `main`, so only
  green code reaches Production.

---

## 12. Updating, redeploying and rolling back

- **Ship a change:** merge to `main` → automatic Production deployment.
- **Change an environment variable:** update it in Settings, then _Deployments → latest → ⋯ →
  Redeploy_ (required for `NEXT_PUBLIC_*` and the Turnstile site key, which are build-time).
- **New database migration:** run `npx prisma migrate deploy` (step 5) **before** deploying the
  code that needs it.
- **Roll back:** _Deployments_ → pick the last good deployment → **⋯ → Promote to Production**
  (Instant Rollback). Database migrations are not rolled back automatically.
- **Rotate a secret:** create the new value at the provider, update it in Vercel, redeploy, then
  revoke the old value.

---

## 13. Troubleshooting

| Symptom                                                                                   | Likely cause and fix                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build fails: "No Next.js version detected" / cannot find `package.json`                   | **Root Directory** is not set to `studipod_website` (step 3).                                                                                                                                                                                                                                                                                                           |
| Build fails with a Node.js version / `engines` error                                      | Set **Node.js Version** to 24.x (or 22.x) in Project Settings.                                                                                                                                                                                                                                                                                                          |
| Form shows "Something went wrong on our side…"; logs show `waitlist.registration_failed`  | Database not reachable or migrations not applied. Check `DATABASE_URL` and `sslmode=require`, and run step 5. An error code such as `P2021` means the table does not exist yet.                                                                                                                                                                                         |
| Logs mention `unsupported startup parameter` (e.g. `statement_timeout`) with a pooled URL | Some PgBouncer-based poolers reject per-connection startup parameters. The app sets statement and query timeouts on its connection pool (`src/lib/prisma.ts`). Either use your provider's session-mode pooler or direct URL for `DATABASE_URL`, or remove `statement_timeout` from `POOL_OPTIONS` and rely on the role-level timeout set by `least-privilege-role.sql`. |
| `permission denied for table waitlist_entries`                                            | The least-privilege role is missing grants — re-run the `GRANT` statements from step 6, connected as the owner.                                                                                                                                                                                                                                                         |
| Every submission fails with "We couldn't verify that you're human"                        | Turnstile hostname mismatch or wrong keys. Ensure the domain is in the widget's hostnames, `NEXT_PUBLIC_SITE_URL` matches the domain people use, and both keys belong to the same widget. Redeploy after changing the site key.                                                                                                                                         |
| Submissions fail with "We couldn't verify your request right now" (503)                   | The server could not reach Cloudflare's verification service, or the secret key is invalid. Check the secret and the function logs (`turnstile.siteverify_*`).                                                                                                                                                                                                          |
| Form never submits; message "We're still verifying your browser"                          | The Turnstile widget failed to load (e.g. a browser extension blocking `challenges.cloudflare.com`). Check the browser console.                                                                                                                                                                                                                                         |
| Logs show `rate_limit.distributed_store_missing`                                          | The Upstash variables are missing in this environment (step 4).                                                                                                                                                                                                                                                                                                         |
| Footer shows "Soon" next to Instagram / LinkedIn / Contact                                | The optional `NEXT_PUBLIC_*` link variables are not set — set them and redeploy.                                                                                                                                                                                                                                                                                        |
| Social previews or canonical URLs show `localhost` or `*.vercel.app`                      | `NEXT_PUBLIC_SITE_URL` is missing or wrong — fix it and redeploy.                                                                                                                                                                                                                                                                                                       |
| Browser console: "Refused to load … because it violates the Content Security Policy"      | A new third-party script or resource was added without updating the CSP in `src/lib/security/headers.ts`. Add only the specific origin needed.                                                                                                                                                                                                                          |

---

For local development, testing and the full environment reference see [README.md](./README.md);
for the security model see [SECURITY.md](./SECURITY.md).
