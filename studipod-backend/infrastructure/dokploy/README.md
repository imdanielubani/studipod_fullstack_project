# Dokploy

[`docker-compose.production.yml`](docker-compose.production.yml) is the production and staging stack. Create **one Dokploy Compose application per environment** (for example `studipod-backend-staging` and `studipod-backend-production`), each with its own environment variables, volumes and domains.

| Setting      | Value                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Source       | This GitHub repository, branch `main` (production) or `staging`                                      |
| Compose path | `studipod-backend/infrastructure/dokploy/docker-compose.production.yml`                              |
| Environment  | All keys from `studipod-backend/.env.production.example`, plus `API_DOMAIN` and `WS_DOMAIN`          |
| Domains      | `api.<domain>` to `api:3000`; `ws.<domain>` to `websocket:3001` when the realtime profile is enabled |

## Release order

1. Dokploy builds the images from the Dockerfile (context: repository root).
2. `migrate` runs `prisma migrate deploy` against PostgreSQL directly and exits.
3. `api` starts only after `migrate` completed successfully.

Migrations must be backwards compatible with the previous release (expand, then contract), so a rollback of the application image never requires a database rollback.

## Services and exposure

| Service     | Networks                  | Public           | Notes                                                      |
| ----------- | ------------------------- | ---------------- | ---------------------------------------------------------- |
| `api`       | internal, dokploy-network | Via Traefik only | Read-only filesystem, all capabilities dropped             |
| `websocket` | internal, dokploy-network | Via Traefik only | Profile `realtime`; sticky sessions for polling fallback   |
| `worker`    | internal, egress          | No               | Profile `workers`                                          |
| `migrate`   | internal                  | No               | One-off, exits after migrating                             |
| `postgres`  | internal                  | No               | No published ports                                         |
| `pgbouncer` | internal                  | No               | Transaction pooling, port 6432                             |
| `valkey`    | internal                  | No               | Password required (via stdin), dangerous commands disabled |

## Scaling out later

Everything stateful sits behind a hostname in an environment variable (`DATABASE_URL`, `DIRECT_DATABASE_URL`, `REDIS_URL`). Moving PostgreSQL or Valkey to a dedicated host, or running more API and gateway replicas on additional servers, changes environment values and removes services from this file. It does not change application code. See [scalability](../../docs/architecture/scalability.md).
