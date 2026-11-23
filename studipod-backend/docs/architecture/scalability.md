# Scalability plan

**Long-term targets:** 100,000 registered users, with growth towards 10,000+ concurrent users.

**What this document does not claim:** a single VPS has not been shown to support these numbers. Capacity is established by load testing (k6 for HTTP, Artillery for Socket.IO) on the real infrastructure, and the system scales out as the measurements require.

## Design properties that allow scaling out

| Property                  | How                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Stateless API             | No in-memory sessions; JWT access tokens; rate-limit counters and idempotency keys in Valkey                             |
| Separate process types    | API, WebSocket gateway and worker scale independently from one image                                                     |
| WebSocket fan-out         | Socket.IO Redis adapter; presence in Valkey; sticky sessions only for the polling fallback                               |
| Connection pooling        | PgBouncer in transaction mode: many app replicas share a bounded PostgreSQL pool                                         |
| Work off the request path | Email, push, media and recomputation run in BullMQ workers                                                               |
| Object storage separated  | Files go browser → R2 via presigned URLs; the API never streams file bodies                                              |
| Video separated           | LiveKit Cloud carries all media; the API only issues tokens                                                              |
| Portable data services    | PostgreSQL and Valkey are addressed by URL, so they can move to dedicated hosts or managed services without code changes |

## Growth stages (indicative, confirmed by measurement)

| Stage | Trigger (measured)                                                 | Change                                                                                                        |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 1     | Launch                                                             | One VPS: API, gateway, worker, PostgreSQL, PgBouncer, Valkey (Dokploy)                                        |
| 2     | VPS CPU or memory sustained above 70%, or p95 latency above target | Move PostgreSQL (and its backups) to a dedicated VPS; raise its resources                                     |
| 3     | API or gateway saturated                                           | Add a second application VPS; run API and gateway replicas on both behind Traefik / Cloudflare load balancing |
| 4     | Valkey memory or ops limit                                         | Dedicated Valkey host; split cache and queue instances                                                        |
| 5     | Read load dominates PostgreSQL                                     | Read replica for discovery, analytics and admin reporting                                                     |
| 6     | Search relevance or latency insufficient in PostgreSQL             | Evaluate Meilisearch with a documented benchmark                                                              |

## Performance budgets (initial targets, to be validated)

| Path                                       | Target                     |
| ------------------------------------------ | -------------------------- |
| Authenticated REST reads                   | p95 < 200 ms at the origin |
| Writes (booking, message send)             | p95 < 300 ms               |
| Message delivery (send → recipient socket) | p95 < 500 ms               |
| Error rate                                 | < 0.5% under expected peak |

## Load testing

- `test/load/k6/`: HTTP scenarios (login, discovery search, booking flow) with thresholds matching the budgets above. k6 is a standalone binary (`k6 run test/load/k6/<scenario>.js`), not an npm package.
- `test/load/artillery/`: Socket.IO scenarios (connect, join conversation, send and receive) via `pnpm test:load:artillery <file>`.
- Load tests run against staging, never production, with synthetic accounts.
- Results are recorded with the date, commit and infrastructure size so capacity decisions are evidence-based.
