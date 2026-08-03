# ADR-0019: Approved Doctrine Corpus Snapshots and Lexical Retrieval

Status: ACCEPTED FOR PHASE 4A IMPLEMENTATION.

## Context

ADR-0010 defines the simplified approved-only `DoctrineRagRecordV1`. ADR-0017 implements exact public-source proposal, approval, and retirement records, but explicitly does not authorize ingestion, retrieval, embeddings, `pgvector`, or provider calls.

The Phase 4 label currently combines two different risk classes:

1. projecting approved DoctrineUnits into a deterministic local corpus and retrieving them lexically;
2. choosing an embedding runtime and implementing vector or hybrid retrieval.

The second class still lacks an approved embedding model/runtime/version, local-versus-external privacy decision, determinism contract, retry behavior, and provider authority. It must not be implied by the accepted future PostgreSQL-plus-pgvector platform direction.

Phase 4A needs the smallest coherent approved-corpus and retrieval slice. It must preserve the exact Phase 3B authority history, make every query reproducible, fail closed after retirement, and prove retrieval isolation without fetching source text or calling a model.

## Decision

### Phase split

Phase 4 is split into:

- **Phase 4A**: approved Doctrine corpus snapshots, metadata projection, deterministic PostgreSQL lexical retrieval, and immutable audit evidence;
- **Phase 4B**: embeddings, `pgvector` extension/schema, vector or hybrid retrieval, embedding/provider runtime, and associated quality/privacy contracts.

This ADR proposes only Phase 4A. Phase 4B requires a separate ADR and implementation approval. This accepted split specializes earlier references to vector work in the broad Phase 4 label without reversing PostgreSQL plus pgvector as a possible future platform direction.

### Initial Source boundary

Phase 4A admits only exact proposals whose public Source identity matches this closed allowlist:

- `source:btc-six-aspects-v1`;
- `source:btc-professional-pa-trader-v1`;
- `source:ask-al-breakouts-2016-09-25`;
- `source:ask-al-pullbacks-entering-2016-05-01`;
- `source:ask-al-trading-range-breakout-failures-2015-12-27`;
- `source:ask-al-small-pullback-trend-2017-02-05`.

The exact Source content hashes are fixed by the Phase 4A contract. URL-inventory `doctrine_candidate` status remains discovery metadata and grants no ingestion or retrieval authority.

A DoctrineUnit is eligible only when its exact Phase 3B proposal has an approval and no retirement. Phase 4A performs no web request, source refresh, full-text persistence, transcript/article storage, or bulk inventory ingestion. It projects only existing Source identity metadata, approval bindings, and the five simplified Doctrine semantics.

### Immutable version and snapshot model

A Source content change requires a new `sourceId`. Any change to a DoctrineUnit's Source, locator, `concept`, `rule`, `appliesWhen`, `avoidWhen`, or `decisionEffect` requires a new `doctrineId`, a new proposal, and a new explicit approval. No approval is inherited. Corrections retire the old DoctrineUnit rather than modifying it.

Each non-empty `DoctrineCorpusSnapshotV1` is the complete eligible projection visible in its construction transaction; the operator cannot select or omit DoctrineUnits. It is content-addressed over an ordered set of exact:

- doctrine, proposal, approval, Source, and Source-content identities;
- canonical `DoctrineRagRecordV1` values and hashes.

A retrieval query binds one exact snapshot. Approval or retirement never mutates an existing snapshot or historical retrieval evidence.

### Explicit ingestion and activation

New approvals do not silently change the active lexical corpus. An authenticated operator starts an explicit ingestion run for one snapshot and one immutable retrieval profile.

An ingestion run has only `succeeded` or `failed` terminal state. All entries must validate and all lexical documents must be created atomically. A failed run records bounded error codes but exposes no partial corpus. A successful run records the exact entry count and a canonical lexical-manifest hash; PostgreSQL physical index bytes are not content identity.

A successful run becomes queryable only through a separate append-only activation record after the frozen quality suite passes. Activation rejects any then-visible retirement in the run's snapshot. There is no mutable active-snapshot pointer; the latest activation is derived from append-only activation order.

A new approval may remain absent until a later explicit activation. A retirement is stricter: any current activation whose snapshot contains the retired unit becomes immediately ineligible for new queries. Retrieval fails closed until a new passed snapshot that excludes the retired unit is activated. The service never falls back automatically to an older activation.

### Lexical retrieval boundary

Phase 4A searches only these `DoctrineRagRecordV1` fields:

- `concept`;
- `rule`;
- `appliesWhen`;
- `avoidWhen`;
- `decisionEffect`.

Source title, URL, locator, source body, approver identity, approval or retirement prose, Calvin review, research memory, model output, V6 checklist/priority data, outcomes, and PnL do not enter the lexical document or RAG result.

