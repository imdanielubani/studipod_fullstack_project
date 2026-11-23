# Studipod

Monorepo for Studipod, a platform for medical examination preparation, peer learning, candidate matching, communication and video practice.

| Folder                      | Package                     | Status                                     |
| --------------------------- | --------------------------- | ------------------------------------------ |
| `studipod-backend/`         | `@studipod/backend`         | Foundation in place (no features yet)      |
| `studipod-webapp/`          | `@studipod/webapp`          | Reserved                                   |
| `studipod-admin-dashboard/` | `@studipod/admin-dashboard` | Reserved                                   |
| `packages/tsconfig/`        | `@studipod/tsconfig`        | Shared TypeScript configs                  |
| `packages/eslint-config/`   | `@studipod/eslint-config`   | Shared ESLint configs                      |
| `studipod_website/`         | (npm project)               | Marketing site, outside the pnpm workspace |

## Requirements

Node.js 22 LTS and pnpm 12 (`npm install -g pnpm@12.21.0`).

```bash
pnpm install          # installs every workspace
pnpm backend start:dev
```

See [studipod-backend/README.md](studipod-backend/README.md) and [docs/architecture/monorepo-structure.md](studipod-backend/docs/architecture/monorepo-structure.md).
