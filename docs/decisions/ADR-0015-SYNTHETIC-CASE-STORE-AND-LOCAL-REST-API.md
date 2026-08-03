# ADR-0015: Synthetic Case Store and Local REST API

Status: ACCEPTED FOR PHASE 2 IMPLEMENTATION.

## Context

ADR-0010 defines immutable BrooksDecision, CalvinReview, and derived DecisionConflict contracts. ADR-0013 defines six strict persisted Phase 1 record kinds and executable immutable PostgreSQL constraints, but intentionally leaves routes, a running database, roles, and service behavior unresolved. The draft Phase 2 words `Label` and `Commitment` predate the accepted semantic vocabulary and have no independent contract authority.

Phase 2 needs one smallest vertical slice that proves an outcome-blind synthetic Case can be stored, reviewed, retrieved, and audited without a model. It must not create a path for real historical data, protected-window contact, provider calls, replay, or trading activity.

## Decision

### Semantic records

Retire generic `Label` and `Commitment` as draft-era placeholders.

Phase 2 adds separate persisted record kinds for:

- `brooks_decision`, retaining Brooks source-policy identity;
- `calvin_review`, retaining whole-decision offline review identity.

`DecisionConflict` remains a deterministic on-demand derivation from those exact immutable records and is not stored. Record hashes, deep freezing, database constraints, and immutable triggers provide commitment/freeze semantics; there is no generic label, commitment, or API-request-audit table.

### Synthetic CaseBundle

One public Case creation command accepts one exact `SyntheticCaseBundleV1` containing:

- one local `BrooksPolicyCaseV1`;
- its anonymous `BrooksPolicyInputV1`;
- one context and one detail `AnonymousChartArtifactMetadataV1`;
- exact Case/input/chart bindings;
- `sourceScope: "synthetic_fixture_only"`;
- a canonical `bundleHash`.

The bundle is fully validated before SQL and is inserted atomically with one PostgreSQL client transaction. An exact repeat is idempotent; the same natural identity with different canonical content is a conflict. Granular public table-write endpoints are forbidden. The API additionally requires the exact `bundleHash` to appear in its deployment allowlist before it reads PNG bytes or opens a transaction; a client cannot gain synthetic authority by setting the source-scope literal alone.

Chart PNG bytes are not embedded in JSON. They must already exist under ADR-0012's content-addressed local artifact store and pass byte/hash/PNG/dimension validation before the database transaction begins.

### Audit view

The read-only `CaseAuditViewV1` deterministically assembles the immutable Case, input, chart metadata, BrooksDecision, CalvinReview, their hash relationships, and on-demand DecisionConflict. It does not store request bodies, rejected submissions, wall-clock labels, mutable status, outcomes, or security logs as research authority.

### REST boundary

Phase 2 uses versioned local REST/OpenAPI only. It adds no SSE, WebSocket, GraphQL, gRPC, queue, or custom IPC. SSE may be reconsidered only after a separately approved Phase 5 durable asynchronous model-job contract demonstrates a notification need.

Fastify must receive a bounded raw UTF-8 JSON body before the existing duplicate-key/schema/domain gates. Runtime routes consume the same committed generated schemas and route manifest as OpenAPI. No Fastify-generated competing OpenAPI document is permitted.

The API listens only on `127.0.0.1`. Every business route requires a per-launch local token through an authentication hook that creates a `RequestPrincipal`; health/readiness are the only unauthenticated routes. Token material is not logged or persisted. Host and Origin are restricted and wildcard CORS is forbidden. This is not public authentication authority.

Any future remote access first requires a separate deployment ADR. A truly public service requires TLS termination, mature OIDC/session handling, CSRF controls, authorization policy, rate limits, private database networking, and security-log retention decisions. A static Phase 2 token must never be reused as public authentication.

### Database and roles

Use the exact Linux amd64 image:

```text
pgvector/pgvector:0.8.6-pg18-trixie@sha256:8888de64a42b12a8e56df21d0d404c81864c18bafec7ab0f802a1453ec6cd352
```

A separate migration owner runs ordered content-hashed SQL migrations. The runtime application role is not a table owner and receives no DDL, UPDATE, DELETE, TRUNCATE, trigger-control, role-management, or database-owner privilege. PGlite remains dev-only fast conformance; real PostgreSQL must prove transactions, concurrency, migration hashes, SQLSTATE mapping, privileges, and network binding.

The image contains pgvector for the accepted future platform direction, but Phase 2 does not create the vector extension or vector schema. That remains Phase 4 work.

### Dependencies

Pin only:

- `fastify@5.11.0` for the local API;
- `pg@8.22.0` for Pool/client access.

Do not add an ORM, query builder, migration framework, Swagger plugin/UI, TypeBox, Zod, model provider, data adapter, vector service, or event plugin. Use Node's built-in `parseArgs` and `fetch` for the CLI.

## Causal and research boundary

Phase 2 accepts only deterministic synthetic fixtures and has no market-data adapter. It never opens real historical data and cannot contact protected `2025-02`, `2025-05`, or `2025-08` windows. Detailed dataset partitions, holdout/contact state, and real ingestion authorization remain deferred.

The slice has no baseline/treatment strategy comparison. PGlite and real PostgreSQL receive byte-equivalent synthetic fixtures solely to test software-contract behavior. Tests prove persistence, authority, privacy, and causality invariants, not profitability.

## Implementation consequences

- ADR-0013's six Phase 1 record-kind artifacts remain unchanged and authoritative for that slice.
- Phase 2 receives separate generated JSON Schema/OpenAPI artifacts and a forward-only migration.
- One incomplete bundle must never become visible.
- Identical retry returns the existing immutable identity; conflicting reuse never overwrites.
- Phase 3 blind-review interaction details remain deferred even though Phase 2 provides the persisted semantic records it will need.
- Real data, public deployment, provider calls, RAG, UI, replay, training, Paper, Live, exchange, wallet, and real-money activity remain unauthorized.

## Reuse evidence

`docs/research/PHASE2_CASE_STORE_API_REUSE_SCAN_V1.md` records the inspected candidates, exact package integrities, image manifests, selected versions, and rejection reasons.
