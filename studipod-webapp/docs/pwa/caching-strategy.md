# Service worker caching strategy

The service worker caches **only public, non-personal, same-origin assets**. Everything
else goes to the network every time. Read this before adding or changing a rule in
`src/lib/pwa/service-worker/sw.ts`.

## Current rules

| Request                                                | Strategy                             | Cache name           | Limits                                                     |
| ------------------------------------------------------ | ------------------------------------ | -------------------- | ---------------------------------------------------------- |
| `/offline.html`, `/icons/*`                            | Precache (installed with the worker) | `serwist-precache-*` | Revision = content hash; precache wins over the rule below |
| `/_next/static/*` (content-hashed JS, CSS, fonts)      | Cache first                          | `next-static`        | 300 entries, 30 days                                       |
| `/images/*`, `/fonts/*` (and non-precached `/icons/*`) | Stale while revalidate               | `public-assets`      | 100 entries, 30 days                                       |
| Page navigations                                       | Network only, then `offline.html`    | none                 | n/a                                                        |
| Everything else                                        | Not handled by the worker            | none                 | n/a                                                        |

Only `GET` responses with status `200` from this origin are stored. `/_next/image`, RSC
payloads, `/api/*` route handlers and query-string requests to pages are not handled.

## Never cached

| Traffic                                     | Why                                                        | How it is excluded                   |
| ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------ |
| Authentication (sign-in, refresh, logout)   | Tokens and session state                                   | Cross-origin (API); no matching rule |
| Candidate data (profile, matches, bookings) | Personal data, possibly special-category (health/training) | Cross-origin (API); no matching rule |
| Messages, conversations, groups             | Private communication                                      | Cross-origin (API, WebSocket)        |
| Payments and subscriptions                  | Financial data; Stripe pages are off-site                  | Cross-origin; no matching rule       |
| Video (LiveKit signalling and media)        | Real time, cannot be cached                                | Cross-origin WebSocket/WebRTC        |
| Uploaded files and presigned URLs (R2)      | Private files with expiring URLs                           | Cross-origin; no matching rule       |
| Rendered pages (HTML)                       | Contain personal data after sign-in                        | Navigations are network only         |

`cacheOnNavigation` is disabled in the registration options, so visited pages are never
added to a cache from the client side either.

## Rules for changes

1. Never add a rule that matches the API, WebSocket, LiveKit, Stripe or R2 origins.
2. Never cache HTML, RSC payloads or any response that depends on the signed-in candidate.
3. New runtime caches must have an `ExpirationPlugin` and accept only status `200`.
4. Public data that would benefit from offline access (for example the examination list) is
   cached in memory by TanStack Query, not by the service worker.
5. A change to these rules needs a security review and an update of this document.

## Interaction with Cloudflare

Cloudflare may cache `/_next/static/*` and public assets at the edge; it must bypass cache
for HTML, `/sw.js`, `/manifest.json` and `/api/*` (see `infrastructure/cloudflare/README.md`).
