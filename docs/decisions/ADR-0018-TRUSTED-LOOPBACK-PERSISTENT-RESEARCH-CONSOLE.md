# ADR-0018: Trusted-Loopback Persistent Research Console

Status: ACCEPTED AND IMPLEMENTED FOR LOCAL SINGLE-USER DEPLOYMENT.

## Context

ADR-0016 uses a new reviewer bearer token on every host-process launch. That preserves principal separation but makes the local single-user Console require a newly generated fragment URL after every restart. Calvin approved a persistent Docker deployment with a fixed token-free browser URL, without weakening operator authorization or authorizing remote/public access.

Docker persistence alone does not define authentication. A token-free browser path therefore needs an explicit deployment boundary and a server-derived reviewer principal.

## Decision

Phase 3A may run with `PA_REVIEWER_AUTH_MODE=trusted_loopback` only in the repository-owned Compose deployment. In this mode:

- a request with no `Authorization` header on a reviewer-capable route is mapped server-side to `local:calvin-reviewer` with authentication method `trusted_loopback`;
- an invalid or non-bearer `Authorization` header is rejected and never falls back to trusted mode;
- operator-only routes still require the distinct operator bearer token;
- Host and Origin remain exact `127.0.0.1` or `localhost` allowlists;
- the browser stores no reviewer token and opens the fixed `/console/` URL;
- bearer mode remains the default for direct host-process and test deployments.

The Compose deployment uses four roles:

1. digest-pinned PostgreSQL on an internal-only network with no host port;
2. a one-shot migrator holding the bootstrap credential and creating/resetting the restricted application login;
3. the credential-bearing Console/API app on the internal-only network, with no host port and no outbound route;
4. a credential-free fixed-target gateway that alone publishes `127.0.0.1:3210` and validates Host/Origin before proxying to the app.

The app and gateway run read-only with all Linux capabilities dropped, `no-new-privileges`, and no Docker socket. The chart artifact directory and PostgreSQL data are the only persistent writable locations. `restart: unless-stopped` applies to the long-running services.

The app may listen on container `0.0.0.0` only when `trusted_loopback` and the explicit gateway deployment flag are both set. The gateway target is fixed to `http://console:3210`; it accepts no credential-bearing or arbitrary proxy target configuration.

## Security boundary

Trusted-loopback is local deployment identity, not public authentication. Any process running as the same machine user may reach the loopback gateway and act as Calvin reviewer. This accepted tradeoff removes manual reviewer login for the single-user local workstation. It does not grant operator identity, bypass proposal allowlists, or let clients supply a principal.

Remote access, non-loopback publication, TLS termination, OIDC, multi-user sessions, CSRF policy for cross-site deployment, and public security logging remain unauthorized and require a separate ADR. The deployment contains no provider, exchange, wallet, Paper, Live, replay, or real-money credential or capability.

## Consequences

- The stable user URL is `http://127.0.0.1:3210/console/`.
- PostgreSQL, Console state, and chart artifacts survive service and host restarts.
- The existing per-launch bearer flow remains available and is not silently changed.
- OpenAPI bearer security remains the portable/default transport description; generated documents identify trusted-loopback as a local deployment extension rather than a portable HTTP credential scheme.
- A future private, remote, or multi-user deployment must disable trusted-loopback and replace it with a separately approved authentication model.
