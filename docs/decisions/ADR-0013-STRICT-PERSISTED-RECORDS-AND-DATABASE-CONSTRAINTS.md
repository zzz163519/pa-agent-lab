# ADR-0013: Strict Persisted Records and Immutable Database Constraints

Status: ACCEPTED FOR THE PHASE 1 CONTRACT SLICE. NO DATABASE SERVICE OR API ENDPOINT AUTHORITY.

## Context

ADR-0011 and ADR-0012 define immutable identities in TypeScript, but a TypeScript interface does not protect a record after it crosses a JSON or database boundary. Native `JSON.parse` accepts duplicate object names with last-value-wins behavior, generated API documentation can drift from source types, and application-level uniqueness checks race under concurrent inserts.

The next Phase 1 slice needs one strict transport boundary for the implemented Case, anonymous policy input, chart artifact metadata, ModelRun, ProviderAttempt, and ModelRunAudit records. It also needs PostgreSQL constraints that express immutable relationships without starting the Phase 2 API or choosing endpoint semantics.

## Decision

Create `@pa-agent-lab/persistence-contracts` with six record kinds:

- `policy_case`;
- `policy_input`;
- `chart_artifact_metadata`;
- `model_run`;
- `provider_attempt`;
- `model_run_audit`.

### Strict JSON

`parsePersistedRecordJson` uses three ordered gates:

1. Microsoft `jsonc-parser@3.3.1` rejects comments, trailing commas, empty input, malformed syntax, and duplicate object keys before values are materialized;
2. `ajv@8.20.0` validates a generated JSON Schema 2020-12 structural schema with closed objects and no unknown fields;
3. the existing domain integrity validator recomputes hashes and checks causal, semantic, renderer, and terminal-state invariants.

`serializePersistedRecord` runs the same structural and domain validation, then emits canonical JSON with lexicographically ordered object keys. Parsed records are deeply frozen.

### Chart metadata

PNG bytes remain in ADR-0012 content-addressed local files. PostgreSQL stores a bounded `AnonymousChartArtifactMetadataV1`, not duplicate base64 image content or normalized bars.

The metadata builder accepts a validated chart bundle plus `context | detail`. It binds:

- the bundle's local `sourceCaseHash` and anonymous-market hash;
- the selected artifact identity, render-input hash, PNG content hash, byte length, panel, and anonymous bars;
- the exact ADR-0012 renderer, JavaScript runtime, Linux x64 GNU native runtime, and dimensions.

`metadataId` hashes `sourceCaseHash`, anonymous-market hash, and `artifactId`. A self-consistent hash using an unauthorized renderer remains invalid.

### Generated OpenAPI components

`ts-json-schema-generator@2.9.0` derives closed schemas from the existing TypeScript interfaces. A deterministic post-pass adds the SHA-256 pattern and safe structural integer/range annotations. Generation emits:

- `phase1-persisted-records-v1.schema.json` for runtime Ajv validation;
- `phase1-persisted-records-v1.openapi.json` with OpenAPI 3.1.1 components.

The OpenAPI document intentionally has empty `paths`. It freezes record payload schemas without prematurely deciding REST routes, event streaming, authentication, or service behavior. A drift test regenerates both documents and compares them to the committed artifacts.

The generator skips its own TypeScript check because its program mode is incompatible with this source workspace's NodeNext `.ts` imports. The repository's strict `tsc` run remains mandatory and covers all generator, source, and test files.

### PostgreSQL migration

`0001_phase1_immutable_records_v1.sql` defines six immutable record tables plus one Case-to-input relation table. It uses only PostgreSQL-native JSONB, checks, foreign keys, unique constraints, and triggers.

Atomic identities include:

- null-safe required JSON-to-column checks, so absent identity fields fail rather than producing an accepted SQL `NULL` check result;

- unique `caseId`;
- unique `(policyStreamId, lastVisibleBarId)` and `(policyStreamId, decisionPointSequence)`;
- unique `(sourceCaseHash, panel, renderInputHash)` chart metadata;
- unique `callId` per ModelRun;
- unique `attemptKey` and `(modelRunId, attemptIndex)`;
- one audit per provider attempt;
- composite foreign keys binding run, call, Case, input, request payload, provider response, and validation audit.

Anonymous policy inputs are content-addressed independently from local Cases. `pa_case_policy_inputs` retains the many-to-many provenance relation because two local Cases may legitimately normalize to the same provider-safe `inputHash`. Each relation also binds context and detail metadata through composite Case/panel/content-hash foreign keys, so an input cannot cite a chart from another Case or substitute detail metadata for context.

All accepted rows reject `UPDATE`, `DELETE`, and `TRUNCATE`. Corrections require a new versioned record rather than mutation. Phase 2 must separately restrict table-owner and DDL privileges so callers cannot disable these triggers. Provider attempts may persist terminal timeout or transport-error evidence with a SQL/JSON `NULL` response; the audit composite foreign key can reference only an actual non-null received response hash.

### Database conformance

`@electric-sql/pglite@0.5.4` is dev-only. It executes the migration as PostgreSQL WebAssembly and verifies valid-chain insertion, uniqueness races, foreign keys, JSON/column identity checks, and immutable triggers. It is not the production database, a service, or an alternate system of record.

## Reuse decision

The selected libraries are narrow and subordinate to PA validators:

- `jsonc-parser@3.3.1`, MIT, strict token traversal and duplicate-key detection;
- `ajv@8.20.0`, MIT, JSON Schema 2020-12 validation;
- `ts-json-schema-generator@2.9.0`, MIT, dev-only interface-to-schema generation;
- `@electric-sql/pglite@0.5.4`, Apache-2.0/PostgreSQL, dev-only SQL conformance.

Zod, TypeBox, and Zod-to-OpenAPI would require a second hand-maintained domain-schema authority. Fastify would prematurely create a service surface. `pg-mem` emulates PostgreSQL rather than executing PostgreSQL. Docker PostgreSQL remains appropriate for Phase 2 integration, after the exact image is pinned.

## Consequences

- Persisted JSON cannot silently accept unknown or duplicate fields.
- OpenAPI structural schemas track TypeScript automatically while existing validators remain semantic authority.
- Database uniqueness and relation checks are atomic rather than application-level conventions.
- The migration is executable evidence, not unvalidated SQL documentation.
- New runtime dependencies are confined to the persistence boundary; existing core contracts remain dependency-free.
- No server, listener, container, database files, credentials, model call, replay, or trading capability is introduced.

## Deferred

This ADR does not authorize or implement:

- Fastify or any API endpoint;
- a running PostgreSQL/pgvector service, Docker image, connection pool, role, or credential;
- REST versus local event-streaming behavior;
- provider transport, image upload, retry policy, or model calls;
- doctrine ingestion or RAG queries;
- replay engines, training, Paper, Live, exchange, wallet, or real-money activity.
