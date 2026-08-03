# Phase 2 Synthetic Case Store and Local API V1

Status: IMPLEMENTED SYNTHETIC-ONLY VERTICAL SLICE.

Authority: ADR-0006, ADR-0010, ADR-0011, ADR-0012, ADR-0013, and ADR-0015.

## Scope

Phase 2 stores and serves only deterministic synthetic Case fixtures. It adds no real market-data reader, historical-data adapter, dataset split, provider call, RAG service, UI, replay engine, or trading capability.

The implemented packages are:

```text
@pa-agent-lab/case-store
@pa-agent-lab/case-api
@pa-agent-lab/case-cli
```

## Synthetic CaseBundle

`SyntheticCaseBundleV1` fixes `sourceScope` to `synthetic_fixture_only` and binds:

- one local raw-price `BrooksPolicyCaseV1`;
- its anonymous normalized `BrooksPolicyInputV1`;
- context and detail `AnonymousChartArtifactMetadataV1` records;
- exact Case/input/context/detail identities;
- one canonical `bundleHash`.

The API accepts the complete bundle only. The exact `bundleHash` must first appear in the deployment's `PA_AUTHORIZED_SYNTHETIC_BUNDLE_HASHES` allowlist, so a caller cannot relabel arbitrary OHLC as synthetic. It then applies bounded raw JSON parsing, duplicate-key rejection, generated structural schema, domain integrity, and content-addressed PNG byte/hash/dimension checks. The Case Store finally inserts the Case, input, both chart metadata rows, and binding with one PostgreSQL client transaction. Granular public table-write endpoints do not exist.

A first accepted bundle returns `201 inserted`. An exact canonical retry returns `200 existing`. Reusing an immutable natural identity for different content returns `409 IDENTITY_CONFLICT`. `ON CONFLICT DO UPDATE` is forbidden.

## Semantic persistence

Migration `0002_phase2_decision_review_records_v1.sql` adds:

- `pa_brooks_decisions` for the ADR-0010 Brooks track;
- `pa_calvin_reviews` for whole-decision, outcome-blind offline review.

Both tables bind their parent Case/input/decision identities and reject UPDATE, DELETE, and TRUNCATE. There are no generic CaseLabel, CaseCommitment, DecisionConflict, API-request-log, or mutable status tables.

`DecisionConflict` is derived on demand from the exact stored BrooksDecision and CalvinReview. `CaseAuditViewV1` hashes the complete bundle, optional decision, optional review, and derived conflict. Valid states are bundle only, bundle plus decision, or bundle plus decision/review/conflict; review without its decision fails closed.

## Transport

The generated artifacts are separate from ADR-0013's unchanged six Phase 1 record components:

```text
packages/persistence-contracts/schemas/phase2-case-store-v1.schema.json
packages/persistence-contracts/openapi/phase2-case-store-v1.openapi.json
```

The OpenAPI 3.1.1 paths are:

```text
POST /v1/synthetic-case-bundles
POST /v1/brooks-decisions
POST /v1/calvin-reviews
GET  /v1/cases/:caseHash
GET  /v1/cases/:caseHash/audit
GET  /v1/chart-artifacts/:artifactId/content
GET  /healthz
GET  /readyz
```

The committed OpenAPI document, runtime Fastify routes, and tests consume one route manifest. Fastify does not generate another OpenAPI document. Runtime validation registers the same generated `$id/$defs`; only the unsupported 2020-12 meta-schema declaration is removed from the Fastify copy. `removeAdditional` is false, so unknown fields are rejected rather than silently removed.

JSON request bodies are limited to 512 KiB. Fastify receives raw UTF-8 before `jsonc-parser`, generated schema validation, and domain validation. Nested duplicate names, comments, trailing commas, malformed syntax, unknown fields, hash tampering, oversized bodies, unsupported verbs, and non-synthetic scope fail closed.

## Local authentication

The server host is fixed to `127.0.0.1`; no configuration can bind it to `0.0.0.0`. Business routes require a per-launch bearer token and an accepted Host/Origin through the authentication hook. The resulting `RequestPrincipalV1` is local-only. Token material is not logged or persisted. Health and readiness are the only unauthenticated paths.

