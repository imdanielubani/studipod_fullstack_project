# Security architecture

Studipod handles personal data about medical candidates (identity, training background,
messages, session records and payments), and UK GDPR applies. The webapp is a public,
internet-facing client: treat every input and every API response as untrusted.

## Responsibilities

| Concern                                               | Owner                                              |
| ----------------------------------------------------- | -------------------------------------------------- |
| Authentication, authorisation                         | Backend (webapp only reflects the result)          |
| Business rules and validation                         | Backend (webapp validates shape for feedback only) |
| Rate limiting, lockouts                               | Backend and Cloudflare                             |
| Secrets (JWT, Stripe, LiveKit, R2, VAPID private key) | Backend only; none exist in the webapp             |
| Safe rendering, headers, client storage               | Webapp                                             |

## HTTP security headers (configured in `next.config.ts`)

| Header                      | Value                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | Baseline: `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; worker-src 'self'; manifest-src 'self'` |
| `X-Frame-Options`           | `DENY`                                                                                                                             |
| `X-Content-Type-Options`    | `nosniff`                                                                                                                          |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                                                                  |
| `Permissions-Policy`        | `camera`, `microphone`, `display-capture`, `fullscreen`, `autoplay` for this origin only (video sessions); everything else off     |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains`                                                                                              |
| `X-Powered-By`              | Removed (`poweredByHeader: false`)                                                                                                 |

`/sw.js` additionally gets `Cache-Control: no-store` and a restrictive CSP.

## Content Security Policy plan

The full policy is added with the request proxy (`src/proxy.ts`) when authentication is
built, using a per-request nonce:

```text
default-src 'self';
script-src 'self' 'nonce-<random>' 'strict-dynamic';
style-src 'self' 'unsafe-inline';            # Tailwind/Radix inline styles; revisit later
img-src 'self' data: blob: https://cdn.studipod.com;
font-src 'self';
connect-src 'self' https://api.studipod.com wss://ws.studipod.com
            wss://<project>.livekit.cloud https://<project>.livekit.cloud
            https://<r2-upload-host>;
media-src 'self' blob:;
worker-src 'self';
manifest-src 'self';
frame-src https://checkout.stripe.com;       # only if an embedded Stripe flow is adopted
frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';
upgrade-insecure-requests;
```

Origins come from the build-time public variables, never hard-coded per environment. Roll
out with `Content-Security-Policy-Report-Only` first, then enforce.

## XSS prevention

- React escapes output by default. `dangerouslySetInnerHTML` is not allowed unless the HTML
  is sanitised (DOMPurify) and the use is reviewed.
- Message text, profile fields and resource descriptions are rendered as text. Links in
  messages are detected and rendered with `rel="noopener noreferrer"` and only `https:`.
- Never build URLs, `href`s or redirect targets from unvalidated input; return paths after
  sign-in must be same-origin relative paths.
- The CSP above is the second line of defence.

## CSRF

- API requests use `Authorization: Bearer` with an in-memory token, which a cross-site page
  cannot attach, so they are not CSRF-prone.
- The refresh endpoint relies on a cookie; the backend protects it with `SameSite=Strict`,
  a path scope, an exact CORS allowlist with credentials, and JSON-only request bodies.
- The webapp has no cookie-authenticated mutations of its own. If server actions are ever
  added, they must verify the session and rely on Next.js origin checks.

## Client-side storage

| Storage                           | Allowed contents                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Memory (Zustand, Query cache)     | Access token, current user, server data; cleared on sign-out                           |
| `localStorage` / `sessionStorage` | Non-sensitive preferences only (for example a dismissed banner), via `src/lib/storage` |
| IndexedDB                         | Nothing at present                                                                     |
| Cache Storage (service worker)    | Public static assets only ([caching strategy](../pwa/caching-strategy.md))             |
| Cookies set by the webapp         | None (the refresh cookie is set by the API, `HttpOnly`)                                |

Tokens, personal data, messages and payment details are never written to persistent
browser storage. ESLint enforces the Web Storage rule (`no-restricted-globals`).

## Secure file uploads

Uploads go directly from the browser to Cloudflare R2 using presigned URLs issued by the
backend after it checks type and size ([API integration](../api-integration/api-integration.md#file-uploads)).
The webapp also checks type and size before requesting a URL (for feedback only), never
renders uploaded files as HTML, and displays images only after the backend has processed them.

## Environment variables

Only `NEXT_PUBLIC_*` values reach the webapp, and they are public by design (URLs only).
Templates contain placeholders; real `.env*` files are git-ignored and excluded from the
Docker build context. See [environment variables](../deployment/environment-variables.md).

## Error handling

- Error boundaries show a generic message plus the error digest or API `requestId`; never
  stack traces, error messages from the server or API internals.
- `console.log` is a lint warning; nothing logs tokens or personal data.
- Production builds do not ship source maps to browsers (Next.js default).

## Dependency security

- Exact versions pinned; `pnpm install --frozen-lockfile` in CI and Docker.
- pnpm blocks dependency install scripts unless approved in `pnpm-workspace.yaml`, and
  refuses versions published too recently (release-age window).
- `pnpm audit --audit-level=high` runs in CI and fails the pipeline.
- Enable GitHub Dependabot alerts and secret scanning on the repository.

## Before every commit

No secrets or real credentials in the diff; no new `dangerouslySetInnerHTML`; no new
storage of personal data; no new service worker cache rule without review.