The immutable retrieval profile pins PostgreSQL runtime identity, `pg_catalog.english`, document-field order and weights, query parser, rank function, normalization, result bounds, and tie-break rule. Callers cannot change those settings per query. A profile change creates a new profile and requires a new ingestion run.

V1 returns five results by default and at most eight. Only positive lexical matches are returned. Results sort by pinned PostgreSQL rank descending and then `doctrineId` ascending. No match returns explicit `no_match` with an empty result list; it never widens the corpus or falls back to generated content.

### Query authority and evidence

Phase 4A adds only operator-authenticated loopback API and CLI operations. It adds no Research Console route or page, trusted-loopback reviewer access, anonymous endpoint, Case-aware query generation, or model caller.

Every structurally valid authenticated query after the first activation exists, including `no_match` and terminal retrieval failure, creates immutable evidence binding:

- the latest activation, ingestion run, snapshot, and retrieval-profile identities;
- original and normalized query text plus query hash;
- requested result limit;
- terminal state;
- ordered result rank, doctrine ID, RAG-record hash, and internal rank score;
- a canonical evidence hash.

Authentication failures and malformed requests remain security/transport failures and do not become Doctrine research evidence.

### Quality gate

Activation requires a frozen, content-hashed, outcome-free retrieval-quality suite:

- at least one human-authored, source-grounded positive query for every approved DoctrineUnit in the snapshot;
- each required unit appears within the first five results;
- bounded cross-concept queries exercise ordering;
- explicit no-match queries return no records;
- synthetic draft, retired, Calvin-review, research-memory, model-generated, private, protected-window-marker, and unauthorized V6 fixtures never appear and contain no protected-window data;
- repeated execution under the same snapshot/profile/query produces byte-identical ordered evidence after excluding the distinct execution identity.

The suite is a Phase 4 contract/conformance fixture, not a Phase 6 holdout, strategy evaluation, or profitability claim. It cannot use outcomes, PnL, win rate, protected windows, or outcome-led tuning.

### Persistence and transport

Phase 4A will extend the existing strict TypeScript, canonical SHA-256, generated JSON Schema/OpenAPI 3.1, Fastify, PostgreSQL, restricted-role, content-hashed migration, Case Store, and CLI seams according to `docs/contracts/PHASE4A_APPROVED_DOCTRINE_CORPUS_AND_LEXICAL_RETRIEVAL_V1.md`.

New Phase 4A records and relations must be append-only, reject `UPDATE`, `DELETE`, and `TRUNCATE`, enforce JSON-to-column identities and immutable foreign-key relationships, and use complete transactions. Runtime routes consume generated schemas and remain operator-token protected on loopback, including behind ADR-0018's gateway.

No new npm runtime or development dependency is selected. PostgreSQL built-in full-text search is subordinate to local validators and immutable evidence. Native GIN may accelerate matching, but query semantics and audit identity cannot depend on physical page bytes, planner choice, or scan order.

## Reuse decision

`docs/research/PHASE4A_DOCTRINE_LEXICAL_RETRIEVAL_REUSE_SCAN_V1.md` records the skills.sh, ClawHub, MCP Registry, npm, GitHub, and PostgreSQL documentation scan.

Use the existing digest-pinned PostgreSQL 18 image, PostgreSQL-native text-search functions, existing `pg@8.22.0`, and existing PA strict transport/persistence seams. Reject external search services, generic RAG frameworks, PostgreSQL search extensions, a second in-memory index, and arbitrary database MCP access.

The image contains pgvector binaries, but Phase 4A does not execute `CREATE EXTENSION vector` or create vector columns.

## Consequences

- Retrieval can be tested and audited before any embedding or provider choice.
- The same snapshot, profile, query, and limit produce a stable ordered result.
- Approval history is preserved, and retirement cannot leak through a stale active corpus.
- Full public-source text and source metadata remain outside RAG records.
- New approvals require deliberate re-ingestion rather than silently changing runtime context.
- Phase 5 must separately define deterministic Case-to-query construction and service authority before a Brooks Policy Agent can call retrieval.

## Not authorized

This accepted ADR does not authorize:

- implementation before this ADR and its Phase 4A contract are explicitly accepted;
- source fetching, crawling, refresh, full-text retention, private/member material, or new Source classes;
- `pgvector` extension/schema, embeddings, vector/hybrid search, reranking, or an embedding provider;
- model/provider calls, query generation from Cases, Brooks Policy inference, or model answers;
- Research Console changes or trusted-loopback reviewer retrieval;
- real Case ingestion, protected-window access, evaluation outcomes, replay, training, Paper, Live, exchange, wallet, or real-money activity.
