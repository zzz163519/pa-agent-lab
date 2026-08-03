# Phase 4A Approved Doctrine Corpus and Lexical Retrieval V1

Status: ACCEPTED CONTRACT FOR PHASE 4A IMPLEMENTATION.

Authority: ADR-0010, ADR-0011, ADR-0013, ADR-0015, ADR-0017, and accepted ADR-0019.

## Purpose

Phase 4A projects exact approved, unretired Phase 3B DoctrineUnits into immutable local corpus snapshots and provides deterministic PostgreSQL lexical retrieval with complete append-only evidence.

This contract is not web search. It does not fetch or index original pages. It searches only the five fields of local approved `DoctrineRagRecordV1` values.

## Initial Source allowlist

A proposal is eligible only when its `SourceV1` exactly matches one row below, has `private: false`, has a Phase 3B approval, and has no retirement.

| Source ID | Source type | Exact title | Exact HTTPS reference | Content hash |
|---|---|---|---|---|
| `source:btc-six-aspects-v1` | `brooks_website` | `What is Price Action? Six Aspects` | `https://www.brookstradingcourse.com/price-action/what-is-price-action-6-aspects/` | `sha256:f1ec149fe8ba929b66836b22b516442b22cb4b7c3fffa260b0250c93b758c372` |
| `source:btc-professional-pa-trader-v1` | `brooks_website` | `Professional Price Action Trader` | `https://www.brookstradingcourse.com/price-action/professional-price-action-trader/` | `sha256:065ae939131da39f74d61d6e4b83a2a426f3dd1f4de6d3ac90e47cd5a43b7b8c` |
| `source:ask-al-breakouts-2016-09-25` | `brooks_website` | `Breakouts` | `https://www.brookstradingcourse.com/ask-al/breakouts/` | `sha256:4728a7b3e24329e9bb58af024c016bd99b7af078f797574b4b67b22ccf500f8b` |
| `source:ask-al-pullbacks-entering-2016-05-01` | `brooks_website` | `Pullbacks and Entering` | `https://www.brookstradingcourse.com/ask-al/pullbacks-entering/` | `sha256:5a6f6262d86dc6f0a9094a60bdf9bddac973361cc4ae72ef16320cb884481bdb` |
| `source:ask-al-trading-range-breakout-failures-2015-12-27` | `brooks_website` | `Trading Range Breakout Failures` | `https://www.brookstradingcourse.com/ask-al/trading-range-breakout-failures/` | `sha256:2703c5561739179736e4fbcc5b42bbfc7c27dcec85561dc58912687406bd6378` |
| `source:ask-al-small-pullback-trend-2017-02-05` | `brooks_website` | `Small Pullback Trend` | `https://www.brookstradingcourse.com/ask-al/small-pullback-trend-bought-many-times/` | `sha256:e84b0e60cfc574506d58ad214958013704f704efec35a8a3766445c4d3fa3155` |

The remaining URL inventory is discovery metadata only. `doctrine_candidate` does not satisfy this allowlist and cannot produce a corpus entry.

Phase 4A stores no fetched body, article, transcript, excerpt, audio, or video. It opens no Source URL. Existing Source identity, proposal locator, proposal hash, approval hash, and simplified semantics remain sufficient local audit evidence for this slice.

## Immutable version rules

- A Source content-hash change requires a new `sourceId` and a new allowlist decision.
- Any Source, locator, or semantic-field change requires a new `doctrineId`, proposal, and approval.
- An old Source, proposal, approval, DoctrineUnit, snapshot, run, activation, query, or evidence record is never updated.
- A replacement does not inherit approval. The old DoctrineUnit is retired and the replacement follows the Phase 3B proposal/approval path.
- Existing `doctrineId` uniqueness in Phase 3B remains authoritative.

## Record chain

```text
SourceV1 + DoctrineProposalBundleV1
  -> DoctrineApprovalV1
    -> DoctrineCorpusEntryV1
      -> DoctrineCorpusSnapshotV1
        -> DoctrineIngestionRunV1
          -> DoctrineRetrievalQualityReportV1
            -> DoctrineCorpusActivationV1
              -> DoctrineRetrievalQueryV1
                -> DoctrineRetrievalEvidenceV1
```

Every accepted record uses strict persisted JSON, exact keys, generated closed structural schema, domain-integrity validation, canonical serialization, SHA-256 identity, and deep freezing.

### `DoctrineCorpusEntryV1`

One entry binds exactly:

- `doctrineId`;
- Phase 3B `proposalHash` and `approvalHash`;
- `sourceId` and `sourceContentHash`;
- canonical `DoctrineRagRecordV1`;
- `ragRecordHash`, computed from that exact RAG record.

