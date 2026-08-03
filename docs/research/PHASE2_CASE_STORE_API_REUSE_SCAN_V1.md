# Phase 2 Case Store and API Reuse Scan V1

Status: COMPLETED REUSE SCAN FOR ADR-0015.

## Need

Phase 2 needs one local, versioned, synthetic-only Case Store and REST API that preserves strict JSON, existing TypeScript/domain authority, immutable PostgreSQL records, deterministic chart bytes, content identities, and whole-decision authority separation. It must not fetch market data, contact a model provider, expose a public listener, add event streaming, or create replay/trading capability.

## Hard constraints

- local-only and single-user under ADR-0006;
- `synthetic_fixture_only`; no real historical data or protected-window contact;
- exact raw JSON duplicate-key rejection before value materialization;
- one complete CaseBundle per PostgreSQL transaction;
- separate immutable `brooksDecision` and `calvinReview`; conflict derived on demand;
- PostgreSQL application role has no owner, DDL, mutation, or trigger-control authority;
- committed OpenAPI and JSON Schema remain generated from TypeScript rather than becoming a second hand-maintained contract;
- chart PNG bytes remain in the existing content-addressed filesystem store.

## Search channels

The review inspected installed skills, prior skill/MCP registry findings, npm metadata, GitHub and official project documentation, Docker Hub OCI manifests, and the repository's existing persistence reuse scan. No skill or MCP provides a narrower trustworthy Case Store seam; adding one would introduce a service boundary without removing local authority code.

## Candidates

| Candidate | Evidence | Decision |
|---|---|---|
| `fastify@5.11.0` | MIT; exact npm integrity `sha512-Y/Ecx1yt0hYzrQR+QVLbxaUN8wCX+MQzMevh29r5RRvlOIArmi4+WAXXaGl5Hw5gBr2wduZpZaT3gRCnXoyVgA==`; supports bounded custom content-type parsers, JSON Schema references, route injection, and local lifecycle hooks | Select and pin exactly |
| Express | Mature HTTP framework, but Phase 2 would need to assemble validation, serialization, route-injection, and lifecycle conventions separately | Reject |
| Hono | Small and portable, but offers no advantage over Fastify for the accepted Node-only JSON Schema/OpenAPI/PostgreSQL stack | Reject |
| `pg@8.22.0` | MIT; exact npm integrity `sha512-8wih1vVIBMxoUM2oB4soJsD9tDnDpLv4OXBJ+EJzFsvycD+lfyIreC2gGHq78f8jbLLt+bvlPTFdFZfJkOuzAA==`; explicit Pool/client transaction and SQLSTATE behavior | Select and pin exactly |
| Postgres.js | Maintained and compact, but switching tagged-query conventions offers no material benefit over node-postgres's established Pool/client seam here | Reject |
| Prisma, Drizzle, TypeORM, Sequelize, query builders | Add another model/migration authority above accepted records and SQL constraints | Reject |
| `@fastify/swagger` / Swagger UI | Would regenerate a second OpenAPI view from runtime routes; committed TypeScript-derived documents are already authoritative | Reject at runtime and development time |
| TypeBox, Zod, Fastify schema DSLs | Duplicate accepted TypeScript interfaces, generated schemas, and domain validators | Reject |
| Migration frameworks | Existing numbered SQL is executable PostgreSQL authority; a narrow content-hashed runner is sufficient | Reject |
| `pgvector/pgvector:0.8.6-pg18-trixie` | Official pgvector image line; PostgreSQL 18; OCI index digest `sha256:1963bc48febf543433baa1ce3edcc6cc08154de722e22495f86681cc9a849026`; Linux amd64 manifest `sha256:8888de64a42b12a8e56df21d0d404c81864c18bafec7ab0f802a1453ec6cd352` | Select the exact amd64 manifest |
| `@electric-sql/pglite@0.5.4` | Existing dev-only PostgreSQL WASM conformance runner | Retain for fast tests; never substitute it for real Phase 2 role/concurrency integration |
| SSE, WebSocket, GraphQL, gRPC, queues, custom IPC | No Phase 2 operation requires server push, duplex sessions, subscriptions, a second schema language, or distributed delivery | Reject for Phase 2; reconsider SSE only for separately approved durable Phase 5 jobs |

## Selected boundary

```text
bounded raw HTTP body
  -> strict JSON token pass
    -> generated schema
      -> existing domain validators
        -> deep Case Store interface
          -> parameterized pg transaction
            -> immutable PostgreSQL constraints
```

Fastify consumes committed `$ref` schemas and a shared route manifest. It does not generate a competing OpenAPI document. The migration runner executes ordered repository SQL under a separate migration owner and records the migration file content hash. The application role can only use explicitly granted reads and inserts.

## Dependency authority

Authorized new runtime dependencies:

- `fastify@5.11.0`, only in `@pa-agent-lab/case-api`;
- `pg@8.22.0`, only in `@pa-agent-lab/case-store`.

Authorized local image:

- `pgvector/pgvector:0.8.6-pg18-trixie@sha256:8888de64a42b12a8e56df21d0d404c81864c18bafec7ab0f802a1453ec6cd352` for Linux amd64.

No global package, MCP configuration, ORM, public proxy, identity provider, market-data client, model provider, replay engine, vector extension, Paper/Live adapter, exchange client, wallet, or trading dependency is authorized.
