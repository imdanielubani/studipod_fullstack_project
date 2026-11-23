# WebSocket architecture plan

> **Status:** plan only. `socket.io`, `@nestjs/websockets`, `@nestjs/platform-socket.io` and `@socket.io/redis-adapter` are installed. No gateway or event exists yet.

## Process and routing

- Real-time traffic runs in the **WebSocket gateway** process (`websocket` service, port 3001, `ws.<domain>`), separate from the REST API, so thousands of idle sockets do not consume API capacity.
- Cloudflare proxies WebSockets; Traefik routes `ws.<domain>` to the gateway with sticky cookies so the long-polling fallback works across replicas.
- Clients connect with the Socket.IO client using `transports: ['websocket', 'polling']`.

## Authentication

1. The client connects with its access token in the handshake `auth` payload (not the query string, which ends up in logs).
2. A connection middleware verifies the JWT (same secrets and audience rules as REST). Invalid tokens are rejected before the connection is established.
3. The socket joins `user:<userId>`. Joining any other room (conversation, group) requires a server-side membership check.
4. When an access token expires, the client refreshes over REST and re-authenticates the socket; the server disconnects sockets whose token expired more than a grace period ago.

## Namespaces and rooms

| Namespace        | Rooms                             | Used for                                           |
| ---------------- | --------------------------------- | -------------------------------------------------- |
| `/chat`          | `conversation:<id>`, `group:<id>` | Message delivery, typing indicators, read receipts |
| `/notifications` | `user:<id>`                       | In-app notifications, booking updates              |
| `/presence`      | `user:<id>`                       | Online/offline state for study partners            |
| `/admin`         | `admin:<id>`, `admin:broadcast`   | Live dashboard counters (admin token required)     |

## Event contracts

- Event names are `domain:action` (`message:created`, `booking:updated`, `typing:started`).
- Payload types live in `src/websocket/events/` and are exported for the clients, so both sides share one definition.
- Client-to-server events are validated with the same DTO rules as REST and acknowledged with `{ ok: true }` or the standard error envelope.
- **Writes go through REST**, which persists to PostgreSQL and then publishes the event. The socket is a delivery channel, not the source of truth, so a lost socket message never loses data: clients re-sync via REST on reconnect.

## Scaling

- `@socket.io/redis-adapter` on Valkey broadcasts events across all gateway replicas.
- The API and worker publish events through the adapter's emitter (or Redis pub/sub), so they can notify users without holding sockets.
- Presence uses Valkey keys with TTL heartbeats, not in-process memory.
- Per-connection rate limits on client events (for example typing at most 2 per second) protect the gateway.
- Capacity target per gateway replica is set by load testing (Artillery Socket.IO engine), not assumed.