The RAG record contains only:

- `doctrineId`;
- `concept`;
- `rule`;
- `appliesWhen`;
- `avoidWhen`;
- `decisionEffect`.

It contains no status, Source metadata, locator, approval metadata, research notes, or model-generated text.

### `DoctrineCorpusSnapshotV1`

A snapshot contains:

- `schemaVersion`;
- the complete non-empty eligible projection visible in its construction transaction as `entries`, sorted by UTF-8 bytewise ascending `doctrineId`;
- `snapshotId`, the canonical hash of the record without `snapshotId`.

Doctrine IDs, proposal hashes, approval hashes, and RAG-record hashes are unique. Construction revalidates every Phase 3B proposal/approval relation and rejects any retirement or Source outside the exact allowlist. The operator cannot supply Doctrine IDs, omit an eligible unit, or add an ineligible unit.

A snapshot is an immutable historical fact. Eligibility for a new query is separately derived from activation and current retirement records.

### `DoctrineRetrievalProfileV1`

The V1 profile is one immutable canonical record whose `profileHash` commits to all values below:

| Setting | V1 value |
|---|---|
| engine | PostgreSQL built-in full-text search |
| runtime | Linux amd64 `pgvector/pgvector:0.8.6-pg18-trixie@sha256:8888de64a42b12a8e56df21d0d404c81864c18bafec7ab0f802a1453ec6cd352` with PostgreSQL server major 18 |
| text-search configuration | explicit `pg_catalog.english` |
| indexed fields, in order | `concept`, `rule`, `appliesWhen`, `avoidWhen`, `decisionEffect` |
| field weights | equal; PostgreSQL weight `D` for every field |
| array order | preserved from the canonical RAG record |
| query parser | `plainto_tsquery('pg_catalog.english', normalizedQuery)` |
| match predicate | parsed query `@@` canonical document `tsvector` |
| rank | `ts_rank_cd(documentVector, parsedQuery, 0)` |
| default result limit | `5` |
| maximum result limit | `8` |
| ordering | rank descending, then `doctrineId COLLATE "C"` ascending |
| score evidence | `encode(float4send(rank), 'hex')`, exactly eight lowercase hexadecimal characters |
| query rewriting | none |
| synonyms/thesaurus | none |
| prefix/fuzzy matching | none |
| highlighting | none |

Each field is converted separately with explicit `to_tsvector('pg_catalog.english', value)` and concatenated in the fixed field order. Arrays are converted in their existing order with a fixed line-feed separator. Empty or missing semantic fields remain invalid under `DoctrineUnitV1`.

For each DoctrineUnit, the logical lexical-document hash is the canonical SHA-256 of its `doctrineId`, `ragRecordHash`, and the UTF-8 bytes of PostgreSQL's `documentVector::text` output under the pinned profile. The ordered per-document hashes form the successful run's `lexicalManifestHash`.

The implementation must verify the actual PostgreSQL server major/runtime identity before ingestion and query. It must not rely on `default_text_search_config`, database `search_path`, request-controlled weights, or request-controlled query grammar.

A native GIN index over the stored canonical `tsvector` is permitted for acceleration. The physical GIN bytes, page layout, and planner choice are not contract identity. Correctness, rank, and ordering must remain identical if PostgreSQL selects a sequential scan.

### `DoctrineIngestionRunV1`

An explicit operator command creates one terminal run bound to:

- `snapshotId`;
- `profileHash`;
- non-negative `attemptIndex` unique for that pair;
- `status: succeeded | failed`;
- `runId`, the canonical terminal-record hash.

A successful run additionally contains:

- exact `entryCount` greater than zero;
- ordered `ragRecordHashes`;
- ordered hashes of the deterministic stored lexical-document representations;
- one `lexicalManifestHash` over that ordered logical manifest;
- no error codes.

A failed run contains:

- one or more bounded deterministic error codes;
- no lexical manifest or queryable rows.

All lexical rows and the successful terminal run record are validated and persisted in one complete transaction. An error rolls back every lexical row. After rollback, the service appends only the bounded failed terminal run record in a fresh transaction; a failure-record write error remains a service failure and never exposes lexical rows. An exact retry is idempotent; a conflicting natural identity is rejected.

The logical lexical manifest, not physical PostgreSQL index bytes, is the auditable index artifact.

### `DoctrineRetrievalQualitySuiteV1` and report

A committed, canonical quality suite has a `qualitySuiteHash` and binds one profile. Before an activation it is evaluated against the exact successful run and snapshot.

It contains:

