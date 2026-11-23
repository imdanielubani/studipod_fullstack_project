# Repository structure

The repository holds three independent applications side by side. Each one owns its own `package.json`, lockfile, tooling configuration and `node_modules`. Nothing is shared through the repository root.

```text
studipod_fullstack_project/
├── .github/                   CI workflows and Dependabot (GitHub only reads these at the root)
├── .gitignore  .gitattributes
├── studipod-backend/          @studipod/backend: API, WebSocket gateway, workers
│   ├── package.json           Scripts, dependencies, pinned pnpm version
│   ├── pnpm-lock.yaml         Backend lockfile
│   ├── pnpm-workspace.yaml    pnpm settings: engine check, overrides, build-script allowlist
│   ├── tsconfig.json          TypeScript settings
│   ├── eslint.config.mjs      Lint rules
│   └── .nvmrc  .editorconfig  .prettierrc
├── studipod-webapp/           Candidate webapp (to be added)
└── studipod-admin-dashboard/  Admin dashboard (to be added)
```

## Conventions

| Item            | Rule                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Package names   | `@studipod/<name>`: `@studipod/backend`, later `@studipod/webapp`, `@studipod/admin-dashboard` |
| Package manager | pnpm, version pinned in each app's `packageManager` field                                      |
| Node.js         | 22 LTS (`.nvmrc`, Docker images and CI)                                                        |
| Lockfile        | One `pnpm-lock.yaml` per app, inside the app folder                                            |
| Commands        | Run from inside the app folder (`cd studipod-backend`)                                         |
| Versions        | Dependencies are pinned to exact versions (`pnpm add -E`); Dependabot proposes upgrades        |
| Build scripts   | Dependency install scripts are blocked unless allowed in `pnpm-workspace.yaml` (`allowBuilds`) |

## Adding the webapp or admin dashboard

1. Create the app inside `studipod-webapp/` or `studipod-admin-dashboard/` with its own `package.json` (`@studipod/webapp` or `@studipod/admin-dashboard`), lockfile and tooling configuration.
2. Add a workflow such as `.github/workflows/webapp-ci.yml` filtered on the app's path, following `backend-ci.yml`, and a Dependabot entry for the app's directory.

The frontends call the API through a typed client generated from the backend OpenAPI document. Where that client lives is decided when the first endpoints exist.

## Common commands (inside `studipod-backend/`)

```bash
pnpm install
pnpm start:dev
pnpm add -E <pkg>@<version>
```

## Deviations from the original structure proposal

| Proposal                                                   | Implemented                                                         | Reason                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `studipod-backend/.github/workflows/`                      | Root `.github/workflows/backend-ci.yml`                             | GitHub Actions only runs workflows from the repository root                |
| Controller, service and module files in each module folder | README per module folder                                            | Foundation phase: no application code. Files are created with each feature |
| —                                                          | `src/config/video.config.ts`, `push.config.ts`, `config.helpers.ts` | LiveKit and push settings needed their own namespaces                      |
| —                                                          | `jest.config.mjs`, `prisma.config.ts`                               | Required by Jest and Prisma 7                                              |
