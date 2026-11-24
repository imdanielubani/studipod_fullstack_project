# Cloudflare setup for the Admin Dashboard

## DNS and TLS

| Record                | Type | Target          | Proxy   |
| --------------------- | ---- | --------------- | ------- |
| `stuadminapp`         | A    | VPS public IPv4 | Proxied |
| `stuadminapp.staging` | A    | VPS public IPv4 | Proxied |

- SSL/TLS mode **Full (strict)**; minimum TLS version 1.2; Always Use HTTPS on.
- HSTS is sent by the application; enable it in Cloudflare too only after HTTPS is
  verified on every subdomain.

## Caching

- Cache static assets under `/_next/static/*` (content-hashed, immutable).
- **Bypass cache** for everything else, in particular HTML and `/api/*`. Admin pages must
  never be cached at the edge.

## WAF and rate limiting

- Managed WAF rules on.
- Rate limit `/api/health` and page requests per IP (for example 300 requests per minute)
  as a safety net. Authentication rate limiting is enforced by the backend.
- Optionally block countries the team never works from.

## Cloudflare Access (additional access layer)

Cloudflare Access puts an identity check in front of the dashboard **before** any
request reaches the VPS. It is an extra layer: it does **not** replace application sign-in
or backend authorisation, and the dashboard never trusts Access headers as proof of
identity or permissions.

### Setup

1. Zero Trust → Access → Applications → **Add a self-hosted application**.
2. Application domain: `stuadminapp.studipod.com` (a second application for staging).
3. Session duration: 24 hours (matches the dashboard inactivity rule).
4. Identity provider: the company identity provider, or One-time PIN restricted to
   company email addresses.
5. Policy **Allow**: emails ending in `@studipod.com` (or an explicit group of staff).
   Add device posture or country rules if available.
6. Policy **Bypass** for `stuadminapp.studipod.com/api/health` only if external uptime
   monitoring needs to reach it; otherwise monitor from inside the Access policy with a
   service token.
7. For automation (for example Playwright against staging), create an Access **service
   token** with a Service Auth policy instead of sharing a person's login.

### What Access does not cover

- The API (`api.studipod.com`) is shared with the candidate webapp, so it is **not** behind
  Access. Admin routes on the API are protected by the backend admin guard, permission
  guard and rate limits.
- Access does not log administrators into the dashboard. Administrators still sign in
  with their password and emailed code.

### Origin protection

Restrict the VPS firewall so ports 80/443 accept traffic only from Cloudflare IP ranges
(see the backend deployment guide). This prevents bypassing Access by calling the origin
IP directly. For a stronger guarantee, use a Cloudflare Tunnel instead of public ports.