- at least one human-authored, source-grounded positive query for every snapshot DoctrineUnit, with required doctrine IDs;
- cross-concept ordering fixtures;
- no-match fixtures;
- synthetic forbidden-track isolation fixtures containing only invented markers, never protected-window data.

A positive fixture passes only when every required ID is within the first five results. A no-match fixture passes only with an empty `no_match` result. Isolation fixtures must prove that draft, retired, Calvin-review, research-memory, model-generated, private, protected-window, and unauthorized V6 values cannot enter candidate rows or results.

The immutable `DoctrineRetrievalQualityReportV1` binds the suite, snapshot, profile, run, every fixture result hash, and `passed | failed`. The quality evaluator is an internal contract path over the exact staged successful run; it is not a public route and cannot activate or query any other run. A passed report requires byte-identical ordered semantic results across repeated executions after excluding their distinct execution identities. It is not an outcome, holdout, or profitability record.

### `DoctrineCorpusActivationV1`

Only an authenticated operator may append an activation. Its creation uses a `SERIALIZABLE` transaction and rejects a run whose snapshot contains any then-visible retirement. It binds:

- a successful ingestion run;
- its exact snapshot and profile;
- one passed quality-report hash;
- server-derived operator principal;
- a database-assigned monotonic `activationSequence`;
- canonical `activationId`.

There is no mutable active flag or pointer. The latest activation is the highest committed activation sequence. It is query-eligible only if no DoctrineUnit in its snapshot has a committed retirement in the database serialization order visible to the query.

A retirement that touches the current snapshot makes that activation ineligible. The service fails closed and does not fall back to an older activation. A new passed snapshot excluding the retired unit must be explicitly activated.

A new approval alone does not invalidate the current activation. It enters retrieval only after a later successful, passed activation.

### `DoctrineRetrievalQueryV1`

A valid query record binds:

- latest committed `activationId`, `runId`, `snapshotId`, and `profileHash`;
- original query text;
- normalized query text and `queryHash`;
- requested limit from `1` through `8`, defaulting to `5`;
- a non-negative `repeatIndex` unique for the same snapshot/profile/query/limit tuple;
- server-derived operator principal;
- canonical `queryId`.

V1 query normalization:

1. require a plain string with no NUL or control characters;
2. normalize Unicode to NFC;
3. trim leading and trailing whitespace;
4. replace each remaining Unicode-whitespace run with one ASCII space;
5. require 1 through 400 Unicode scalar values.

`queryHash` is the canonical SHA-256 of a versioned object containing exactly the normalized query; the original query is audit evidence but does not affect lexical matching or `queryHash`.

The command may name the latest activation's snapshot/profile explicitly or request current resolution. Resolution happens once when the query record is created. Explicit identities must equal the latest committed activation; historical snapshots cannot be selected for a new query. The query route is not ready before the first activation exists. After the first activation, every structurally valid authenticated request binds the latest activation and commits terminal evidence, including `failed` evidence when retirement has made that activation ineligible.

A parsed query with zero positive lexemes, including a stop-word-only query, produces `no_match`. It does not scan all records.

### `DoctrineRetrievalEvidenceV1`

Every structurally valid authenticated query receives exactly one terminal evidence record:

- `matched` with one through the requested limit results;
- `no_match` with an empty result list;
- `failed` with an empty result list and bounded error codes.

Evidence binds the exact query, activation, run, snapshot, profile, normalized query/hash, and limit. Each matched result contains exactly:

- one-based `rank`;
- `doctrineId`;
- `ragRecordHash`;
- exact internal PostgreSQL rank representation used for audit: `encode(float4send(rank), 'hex')`.

The RAG payload is reconstructed only from the bound snapshot records after result integrity checks. Scores, Source metadata, and audit metadata do not enter `DoctrineRagRecordV1`.

`evidenceId` hashes the complete terminal record without `evidenceId`. Same-input repeat executions must have distinct `repeatIndex` values and byte-identical ordered semantic results and score representations.

Authentication failures and malformed JSON/schema/domain commands use existing transport/security handling and create no Doctrine query/evidence authority record.

## Retrieval execution and lifecycle ordering

A query and its evidence are created in one PostgreSQL `SERIALIZABLE` transaction against one exact latest activation. Approval, retirement, activation, and query visibility use the resulting PostgreSQL serialization order, not wall-clock labels.

The transaction must:

1. resolve and bind the latest activation;
2. evaluate whether any visible retirement makes it ineligible;
3. bind the exact snapshot, profile, run, query normalization, and repeat identity;
4. when eligible, execute the pinned lexical predicate and rank;
5. apply deterministic ordering and limit;
6. reconstruct and validate each returned RAG record;
7. append query and terminal evidence atomically, using `failed` with no results when the activation is ineligible.

