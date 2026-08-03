# Phase 3A Trusted-Loopback Docker Deployment V1

Status: IMPLEMENTED LOCAL SINGLE-USER DEPLOYMENT.

Authority: ADR-0015, ADR-0016, ADR-0017, and ADR-0018.

## Fixed surface

The persistent Research Console is available only at:

```text
http://127.0.0.1:3210/console/
```

The browser supplies no reviewer token. The backend derives `local:calvin-reviewer` only after the repository-owned loopback gateway accepts the exact local Host and optional Origin. Operator-only routes retain the separate operator bearer token.

## Services

`infra/phase3a/compose.yaml` defines:

- `postgres`: digest-pinned PostgreSQL 18, internal network, persistent volume, no host port;
- `migrator`: one-shot content-hashed migration and restricted application-role bootstrap;
- `console`: read-only Fastify/React service on the internal network, persistent chart bind mount, no host port or outbound route;
- `gateway`: read-only credential-free fixed-target proxy, publishing only `127.0.0.1:3210`.

The Node application image is built from the exact official Node 24.18.0 bookworm-slim digest in `infra/phase3a/Dockerfile`. The frontend is built with trusted-loopback mode fixed at build time. Runtime server configuration independently requires the trusted mode and explicit gateway flag.

## Local configuration

Create a private environment file outside Git:

```bash
mkdir -p "$HOME/.config/pa-agent-lab"
mkdir -p "$HOME/.local/share/pa-agent-lab/phase3a-artifacts"
cp infra/phase3a/.env.example "$HOME/.config/pa-agent-lab/phase3a.env"
chmod 600 "$HOME/.config/pa-agent-lab/phase3a.env"
```

Replace every placeholder with a distinct random secret or an exact deployment-authorized hash. PostgreSQL credentials are passed as discrete fields and percent-encoded by the application, so reserved characters are supported without raw URL interpolation. Never commit this file. For an existing database, set `PA_POSTGRES_VOLUME_NAME` to its exact volume name and preserve the matching bootstrap credential.

## Operations

```bash
pnpm phase3a:docker:up
pnpm phase3a:docker:logs
pnpm phase3a:docker:down
```

`up` builds the pinned image, waits for PostgreSQL, runs all content-hashed migrations, and starts the Console and gateway. `down` removes containers and networks but preserves the named PostgreSQL volume and host artifact directory.

## Required invariants

- only the gateway has a host port, bound to `127.0.0.1`;
- PostgreSQL and Console have no host port;
- Console cannot reach an external network;
- gateway has no database URL, operator token, provider credential, or writable volume;
- absent reviewer credentials map only reviewer-capable routes to `local:calvin-reviewer`;
- invalid credentials fail closed; they do not fall back to trusted mode;
- operator-only routes still return `401` without the operator token;
- foreign Host or Origin returns `403`;
- service restart preserves queue, immutable workflow records, and chart bytes;
- public/remote deployment remains forbidden.

Tests prove deployment and authority behavior only. They do not prove Price Action correctness or profitability.
