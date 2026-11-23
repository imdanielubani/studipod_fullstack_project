# Authentication architecture plan

> **Status:** plan only. Dependencies (`@nestjs/passport`, `passport-jwt`, `passport-local`, `@nestjs/jwt`, `argon2`, `@fastify/cookie`) are installed and configuration namespaces exist (`jwt`, `app.passwordHashing`). No authentication code exists yet.

## Two separate realms

| Realm         | Client          | Accounts table   | Token audience    | Secrets                                               |
| ------------- | --------------- | ---------------- | ----------------- | ----------------------------------------------------- |
| Candidate     | Webapp          | `users`          | `studipod-webapp` | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`             |
| Administrator | Admin dashboard | `administrators` | `studipod-admin`  | `JWT_ADMIN_ACCESS_SECRET`, `JWT_ADMIN_REFRESH_SECRET` |

Administrators are not candidates with a flag. Separate tables, secrets and audiences mean a stolen candidate token cannot reach admin routes, and a candidate account can never be promoted to admin by a data bug.

## Tokens

| Token         | Lifetime (default)        | Format                                                       | Where the client keeps it                                               |
| ------------- | ------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Access token  | 15 min (admin: 10 min)    | JWT, HS512                                                   | Memory only (never `localStorage`)                                      |
| Refresh token | 30 days (admin: 12 hours) | Opaque random 256-bit value; only its SHA-256 hash is stored | `HttpOnly`, `Secure`, `SameSite=Strict` cookie scoped to `/api/v1/auth` |

Access token claims: `sub` (user ID), `aud`, `iss`, `iat`, `exp`, `jti`, `sid` (session ID), and for admins `roles`. Permissions are resolved server-side, not trusted from the token.

## Flows

- **Registration:** validate input → hash password with Argon2id → create user (unverified) → enqueue verification email. Responses do not reveal whether an email is already registered.
- **Login:** `passport-local` verifies the Argon2id hash (constant-time) → create session → issue access token + refresh cookie. Failed attempts are rate limited per IP and per account; repeated failures trigger temporary lockout with exponential backoff.
- **Refresh with rotation:** every refresh issues a new refresh token and invalidates the old one. Tokens belong to a **family**; reuse of an already-rotated token revokes the whole family (theft detection) and forces re-login.
- **Logout:** revoke the session's refresh family; clear the cookie.
- **Password reset:** single-use token (hashed at rest, 30-minute expiry) sent by email; on success all sessions are revoked.
- **Email verification:** single-use token, 24-hour expiry. Unverified accounts cannot book sessions or message.
- **Admin MFA:** TOTP is mandatory for administrator accounts before admin routes are reachable (planned with the admin module).

## Password hashing

Argon2id with `memoryCost=19456 KiB`, `timeCost=2`, `parallelism=1` (OWASP minimum), configurable via `ARGON2_*`. Parameters are stored in the hash string, so they can be raised later and hashes upgraded on next login. Passwords: minimum 12 characters, maximum 128, checked against a breached-password list; no composition rules.

## Authorisation

- Candidate routes: `JwtAuthGuard` (candidate audience) plus ownership checks in services (a candidate can only read their own bookings, conversations they belong to, and so on).
- Admin routes: `AdminJwtGuard` (admin audience) + `PermissionsGuard` checking `resource:action` permissions resolved from roles.
- WebSocket connections authenticate with the same access token during the Socket.IO handshake (see [WebSocket architecture](../architecture/websocket-architecture.md)).
- Every admin action and every security event (login, failed login, password change, role change, token reuse) writes an audit log entry.