No result may be returned unless its evidence record commits. A concurrent lifecycle conflict must retry under the same bounded service policy or fail closed; it must never return an unaudited result.

## Persistence

Phase 4A implementation, as authorized, must add forward-only content-hashed PostgreSQL migration(s) for the new records and immutable relations.

Database constraints independently enforce:

- exact JSON keys and schema versions;
- canonical hash and JSON-to-column identity agreement;
- Source allowlist identity;
- non-empty ordered unique snapshots;
- snapshot-entry bindings to exact Phase 3B proposal and approval rows;
- no successful run without a complete logical manifest;
- no activation without a successful run and passed quality report;
- query/evidence relation, repeat uniqueness, result bounds, and terminal-state shape;
- append-only `UPDATE`, `DELETE`, and `TRUNCATE` rejection;
- restricted application-role grants with no extension, DDL, trigger-control, table-owner, or mutation authority.

PGlite may provide fast conformance only where it implements the required native behavior. Digest-pinned real PostgreSQL must prove full-text functions, transaction behavior, concurrency, roles, and the absence from `pg_extension` of unauthorized created extensions.

## Strict transport and API

Phase 4A generates separate JSON Schema 2020-12 and OpenAPI 3.1 artifacts from TypeScript interfaces, then applies existing strict JSON and domain-integrity gates. Existing artifacts are not widened.

Proposed operator-only loopback routes are synchronous:

```text
POST /v1/doctrine/ingestion-runs
GET  /v1/doctrine/corpus-snapshots/:snapshotId
GET  /v1/doctrine/ingestion-runs/:runId
POST /v1/doctrine/activations
GET  /v1/doctrine/activations/current
POST /v1/doctrine/retrieval-queries
GET  /v1/doctrine/retrieval-evidence/:evidenceId
```

All routes require `operator_token`. ADR-0018 trusted-loopback reviewer identity does not satisfy this requirement. Health/readiness behavior is unchanged.

The CLI may expose bounded commands to run ingestion, inspect snapshots/runs/activation, activate a passed run, query the current corpus, and inspect evidence. It uses the existing operator transport and cannot select a principal.

No Research Console route, component, navigation item, or browser query storage is added.

## Required tests

Implementation approval would require tests proving:

- exact six-Source allowlist and rejection of all other inventory entries;
- approved-only complete snapshot construction and exact proposal/approval/Source bindings;
- draft, retired, private, protected-window, Calvin, research-memory, model, and V6 exclusion;
- new IDs and new approval for changed Source/locator/semantics;
- canonical snapshot/profile/run/activation/query/evidence hashes;
- complete rollback on one invalid ingestion entry;
- no results from failed, unpassed, inactive, historical, retirement-invalidated, or post-retirement reactivation snapshots;
- approval does not silently mutate the active corpus;
- retirement fails closed until a clean replacement snapshot is activated;
- exact profile functions, equal field weights, result bounds, score ordering, and `doctrineId` tie-break;
- human-authored positive, cross-concept, no-match, stop-word-only, and repeated-query behavior;
- byte-identical semantic evidence under repeat execution;
- strict JSON, generated-schema/OpenAPI drift, SQL identities, relationships, concurrency, roles, and immutable triggers including `TRUNCATE`;
- no `vector` extension, vector column, embedding/model/provider dependency, network fetch, Console change, public listener, Case access, replay, or trading path.

These tests prove contract, authority, privacy, and deterministic retrieval behavior. They do not prove doctrine correctness, model quality, trading quality, or profitability.

## Phase 4A exit condition

Phase 4A is complete only when:

- a non-empty exact approved corpus snapshot exists;
- one atomic ingestion run and passed quality report produce an eligible explicit activation;
- operator API/CLI returns bounded deterministic approved semantics or explicit `no_match`;
- every result is backed by committed immutable evidence;
- retirement and all forbidden authority tracks fail closed;
- strict generated transport, PostgreSQL constraints, role/concurrency integration, and full repository gates pass.

## Explicit exclusions

This contract does not authorize implementation until accepted. Acceptance does not authorize:

- web search, source fetch/refresh/crawl, full original text, private/member material, or new Source allowlist entries;
- `CREATE EXTENSION vector`, vector columns, embeddings, vector/hybrid search, reranking, or embedding providers;
- model/provider calls, model-generated queries or answers, Case-aware retrieval, or Phase 5 policy behavior;
- Research Console retrieval UI or reviewer/anonymous retrieval routes;
- Calvin review, research memory, outcomes, PnL, evaluation cases, protected windows, or unauthorized V6 inputs;
- real Case ingestion, replay, training, Paper, Live, exchange, wallet, or real-money action.
