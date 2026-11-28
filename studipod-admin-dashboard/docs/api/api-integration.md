# Backend API integration

> **Status:** the HTTP client (`src/services/http/`) and the administrator authentication
> calls exist. Authentication follows the proposed
> [admin authentication contract](admin-authentication-contract.md); every other endpoint is
> added from the backend's OpenAPI document as each backend module ships.

## Sources of truth

| What                     | Where                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| API conventions          | `studipod-backend/docs/api/api-architecture.md`                    |
| Endpoint contract        | OpenAPI document served by the backend at `/api/docs` when enabled |
| Authentication behaviour | `studipod-backend/docs/security/authentication-architecture.md`    |
| WebSocket events         | `studipod-backend/docs/architecture/websocket-architecture.md`     |

## Configuration

| Variable              | Example (production)               | Used for                   |
| --------------------- | ---------------------------------- | -------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://api.studipod.com/api/v1`  | Base of every REST request |
| `NEXT_PUBLIC_WS_URL`  | `wss://ws.studipod.com`            | Socket.IO connection       |
| `NEXT_PUBLIC_APP_URL` | `https://stuadminapp.studipod.com` | Absolute links, redirects  |

Values are read through `src/config/env.ts`, which validates them with Zod. The backend
must list `NEXT_PUBLIC_APP_URL` in `CORS_ALLOWED_ORIGINS` (with credentials enabled).

## Backend contract the client relies on

- Admin routes live under `/admin` on the API base (for example `<API_URL>/admin/...`).
- Success: `{ "data": ... }`; collections add `meta` (`limit`, `nextCursor`, `hasMore`,
  or page metadata for offset-paginated admin tables).
- Error: `{ "error": { "code", "message", "details", "requestId" } }`. The client
  branches on `code`.
- IDs are UUIDv7 strings; timestamps are ISO 8601 UTC; JSON fields are camelCase.
- `POST` requests that create payments or bookings accept an `Idempotency-Key` header.
- Breaking changes ship as `/api/v2`.

## Planned client layers

```text
services/http-client.ts     fetch wrapper: base URL, credentials, auth header,
                            X-Request-Id, timeout (AbortController), envelope unwrap,
                            typed ApiError, single-flight refresh on 401
services/socket-client.ts   Socket.IO client: token handshake, reconnect after refresh
types/api.ts                ApiSuccess<T>, ApiPage<T>, ApiErrorBody
features/<f>/api/
  ├── keys.ts               query-key factory
  ├── requests.ts           typed request functions (one per endpoint)
  └── queries.ts            useQuery / useMutation hooks
```

Responses that drive security-relevant UI (current admin, permissions) are parsed with
Zod at runtime; other responses use types generated from the OpenAPI document.

### Typed client generation

The backend plans a typed client generated from its OpenAPI document. When it is
available, generated types go into `src/types/generated/` (git-tracked, never edited by
hand) and a `pnpm api:generate` script is added. Until then, types are written by hand
from the OpenAPI document.

## Error handling

| Condition             | Client behaviour                                                      |
| --------------------- | --------------------------------------------------------------------- |
| Network error/timeout | Retry with backoff (queries only), then error state with retry button |
| `400` / `422`         | Map `details[].field` onto form fields                                |
| `401`                 | Single-flight refresh, retry once, otherwise sign out                 |
| `403`                 | Forbidden screen or inline "no permission" notice                     |
| `404`                 | Not-found state for the resource                                      |
| `409`                 | Conflict message from `code` (for example, slot no longer available)  |
| `429`                 | Show "Too many requests"; respect `Retry-After`                       |
| `5xx`                 | Generic error with the `requestId` for support                        |

## Adding an integration (checklist)

1. Confirm the endpoint exists in the backend OpenAPI document.
2. Add the request function, query keys and hooks in the feature's `api/` folder.
3. Declare the permission the endpoint requires next to the hook, for navigation and
   action visibility.
4. Handle loading, empty, error and success states in the UI.
5. Add or extend the Playwright journey that covers the flow.
