# Seed data

**Status:** reserved. No seed script exists yet.

When reference data is defined (examination categories, examinations, subjects, roles, permissions), add `index.ts` here. `prisma.config.ts` already runs it with `pnpm db:seed`.

Rules:

- Seeds must be idempotent (upsert by natural key) so they can run on every deploy.
- Seeds contain reference data only. Never seed real personal data or credentials.
- Development fixtures (fake candidates) live in a separate script that refuses to run when `APP_ENV` is `staging` or `production`.