This token is not public authentication. Remote or public deployment requires a separate ADR covering TLS termination, OIDC/session behavior, CSRF, authorization, rate limits, private database networking, and security-log retention.

## PostgreSQL

The accepted Linux amd64 image is:

```text
pgvector/pgvector:0.8.6-pg18-trixie@sha256:8888de64a42b12a8e56df21d0d404c81864c18bafec7ab0f802a1453ec6cd352
```

`infra/phase2/compose.yaml` publishes PostgreSQL only on an explicit `127.0.0.1` port. The content-hashed migration runner requires continuous `000N` names and exact `BEGIN; ... COMMIT;` envelopes. It records migration name/order/SHA-256 in the same transaction and rejects changed applied bytes.

`pa_migrator` owns schema objects. The `pa_app` role receives only explicit SELECT/INSERT and required function execution. It cannot perform DDL, UPDATE, DELETE, TRUNCATE, role management, or trigger control. Serializable transactions retry the complete pure-SQL callback up to three times only for PostgreSQL `40001` and `40P01`.

The image contains pgvector but Phase 2 does not install the vector extension. PGlite remains a fast dev-only conformance adapter; pinned real PostgreSQL tests prove concurrency, migration ownership, SQLSTATE behavior, privileges, and loopback binding.

## CLI

`@pa-agent-lab/case-cli` uses Node `parseArgs` and `fetch`; no CLI dependency is added. Commands are:

```text
seed-synthetic
inspect-case <caseHash>
get-chart <artifactId> --output <path>
get-case <caseHash>
get-audit <caseHash>
```

`seed-synthetic` creates 120 deterministic closed synthetic bars, two synthetic doctrine fixtures, anonymous charts, one `no_trade` BrooksDecision, one agreeing whole-decision CalvinReview, and the deterministic audit view. Its concise JSON reports each mutation as `inserted` or `existing` and exposes both panels' `artifactId` and `contentHash`.

`inspect-case` returns a bounded terminal-oriented summary containing Case/input/cutoff identity, bar count, decision/review/conflict state, and both chart identities. The existing `get-case` and `get-audit` commands retain complete single-line JSON for machine consumers.

`get-chart` requests the existing authenticated PNG endpoint, rejects redirects and responses over 4 MiB, checks `image/png`, signature, and the fixed `1200x720` dimensions, reports the locally computed SHA-256 content hash, and creates the output file without overwriting an existing path. The API independently revalidates the stored metadata hash before returning bytes. These values are software fixtures only and carry no Brooks-source, strategy, result, or profitability authority.

## Verified behavior

Tests cover:

- transported decision/review exact keys, hashes, bindings, and outcome-blind scope;
- bundle authority, chart/input identity, audit derivation, and envelope constants;
- unchanged Phase 1 generated artifacts and separate Phase 2 OpenAPI paths;
- PGlite migration constraints and content-hashed migration drift;
- Case Store exact retry, conflict, rollback, and reconstruction;
- raw HTTP duplicate keys, unknown fields, auth, Host/Origin, size limits, missing/corrupt PNG, unsupported verbs, audit, and binary content;
- CLI seed, exact retry status, concise inspection, chart download/integrity/overwrite behavior, and complete raw reads over actual loopback HTTP;
- real PostgreSQL migration rerun, concurrent idempotency, object ownership, app-role privilege denial, no vector extension, and loopback-only Docker publication.

These tests prove software contracts, not Price Action correctness, model quality, replay correctness, or profitability.

## Deferred and forbidden

- real Case ingestion and any protected/development/evaluation window;
- dataset partition or holdout/contact-state machinery;
- Phase 3 blind annotation interaction and UI;
- SSE, WebSocket, queues, public listeners, OIDC, and public deployment;
- Doctrine RAG, provider transport/calls, evaluation, and training;
- replay engines, order/fill/risk/cost/accounting semantics;
- Paper, Live, exchange, wallet, credentials, and real-money authority.
