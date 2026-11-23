# Monorepo structure

The repository is a single pnpm workspace containing the backend, the two frontends and shared tooling.

```text
studipod_fullstack_project/
├── package.json               Workspace root: shared scripts, pinned pnpm version
├── pnpm-workspace.yaml        Workspace members and the dependency build-script allowlist
├── pnpm-lock.yaml             The single lockfile for every workspace
├── .nvmrc  .editorconfig  .prettierrc  .gitignore  .gitattributes
├── .github/                   CI workflows and Dependabot (GitHub only reads these at the root)
├── packages/
│   ├── tsconfig/              @studipod/tsconfig: shared compiler settings
│   └── eslint-config/         @studipod/eslint-config: shared lint rules
├── studipod-backend/          @studipod/backend
├── studipod-webapp/           Candidate webapp (to be added)
├── studipod-admin-dashboard/  Admin dashboard (to be added)
└── studipod_website/          Marketing site: separate npm project, not part of the pnpm workspace
```

## Conventions

| Item            | Rule                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Package names   | `@studipod/<name>`: `@studipod/backend`, later `@studipod/webapp`, `@studipod/admin-dashboard` |
| Package manager | pnpm, version pinned in the root `packageManager` field                                        |
| Node.js         | 22 LTS (`.nvmrc`, Docker images and CI)                                                        |
| Lockfile        | One root `pnpm-lock.yaml`. Workspaces never have their own lockfile                            |
| Shared config   | Extend `@studipod/tsconfig` and `@studipod/eslint-config` instead of copying settings          |
| Versions        | Dependencies are pinned to exact versions (`pnpm add -E`); Dependabot proposes upgrades        |
| Build scripts   | Dependency install scripts are blocked unless allowed in `pnpm-workspace.yaml` (`allowBuilds`) |

## Adding the webapp or admin dashboard

1. Create the app inside `studipod-webapp/` or `studipod-admin-dashboard/` with a `package.json` named `@studipod/webapp` or `@studipod/admin-dashboard`.
2. Run `pnpm install` from the repository root. The workspace globs already include both folders, so no root file changes are needed.
3. Extend the shared configs (`"extends": "@studipod/tsconfig/base.json"`; add a `react` entry to `@studipod/eslint-config` if needed).
4. Add a workflow such as `.github/workflows/webapp-ci.yml` filtered on the app's path, following `backend-ci.yml`.

A shared `packages/api-client` (generated from the backend OpenAPI document) is the intended way for both frontends to call the API with types. It is created when the first endpoints exist.

## Common commands (from the repository root)

```bash
pnpm install                        # install every workspace
pnpm backend start:dev              # run a backend script (alias for --filter @studipod/backend)
pnpm -r run build                   # build every workspace that has a build script
pnpm --filter @studipod/backend add -E <pkg>@<version>
```

## Deviations from the original structure proposal

| Proposal                                                   | Implemented                                                         | Reason                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `studipod-backend/pnpm-lock.yaml`                          | Root `pnpm-lock.yaml`                                               | pnpm workspaces use one lockfile at the workspace root                     |
| `studipod-backend/.github/workflows/`                      | Root `.github/workflows/backend-ci.yml`                             | GitHub Actions only runs workflows from the repository root                |
| Controller, service and module files in each module folder | README per module folder                                            | Foundation phase: no application code. Files are created with each feature |
| —                                                          | `src/config/video.config.ts`, `push.config.ts`, `config.helpers.ts` | LiveKit and push settings needed their own namespaces                      |
| —                                                          | `Dockerfile.dockerignore`, `jest.config.mjs`, `prisma.config.ts`    | Required by BuildKit (root build context), Jest and Prisma 7               |
