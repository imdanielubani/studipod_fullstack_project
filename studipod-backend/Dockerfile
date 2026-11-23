# syntax=docker/dockerfile:1.7
#
# Studipod backend image.
#
# Build context MUST be the monorepo root, because the pnpm lockfile and the
# shared workspace packages live there:
#
#   docker build -f studipod-backend/Dockerfile -t studipod-backend .
#
# Targets:
#   runtime  (default) slim production image for the API, WebSocket gateway and
#            worker processes; the process is chosen by the container command.
#   migrator one-off image that runs `prisma migrate deploy` before a release.

ARG NODE_IMAGE=node:22.23.5-trixie-slim
ARG PNPM_VERSION=12.21.0

# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN npm install --global --no-fund --no-audit pnpm@${PNPM_VERSION}
WORKDIR /repo

# -----------------------------------------------------------------------------
# Install all dependencies (including dev) from the lockfile only.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY studipod-backend/package.json studipod-backend/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@studipod/backend..."

# -----------------------------------------------------------------------------
FROM deps AS build
COPY packages/ packages/
COPY studipod-backend/ studipod-backend/
WORKDIR /repo/studipod-backend
RUN pnpm exec prisma generate \
 && pnpm run build
# Self-contained production bundle: dist + production node_modules only.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @studipod/backend deploy --prod --legacy /out \
 && cp -r dist /out/dist

# -----------------------------------------------------------------------------
FROM build AS migrator
WORKDIR /repo/studipod-backend
USER node
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    APP_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist

# Never run as root.
USER node
EXPOSE 3000 3001

# Port-level check that works before the health module exists. Replace with an
# HTTP readiness probe (/api/v1/health/ready) once it is implemented.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "require('node:net').connect(Number(process.env.PORT||3000),'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"]

# Default process: HTTP API. Compose overrides this for the gateway and worker.
CMD ["node", "dist/main.js"]
