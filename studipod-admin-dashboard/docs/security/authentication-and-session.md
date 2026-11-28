# Authentication and session architecture

> **Status:** implemented in the dashboard against the proposed
> [admin authentication contract](../api/admin-authentication-contract.md). The backend
> module does not exist yet, so local development and the end-to-end tests use the
> development mock. The backend (`studipod-backend`) owns every authentication and
> authorisation decision; this document describes how the dashboard takes part.

## Screens and code

| Route                     | Screen                                        | Code (`src/features/authentication/components/`) |
| ------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `/sign-in`                | Work email and password, all error states     | `sign-in-form.tsx`                               |
| `/sign-in/verify`         | Emailed 6-digit code (step 2 of 2)            | `verify-code-form.tsx`                           |
| `/forgot-password`        | Request a reset link, "check your email"      | `forgot-password-form.tsx`                       |
| `/reset-password?token=…` | Choose a new password, expired link           | `reset-password-form.tsx`                        |
| `/access-denied`          | Valid account without an admin role           | `access-denied-view.tsx`                         |
| `(dashboard)/*`           | Session gate, timeout warning, expired dialog | `session-gate.tsx`, `session-timeout.tsx`        |

State between screens (pending code challenge, access-denied details, sign-in notices,
prefilled email) lives in an in-memory store (`session/auth-flow-store.ts`), never in the
URL, so email addresses and challenge ids stay out of browser history and server logs.

## Principles

1. **The backend is the source of truth.** Every admin API request is authenticated and
   authorised by the backend (`AdminJwtGuard` + `PermissionsGuard`, admin token audience
   `studipod-admin`). Dashboard checks only decide what to _show_.
2. **No long-lived secret is readable by JavaScript.** The refresh token lives only in an
   `HttpOnly` cookie. The access token lives only in memory. Nothing auth-related is written
   to `localStorage`, `sessionStorage`, IndexedDB or a non-`HttpOnly` cookie.
3. **Administrators are a separate realm.** Admin accounts, secrets and token audience are
   separate from candidate accounts. A candidate token is never accepted by the dashboard.
4. **Fail closed.** If the session state is unknown, the dashboard behaves as signed out.

## Sign-in (login)

Confirmed product rules:

- Work email + password, followed by a **6-digit code emailed to the work email**.
- The code expires after 10 minutes; resend is available after 45 seconds.
- 5 failed attempts lock the account for 15 minutes; Super Admins are notified.
- Only `@studipod.com` accounts are invited.

Flow:

1. The sign-in form (React Hook Form + Zod) validates input shape only; it never decides
   whether credentials are valid.
2. The dashboard sends credentials to the backend admin authentication endpoint over HTTPS
   with `credentials: 'include'`.
3. The backend answers with a "code required" step; the dashboard shows the code form.
4. On a valid code the backend issues the **access token** (response body) and the
   **refresh token** (`Set-Cookie`, `HttpOnly; Secure; SameSite=Strict`, path-scoped to
   the auth routes).
5. The dashboard keeps the access token, administrator profile and effective permissions
   from the session response in memory (Zustand store, not persisted) and opens the
   dashboard. Returning to the originally requested page is deferred until there are
   console pages worth deep-linking; it must accept same-origin relative paths only.

Error messages never reveal whether an email is registered.

## Token lifecycle

| Token         | Held by                                     | Readable by JS | Lifetime (backend default) |
| ------------- | ------------------------------------------- | -------------- | -------------------------- |
| Access token  | Dashboard memory only                       | Yes (memory)   | 10 minutes                 |
| Refresh token | `HttpOnly` cookie on the API origin         | No             | Set by the backend         |
| Session ID    | Inside the access token (`sid`), server row | n/a            | Until revoked or expired   |

- A full page reload clears memory, so on start-up the dashboard performs one **silent
  refresh** to obtain a new access token. Until it completes, protected content is not
  rendered.
- The API client attaches `Authorization: Bearer <access token>` to admin requests.

## Refresh token strategy

- **Rotation:** every refresh returns a new refresh cookie and invalidates the previous one.
  Reuse of an old token revokes the whole token family on the backend (theft detection),
  which the dashboard experiences as a forced sign-out.
- **Single-flight:** when several requests receive `401` at once, only one refresh call is
  made; the others wait for it and then retry once. A failed refresh signs the user out.
- **Proactive refresh:** shortly before the access token's `exp`, the client refreshes in
  the background so active users do not see `401` round trips.
- **Cross-tab coordination:** a `BroadcastChannel` message tells other open tabs about
  sign-out (and about a new session), so a signed-out tab does not keep stale data visible.
  No token is ever sent over the channel.

