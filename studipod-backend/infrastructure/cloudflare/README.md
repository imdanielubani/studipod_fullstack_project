# Cloudflare

Cloudflare sits in front of every public hostname and provides DNS, CDN, TLS edge termination and the WAF. Object storage is Cloudflare R2.

## DNS

| Record           | Type             | Target        | Proxy   | Purpose                                           |
| ---------------- | ---------------- | ------------- | ------- | ------------------------------------------------- |
| `api.<domain>`   | A                | VPS IPv4      | Proxied | REST API (Traefik service `api`)                  |
| `ws.<domain>`    | A                | VPS IPv4      | Proxied | Socket.IO gateway (Cloudflare proxies WebSockets) |
| `app.<domain>`   | A                | VPS IPv4      | Proxied | Candidate webapp                                  |
| `admin.<domain>` | A                | VPS IPv4      | Proxied | Admin dashboard                                   |
| `cdn.<domain>`   | R2 custom domain | public bucket | Proxied | Public assets (avatars, public resources)         |

LiveKit uses LiveKit Cloud hostnames directly. Video media never passes through Cloudflare or the VPS.

## TLS

- SSL/TLS mode **Full (strict)**. Traefik holds a valid Let's Encrypt certificate (or a Cloudflare Origin CA certificate).
- Always Use HTTPS: on. Minimum TLS version: 1.2. HSTS is enabled after the domain set is stable (start with `max-age=86400`, then raise it).

## Origin protection

- The VPS firewall (UFW) allows 80/443 only from [Cloudflare IP ranges](https://www.cloudflare.com/ips/), plus SSH from administrator IPs. PostgreSQL, PgBouncer and Valkey ports are never opened.
- Traefik and the API trust `X-Forwarded-For` and `CF-Connecting-IP` only because the origin is reachable exclusively through Cloudflare (`TRUST_PROXY_HOPS=2`, an exact hop count, never "trust all").

## WAF and rate limiting

Start with the Cloudflare managed ruleset, then add custom rules:

| Rule                              | Expression (summary)                                                                    | Action                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Protect authentication endpoints  | path starts with `/api/v1/auth/`, more than 20 req/min per IP                           | Managed challenge                                           |
| Admin API from known regions only | host `api.<domain>` and path starts with `/api/v1/admin/` and country not in allowlist  | Block (optional)                                            |
| Block API docs in production      | path starts with `/api/docs`                                                            | Block                                                       |
| Webhooks bypass challenges        | path is `/api/v1/payments/webhooks/stripe` or `/api/v1/video-sessions/webhooks/livekit` | Skip bot fight / challenges (signature verified by the API) |

Application-level rate limiting (`@nestjs/throttler` backed by Valkey) still applies; Cloudflare is the outer layer, not the only one.

## R2

- Buckets per environment: `studipod-<env>-private`, `studipod-<env>-public`, `studipod-<env>-backups`.
- Private bucket: no public access. Reads and writes use short-lived presigned URLs issued by the API.
- Public bucket: served only through the `cdn.<domain>` custom domain (the `r2.dev` URL stays disabled).
- API tokens: one token per environment with **Object Read & Write** limited to that environment's private and public buckets. The backup token is separate and limited to the backup bucket.
- CORS: apply [`r2-cors.json`](r2-cors.json) to the private bucket so browsers can upload directly with presigned URLs.
