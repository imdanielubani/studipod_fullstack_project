# Authentication and session architecture

> **Status:** plan only. No authentication code exists in the webapp yet. The backend owns
> every authentication and authorisation decision. Endpoint paths are deliberately not
> listed: they come from the backend OpenAPI document once the authentication module exists.

## Principles

1. **The backend is the source of truth.** Every candidate API request is authenticated by
   the backend (`JwtAuthGuard`, candidate audience `studipod-webapp`) and every resource is
   ownership-checked there. Webapp checks only decide what to _show_.
2. **No long-lived secret is readable by JavaScript.** The refresh token lives only in an
   `HttpOnly` cookie. The access token lives only in memory. Nothing auth-related is written
   to `localStorage`, `sessionStorage`, IndexedDB, the Cache Storage API or a non-`HttpOnly`
   cookie. ESLint blocks direct Web Storage use outside `src/lib/storage`.
3. **Candidates are a separate realm from administrators.** Admin tokens are never accepted
   by candidate routes, and the webapp never calls admin routes.
4. **Fail closed.** If the session state is unknown, the webapp behaves as signed out.

## Tokens (backend defaults)

| Token         | Held by                                                                           | Readable by JS | Lifetime |
| ------------- | --------------------------------------------------------------------------------- | -------------- | -------- |
| Access token  | Webapp memory only (Zustand, not persisted)                                       | Yes (memory)   | 15 min   |
| Refresh token | `HttpOnly; Secure; SameSite=Strict` cookie on the API origin, path `/api/v1/auth` | No             | 30 days  |

Access token claims include `sub`, `aud`, `exp`, `jti` and `sid`. The webapp never derives
permissions or entitlements from claims; it asks the API.

## Flows

**Registration and sign-in.** Forms (React Hook Form + Zod) validate shape only. Credentials
go to the backend over HTTPS with `credentials: 'include'`. The backend returns the access
token in the body and sets the refresh cookie. Error messages never reveal whether an email
is registered. After sign-in the webapp loads the current candidate, then routes to
onboarding (if incomplete) or to the originally requested page. The return path is
validated as a same-origin relative path to prevent open redirects.

**Start-up.** A reload clears memory, so the app performs one **silent refresh** on start.
Protected content is not rendered until it completes.

**Refresh.** Rotation on every use; reuse of an old refresh token revokes the token family
(theft detection), which the webapp experiences as a forced sign-out.

- **Single-flight:** concurrent `401`s trigger one refresh; the others wait, then retry once.
- **Proactive:** refresh shortly before `exp` so active users do not see `401` round trips.
- **Cross-tab:** a `BroadcastChannel` tells other tabs about sign-out or a new session. No
  token is ever sent over the channel.
- **Sockets:** after a refresh, the Socket.IO connection re-authenticates.

**Sign-out.** Call the backend logout endpoint (revokes the refresh family, clears the
cookie); clear the in-memory token, TanStack Query cache and stores; disconnect the socket;
broadcast to other tabs; redirect. Local clean-up happens even if the network call fails.
Whether sign-out also removes this device's push subscription is decided with the
notifications feature (a shared device should not keep receiving a previous user's reminders).

## Protected routes

| Layer                   | Mechanism                                                             | Purpose                                                  |
| ----------------------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| Server (request proxy)  | Next.js `src/proxy.ts` (Next.js 16 replacement for middleware)        | CSP nonce; optimistic redirect when obviously signed out |
| Client (session gate)   | Layouts of `onboarding` and `(candidate)` wait for the silent refresh | Never render protected UI without a session              |
| Backend (authoritative) | Candidate guard and ownership checks on every request                 | Actual access control                                    |

`(auth)` pages redirect signed-in candidates away. `onboarding` is reachable only while the
backend reports onboarding as incomplete.

### Cookie visibility: decision to confirm with the backend

The refresh cookie belongs to the API origin and is path-scoped, so the webapp server cannot
read it. Optimistic server-side redirects therefore need a **non-sensitive session hint
cookie** (no token value, for example `candidate_session=1`, on the parent domain) set and
cleared by the backend. Forging it grants nothing: it only reaches the client gate, which
fails closed. Without it, protection is client gate plus backend, which is still secure but
briefly renders the page shell for signed-out visitors.

A backend-for-frontend that proxies API traffic through the webapp server is **not**
planned: it would duplicate backend responsibilities.

## Unauthorised and forbidden

| Response                       | Meaning                                     | Behaviour                                     |
| ------------------------------ | ------------------------------------------- | --------------------------------------------- |
| `401` after a failed refresh   | No valid session                            | Clear state, go to sign-in, return afterwards |
| `403`                          | Signed in but not allowed (plan, ownership) | `forbidden` screen or inline notice           |
| Account suspended / unverified | Backend error `code`                        | Specific message based on the stable code     |

## PWA and offline interaction

- The service worker never sees or caches authentication traffic: the API is cross-origin and
  not routed through it ([caching strategy](../pwa/caching-strategy.md)).
- An installed app behaves like a tab: memory is cleared when the app is closed, and the
  silent refresh restores the session from the cookie.
- Offline start-up cannot refresh, so the app shows the offline state, not stale data.

## Open items to align with the backend

| Item                     | Needed for                                     |
| ------------------------ | ---------------------------------------------- |
| Session hint cookie      | Server-side optimistic redirects               |
| Email verification flow  | Registration screens                           |
| Onboarding-complete flag | Routing between `onboarding` and `(candidate)` |
| Socket grace period      | Reconnect behaviour after token expiry         |
