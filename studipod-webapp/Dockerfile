# syntax=docker/dockerfile:1.7
#
# Studipod Candidate Webapp image (Next.js standalone server + service worker).
#
# Build context is this folder:
#
#   docker build \
#     --build-arg NEXT_PUBLIC_APP_URL=https://app.studipod.com \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.studipod.com/api/v1 \
#     --build-arg NEXT_PUBLIC_WS_URL=wss://ws.studipod.com \
#     --build-arg NEXT_PUBLIC_LIVEKIT_URL=wss://<project>.livekit.cloud \
#     -t studipod-webapp .
#
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so they are
# build arguments, not runtime environment variables. They are public by design.

ARG NODE_IMAGE=node:22.23.5-trixie-slim
ARG PNPM_VERSION=12.21.0

# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1
RUN npm install --global --no-fund --no-audit pnpm@${PNPM_VERSION}
WORKDIR /app

# -----------------------------------------------------------------------------
# Install all dependencies (including dev, needed to build) from the lockfile only.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# `pnpm build` runs `next build` and then bundles the service worker into public/sw.js.
FROM deps AS build
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
    NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL}
COPY . .
RUN pnpm run build

# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

# Standalone output contains the server and only the production dependencies it uses.
# public/ is copied after the build so it includes the generated sw.js.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Never run as root.
USER node
EXPOSE 3000

# Liveness probe against the webapp's own health route (does not call the API).
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
