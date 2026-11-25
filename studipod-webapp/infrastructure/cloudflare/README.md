# Cloudflare setup for the Candidate Webapp

The webapp is public, so unlike the admin dashboard it is **not** behind Cloudflare Access.
Cloudflare provides DNS, TLS, CDN caching for static assets, WAF and DDoS protection.

## DNS and TLS

| Record        | Type | Target          | Proxy   |
| ------------- | ---- | --------------- | ------- |
| `app`         | A    | VPS public IPv4 | Proxied |
| `app.staging` | A    | VPS public IPv4 | Proxied |

- SSL/TLS mode **Full (strict)**; minimum TLS version 1.2; Always Use HTTPS on; HTTP/3 on.
- HSTS is sent by the application; enable it in Cloudflare too only after HTTPS is verified
  on every subdomain.
- WebSockets on (zone setting). The webapp's own origin does not use them, but `ws.` does.

## Caching (Cache Rules)

| Order | Match                                                                | Action                                                           |
| ----- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1     | `/sw.js`, `/manifest.json`, `/api/*`                                 | **Bypass cache**                                                 |
| 2     | `/_next/static/*`                                                    | Eligible for cache; respect origin headers (immutable, one year) |
| 3     | `/icons/*`, `/images/*`, `/fonts/*`, `/favicon.ico`, `/offline.html` | Eligible for cache; edge TTL 1 day                               |
| 4     | Everything else (HTML pages, RSC requests)                           | **Bypass cache**                                                 |

HTML must never be cached at the edge: pages for signed-in candidates contain personal
data, and a cached `/sw.js` would delay service worker updates.

## Settings that must stay off

- **Rocket Loader:** rewrites script tags and breaks Next.js hydration and the CSP.
- **Email Address Obfuscation** and **Server-side Excludes:** inject scripts/markup.
- **Automatic HTML minification / page optimisation features** that alter HTML.

## WAF and rate limiting

- Managed WAF rules and Bot Fight Mode on (check that it does not challenge the PWA's
  `sw.js` and `manifest.json` requests).
- Rate limit page requests per IP (for example 300 requests per minute) as a safety net.
  Sign-in and registration rate limits are enforced by the backend on `api.`.

## Origin protection

Restrict the VPS firewall so ports 80/443 accept traffic only from Cloudflare IP ranges
(see `studipod-backend/docs/deployment/infrastructure-and-deployment.md`).