## Session expiration

Confirmed product rule: **signed out after 24 hours of inactivity**, with a **2-minute
warning** first, and no maximum session length.

- Inactivity is tracked client-side from user input events; the warning dialog offers
  "Stay signed in" (triggers a refresh) or "Sign out".
- The backend remains authoritative: when it rejects a refresh because the session expired
  or was revoked, the dashboard signs out regardless of the client timer.
- On expiry the dashboard clears the in-memory token, the TanStack Query cache and any
  Zustand state that holds admin data, then redirects to sign-in with a "session expired"
  notice.

## Logout

1. Call the backend logout endpoint (revokes the refresh token family and clears the cookie).
2. Clear in-memory token, query cache and stores; broadcast sign-out to other tabs.
3. Redirect to sign-in. Local clean-up happens even if the network call fails.

## Protected routes

Two layers, neither of which replaces backend authorisation:

| Layer                   | Mechanism                                                 | Purpose                                                                                     |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Server (request proxy)  | Next.js `src/proxy.ts` (planned, not implemented yet)     | Security headers/CSP nonce; optimistic redirect of obviously signed-out requests to sign-in |
| Client (session gate)   | Dashboard route-group layout waits for the silent refresh | Never renders protected UI without a session                                                |
| Backend (authoritative) | Admin guard + permission guard on every request           | Actual access control                                                                       |

The `(auth)` route group holds sign-in screens; the `(dashboard)` route group holds every
protected page and shares the session gate.

### Cookie visibility: decision to confirm with the backend

The refresh cookie is set by the API origin, so the dashboard's own server cannot read it.
For the proxy's optimistic redirect to work, one of these is required:

1. **Recommended:** the backend also sets a non-sensitive session _hint_ cookie (no token
   value; for example `admin_session=1`) for the parent domain. The proxy only uses it to
   skip rendering for obviously signed-out visitors. It grants nothing: forging it only
   reaches the client session gate, which fails closed.
2. Without a hint cookie, protection is client gate + backend only. Still secure, but
   signed-out visitors briefly load the page shell before redirecting.

A backend-for-frontend that proxies all API traffic through the dashboard server is
**not** planned: it would duplicate backend responsibilities.

## Permission-based navigation

- After sign-in the dashboard loads the administrator's effective permissions
  (`resource:action` strings resolved by the backend from roles). Permissions are never
  derived from token claims on the client.
- Navigation items, page actions and row-level menu items declare the permission they need
  and are hidden or disabled when it is missing.
- Permissions are refetched after a role change event and on session refresh.
- Hiding a control is a convenience. The backend still returns `403` for any request
  that is not permitted.

## Unauthorised and forbidden access

| Response                         | Meaning                     | Dashboard behaviour                                                |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| `401` (after a failed refresh)   | No valid session            | Clear state, go to sign-in, return to the original page afterwards |
| `403` on an admin request        | Signed in, lacks permission | Inline "no permission" notice (built with the console pages)       |
| `ADMIN_ACCESS_DENIED` at sign-in | Valid account, not an admin | The `/access-denied` screen                                        |
| Account locked / disabled        | Backend error code          | Show the specific message from the stable error `code`             |

Dashboard code branches on the backend's stable error `code`, never on `message` text.

## Sensitive actions

Confirmed product rule: sensitive actions (role changes, suspensions, refunds, data
exports and similar) require a **reason** and a **re-check with an emailed code**, and
are always audited. The dashboard collects the reason and code; the backend verifies the
code, performs the action and writes the audit record.

## Administrative audit trail

- The backend writes an audit entry for every admin action and security event (sign-in,
  failed sign-in, role change, token reuse and so on). The dashboard never writes audit
  records itself and never sends an "audit" call that the backend could trust.
- The dashboard sends an `X-Request-Id` header per request so support can correlate a
  dashboard error with backend logs and audit entries.
- The Audit logs area is read-only and permission-gated.

## Open items to align with the backend

| Item                   | Backend plan today                      | Confirmed admin product rule                |
| ---------------------- | --------------------------------------- | ------------------------------------------- |
| Second sign-in factor  | TOTP mandatory for administrators       | 6-digit code emailed to the work email      |
| Admin session length   | Admin refresh token 12 hours            | 24 hours of inactivity, no maximum length   |
| Session hint cookie    | Not planned                             | Needed for server-side optimistic redirects |
| Admin auth cookie path | Refresh cookie scoped to `/api/v1/auth` | Admin realm path to be confirmed            |

These must be resolved when the backend admin authentication module is built. The
dashboard already follows the confirmed product rules.
