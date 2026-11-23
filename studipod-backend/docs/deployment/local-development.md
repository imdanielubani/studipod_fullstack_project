# Local development

## Prerequisites

| Tool           | Version            | Notes                                                                                         |
| -------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| Node.js        | 22 LTS (`.nvmrc`)  | Prisma 7 supports Node 20.19+, 22.12+ and 24+. Use 22 to match production                     |
| pnpm           | 12.21.0            | `npm install -g pnpm@12.21.0` (or `npx pnpm@12.21.0 <command>`)                               |
| Docker Desktop | Recent, Compose v2 | Runs PostgreSQL, Valkey and optionally PgBouncer                                              |
| k6             | Optional           | Standalone binary for HTTP load tests (https://grafana.com/docs/k6/latest/set-up/install-k6/) |

## First run

```bash
cd studipod-backend
pnpm install
cp .env.development.example .env       # then replace the change-me secrets:
./infrastructure/scripts/generate-secrets.sh

pnpm infra:up                          # PostgreSQL 18 + Valkey 9 on 127.0.0.1
pnpm prisma:generate                   # generates the Prisma client into src/database/prisma/generated
pnpm start:dev                         # API on http://localhost:3000 (watch mode)
```

Until features exist, the API starts and listens but serves no routes (requests return 404).

## Everyday commands (inside `studipod-backend/`)

| Command                                                                  | Does                                         |
| ------------------------------------------------------------------------ | -------------------------------------------- |
| `pnpm start:dev`                                                         | Run the API with reload                      |
| `pnpm build`                                                             | Compile to `dist/`                           |
| `pnpm typecheck`                                                         | Type-check `src`, `test`, Prisma config      |
| `pnpm lint` / `pnpm lint:fix`                                            | ESLint (type-aware)                          |
| `pnpm format` / `pnpm format:check`                                      | Prettier                                     |
| `pnpm test` / `test:unit` / `test:integration` / `test:e2e` / `test:cov` | Jest projects (80% coverage threshold)       |
| `pnpm prisma:migrate:dev --name <change>`                                | Create and apply a migration                 |
| `pnpm prisma:studio`                                                     | Browse the local database                    |
| `pnpm db:seed`                                                           | Run `prisma/seed/index.ts` (once it exists)  |
| `pnpm infra:up` / `pnpm infra:down`                                      | Start or stop local containers               |
| `docker compose --profile pooling up -d`                                 | Also start PgBouncer on `127.0.0.1:6432`     |
| `docker compose --profile app up -d --build`                             | Run the API container against local services |

## Ports

| Service    | Address                                    |
| ---------- | ------------------------------------------ |
| API        | `localhost:3000`                           |
| WebSocket  | `localhost:3001` (when the gateway exists) |
| Webapp     | `localhost:3100` (reserved)                |
| Admin      | `localhost:3200` (reserved)                |
| PostgreSQL | `127.0.0.1:5432`                           |
| PgBouncer  | `127.0.0.1:6432`                           |
| Valkey     | `127.0.0.1:6379`                           |

## Troubleshooting

- **`ERR_PNPM_IGNORED_BUILDS`:** a new dependency wants to run an install script. Review what it does, then add it to `allowBuilds` in `pnpm-workspace.yaml` as `true` or `false`.
- **Prisma warns about the Node.js version:** switch to Node 22 (`nvm use`).
- **Port already in use** (on Windows also `bind: An attempt was made to access a socket in a way forbidden`): a native PostgreSQL or Redis already listens there. Set `POSTGRES_HOST_PORT` / `REDIS_HOST_PORT` in `.env` (for example `5434`) and use the same port in `DATABASE_URL`, `DIRECT_DATABASE_URL` and `REDIS_URL`.
- **Resetting local data:** `docker compose down -v` deletes the local volumes.
