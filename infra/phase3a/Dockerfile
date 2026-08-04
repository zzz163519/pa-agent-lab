FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY docs/prompts ./docs/prompts
COPY infra/phase2 ./infra/phase2

RUN --mount=type=cache,id=pa-agent-lab-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN VITE_PA_REVIEWER_AUTH_MODE=trusted_loopback pnpm build:console

FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app /app
RUN mkdir -p /var/lib/pa-agent-lab/charts && \
    chown node:node /var/lib/pa-agent-lab/charts

USER node
EXPOSE 3210

CMD ["node", "packages/case-api/src/server.ts"]
