# Admin authentication contract

> **Status:** proposed by the dashboard; not yet implemented in `studipod-backend`.
> The code source of truth is `src/features/authentication/api/contract.ts`. Any change
> must update that file, this document and the backend together.

All paths are relative to `NEXT_PUBLIC_API_URL` (for example `https://api.studipod.com/api/v1`)
and use the standard envelopes from `studipod-backend/docs/api/api-architecture.md`.
Requests are sent with `credentials: 'include'` and an `X-Request-Id` header.

## Proposed envelope addition: `error.meta`

Some errors need structured context that is not a field problem (remaining attempts, lock
expiry). The dashboard reads it from an optional `error.meta` object:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Incorrect email or password.",
    "meta": { "attemptsRemaining": 2 },
    "requestId": "req_7f3a21"
  }
}
```

When `meta` is missing the screens fall back to generic copy.

## Endpoints

| Method | Path                                 | Body                          | Success (`data`)                                                 |
| ------ | ------------------------------------ | ----------------------------- | ---------------------------------------------------------------- |
| POST   | `admin/auth/sign-in`                 | `{ email, password }`         | `{ challengeId, maskedEmail, codeExpiresAt, resendAvailableAt }` |
| POST   | `admin/auth/sign-in/verify`          | `{ challengeId, code }`       | Session (below) + sets the refresh cookie                        |
| POST   | `admin/auth/sign-in/resend-code`     | `{ challengeId }`             | `{ codeExpiresAt, resendAvailableAt }`                           |
| POST   | `admin/auth/refresh`                 | none (refresh cookie)         | Session + rotates the refresh cookie                             |
| POST   | `admin/auth/sign-out`                | none (`Authorization` header) | `204`; revokes the refresh family and clears the cookie          |
| POST   | `admin/auth/password/forgot`         | `{ email }`                   | `202` always (never reveals whether an account exists)           |
| POST   | `admin/auth/password/reset/validate` | `{ token }`                   | `{ email }`                                                      |
| POST   | `admin/auth/password/reset`          | `{ token, password }`         | `204`; revokes every session for the account                     |
| POST   | `admin/auth/access-requests`         | `{ accessRequestToken }`      | `202`; notifies Super Admins                                     |

Session:

```json
{
  "accessToken": "eyJ…",
  "accessTokenExpiresAt": "2026-11-28T10:10:00Z",
  "administrator": {
    "id": "0193…",
    "email": "daniel.ubani@studipod.com",
    "firstName": "Daniel",
    "lastName": "Ubani",
    "roles": ["super-admin"],
    "permissions": ["users:read", "users:update"]
  },
  "currentSignIn": { "at": "2026-11-28T08:14:00Z", "location": "Lagos, NG" },
  "lastSignIn": { "at": "2026-11-27T08:14:00Z", "location": "Lagos, NG" }
}
```

`currentSignIn` (this session, shown in the account menu) and `lastSignIn` (the previous
session, shown once after signing in) are optional and may be `null`; on refresh the backend
returns the `currentSignIn` of the session being refreshed. Timestamps are ISO 8601 with an offset.

## Refresh cookie

`HttpOnly; Secure; SameSite=Strict`, set by the API on verify and refresh, scoped to the
admin auth path. The dashboard never reads it. `NEXT_PUBLIC_APP_URL` must be in the backend
CORS allowlist with credentials enabled.

## Error codes

| Code                        | HTTP | When                                        | `meta`                                                                                   |
| --------------------------- | ---- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `INVALID_CREDENTIALS`       | 401  | Wrong email or password (never says which)  | `{ attemptsRemaining }`                                                                  |
| `ACCOUNT_LOCKED`            | 423  | 5 failed attempts; locked for 15 minutes    | `{ lockedUntil }`                                                                        |
| `ADMIN_ACCESS_DENIED`       | 403  | Valid credentials, but not an administrator | `{ reason: NOT_STAFF \| NO_ADMIN_ROLE, email, attemptedAt, accessRequestToken? }`        |
| `CODE_INCORRECT`            | 400  | Wrong 6-digit code                          | `{ attemptsRemaining }`                                                                  |
| `CODE_EXPIRED`              | 410  | Code older than 10 minutes                  | none                                                                                     |
| `CHALLENGE_EXPIRED`         | 410  | Challenge unknown, used, or out of attempts | none                                                                                     |
| `RESEND_TOO_SOON`           | 429  | Resend before the 45-second cooldown        | `{ resendAvailableAt }`                                                                  |
| `RESET_LINK_INVALID`        | 410  | Reset token expired, used or unknown        | none                                                                                     |
| `PASSWORD_POLICY_VIOLATION` | 422  | New password rejected                       | `{ rule: TOO_SHORT \| TOO_LONG \| RECENTLY_USED \| CONTAINS_PERSONAL_INFO \| BREACHED }` |
| `UNAUTHENTICATED`           | 401  | Refresh without a valid refresh cookie      | none                                                                                     |
| `RATE_LIMITED`              | 429  | Too many requests                           | none                                                                                     |

The `requestId` of an `ADMIN_ACCESS_DENIED` response is shown to the user as the reference.

## Rules the backend enforces

- **No account enumeration:** unknown emails get the same `INVALID_CREDENTIALS` shape (with a
  plausible `attemptsRemaining`), status code and response time as known ones; locks apply
  per email whether or not it exists.
- **CSRF:** `refresh` and `sign-out` rely on the cookie, so the backend validates `Origin`
  against the CORS allowlist and requires the `X-Request-Id` header the dashboard sends on
  every request (a custom header forces a CORS preflight). CORS allows only the dashboard
  origin with credentials.
- **Sign-out** revokes the refresh-token family identified by the cookie, not only the
  access token in the `Authorization` header.
- **Idle limit:** the refresh family expires after 24 hours without use, independently of
  the dashboard's own inactivity timer.

- Only `@studipod.com` accounts can be administrators.
- Codes: 6 digits, valid 10 minutes, resend after 45 seconds, a resend invalidates the old code.
- 5 failed sign-ins lock the account for 15 minutes and notify Super Admins.
- Passwords: 12 to 128 characters, not one of the last 5, not containing the name or email,
  not in a breached-password list.
- Resetting a password signs the account out everywhere.
- Every attempt (success, failure, lock, denial) is written to the audit log.

## Development mock

With `NEXT_PUBLIC_AUTH_MOCK=true` in a non-production build, the dashboard uses an in-memory
implementation (`src/features/authentication/api/mock-auth-api.ts`). Production builds remove
it. Scenarios:

| Input                                               | Result                                      |
| --------------------------------------------------- | ------------------------------------------- |
| Any `@studipod.com` email + `correct-horse-battery` | Code step                                   |
| Wrong password                                      | `INVALID_CREDENTIALS`; locks after 5        |
| `locked@studipod.com`                               | `ACCOUNT_LOCKED`                            |
| `no-role@studipod.com` + correct password           | Access denied (no admin role)               |
| Non-studipod email + correct password               | Access denied (candidate account)           |
| `offline@studipod.com`                              | Network error                               |
| Code `123456`                                       | Signed in                                   |
| Code `000000`                                       | `CODE_EXPIRED`                              |
| Any other code                                      | `CODE_INCORRECT`                            |
| `/reset-password?token=valid-reset-token`           | Set a new password                          |
| `/reset-password?token=expired-reset-token`         | Link expired                                |
| New password containing "password"                  | `PASSWORD_POLICY_VIOLATION` (recently used) |
