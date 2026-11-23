# Background job architecture plan

> **Status:** plan only. `bullmq`, `@nestjs/bullmq`, `@nestjs/schedule` and `ioredis` are installed. No queue, producer or processor exists yet.

## Components

| Component         | Location                         | Role                                                                                              |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Queue definitions | `src/queues/jobs/`               | Queue names, job names and typed payload contracts                                                |
| Producers         | `src/queues/producers/`          | Thin services used by feature modules to enqueue jobs                                             |
| Processors        | `src/queues/processors/`         | BullMQ workers; run only in the **worker** process                                                |
| Scheduler         | `@nestjs/schedule` in the worker | Repeating housekeeping tasks (BullMQ repeatable jobs preferred where retry and visibility matter) |

The API and gateway only **produce** jobs. Only the worker process **consumes** them. This keeps slow work off request threads and lets workers scale on queue depth.

## Planned queues

| Queue           | Example jobs                                                    | Concurrency | Notes                                               |
| --------------- | --------------------------------------------------------------- | ----------- | --------------------------------------------------- |
| `email`         | verification, password reset, booking confirmation, digests     | 10          | Rate limited to the Resend plan                     |
| `push`          | Web Push and FCM delivery                                       | 20          | Remove dead subscriptions on 404/410                |
| `notifications` | fan-out of one domain event to in-app, email and push           | 10          |                                                     |
| `reminders`     | session reminders (24 h and 15 min before)                      | 10          | Delayed jobs; cancelled when a booking is cancelled |
| `matching`      | recompute match scores after preference or availability changes | 2           | Debounced per candidate (job ID = candidate ID)     |
| `media`         | Sharp image resizing, upload scanning, R2 cleanup               | 2           | CPU heavy; isolate if it grows                      |
| `payments`      | Stripe webhook event processing                                 | 5           | Idempotent on Stripe event ID                       |
| `analytics`     | nightly aggregates for the admin dashboard                      | 1           | Repeatable job                                      |
| `maintenance`   | expire tokens, purge soft-deleted data past retention           | 1           | Repeatable job                                      |

## Reliability rules

1. **Idempotent processors.** Every job can run more than once safely (BullMQ guarantees at-least-once delivery).
2. **Retries with exponential backoff:** default 5 attempts, starting at 10 seconds. Permanent failures (validation errors) fail immediately.
3. **Failed jobs are kept** (bounded with `removeOnFail: { age: 7 days }`) and visible to administrators; completed jobs are trimmed (`removeOnComplete: { count: 1000 }`).
4. **Small payloads.** Jobs carry IDs, not full records or personal data; processors load current state from PostgreSQL.
5. **Transactional enqueueing.** When a job must follow a database write, enqueue after commit (or use an outbox table for critical paths such as payments).
6. **Graceful shutdown.** Workers finish or release active jobs on `SIGTERM` before the container stops.
7. **Valkey must not evict.** `maxmemory-policy noeviction` is set in `valkey.conf`; queue keys use the `BULLMQ_PREFIX` prefix.
