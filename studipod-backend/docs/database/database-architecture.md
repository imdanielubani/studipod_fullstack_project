# Database architecture plan

> **Status:** plan only. `prisma/schema.prisma` contains a generator and datasource and **no models**. Models are added domain by domain, each with a reviewed migration.

## Platform

| Item       | Decision                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Engine     | PostgreSQL 18                                                                                                                     |
| ORM        | Prisma 7 with the `prisma-client` generator and the `@prisma/adapter-pg` driver adapter                                           |
| Pooling    | PgBouncer in transaction mode for application traffic (`DATABASE_URL`)                                                            |
| Migrations | Prisma Migrate over a direct connection (`DIRECT_DATABASE_URL`), run by the `migrate` service before each release                 |
| Extensions | `pg_trgm`, `citext`, `unaccent`, `btree_gist` (created by `infrastructure/docker/postgres/init` and declared again in migrations) |
| Search     | Full-text search (`tsvector` + GIN) and trigram similarity (`pg_trgm` GIN) for candidates, resources and subjects                 |

## Conventions

- Primary keys: UUIDv7 (`uuid` column, generated in the application).
- Every table has `created_at` and `updated_at` (`timestamptz`). All timestamps are stored in UTC.
- Table names are plural snake_case (`@@map`), Prisma models are singular PascalCase.
- Soft deletion (`deleted_at`) only where history must remain (users, messages, bookings). Other data is hard-deleted.
- Money is stored as integer minor units (`amount_minor`) plus an ISO 4217 `currency`.
- Enumerated states use PostgreSQL enums for closed sets (booking status) and lookup tables for admin-editable sets (examinations).
- Foreign keys always exist and are indexed. Cascading deletes only inside one aggregate.
- Personal data columns are listed in a data inventory so export and erasure requests (UK GDPR) can be fulfilled.

## Planned domain model

| Domain                         | Main tables (planned)                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Users and authentication       | `users`, `credentials`, `refresh_tokens`, `email_verifications`, `password_resets`                  |
| Candidate profiles             | `candidates`, `profiles`, `profile_backgrounds`                                                     |
| Examinations and subjects      | `examination_categories`, `examinations`, `examination_components`, `subjects`, `topics`            |
| Matching preferences           | `study_preferences`, `preference_subjects`, `match_scores`, `match_dismissals`                      |
| Availability                   | `availability_rules`, `availability_exceptions`                                                     |
| Bookings                       | `bookings`, `booking_participants`, `booking_events`                                                |
| Conversations and messages     | `conversations`, `conversation_participants`, `messages`, `message_receipts`, `message_attachments` |
| Groups                         | `groups`, `group_memberships`, `group_invitations`                                                  |
| Video sessions                 | `video_sessions`, `video_session_participants`                                                      |
| Feedback                       | `session_feedback`, `reports`                                                                       |
| Notifications                  | `notifications`, `notification_preferences`, `push_subscriptions`, `device_tokens`                  |
| Subscriptions and transactions | `plans`, `subscriptions`, `transactions`, `stripe_events`                                           |
| Resources                      | `resources`, `resource_files`, `resource_subjects`                                                  |
| Administration                 | `administrators`, `roles`, `permissions`, `role_permissions`, `administrator_roles`                 |
| Audit                          | `audit_logs` (append-only)                                                                          |
| Support and system             | `support_tickets`, `support_replies`, `system_settings`, `feature_flags`                            |

Key constraints planned from the start:

- **No double booking:** an exclusion constraint on `tstzrange(starts_at, ends_at)` per participant (`btree_gist`) instead of application-only checks.
- **Message ordering:** `messages (conversation_id, id)` index; UUIDv7 provides time ordering for cursor pagination.
- **Webhook idempotency:** unique `stripe_events.event_id`.
- **Audit integrity:** the application database role has `INSERT` and `SELECT` only on `audit_logs` (no `UPDATE`/`DELETE`).

## Database roles

| Role                | Used by                    | Privileges                                                        |
| ------------------- | -------------------------- | ----------------------------------------------------------------- |
| `studipod_owner`    | Migrations only            | Owns the schema; DDL                                              |
| `studipod_app`      | API, gateway, worker       | DML on application tables; `INSERT`/`SELECT` only on `audit_logs` |
| `studipod_readonly` | Analytics, support queries | `SELECT` on non-sensitive views                                   |

The initial deployment uses a single role (`POSTGRES_USER`). Splitting into these roles is a tracked hardening step before public launch.

## Performance

- Expected hot paths: candidate discovery (filtered, ranked search), conversation message lists, availability lookups, notification inboxes. Each gets a composite index designed with `EXPLAIN ANALYZE` against realistic data volumes.
- `log_min_duration_statement=500` in production surfaces slow queries.
- `DATABASE_STATEMENT_TIMEOUT_MS` caps runaway queries.
- Read replicas are not needed initially; the Prisma setup allows a replica client later without code changes in modules.
