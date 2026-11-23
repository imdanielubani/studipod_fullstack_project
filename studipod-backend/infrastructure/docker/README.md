# Docker templates

| Path                              | Used by                             | Purpose                                                                       |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `postgres/init/01-extensions.sql` | `docker-compose.yml`, Dokploy stack | Creates `pg_trgm`, `citext`, `unaccent`, `btree_gist` on first initialisation |
| `valkey/valkey.conf`              | `docker-compose.yml`, Dokploy stack | Persistence, `noeviction` (required by BullMQ), disabled dangerous commands   |

The application image itself is `studipod-backend/Dockerfile`.
