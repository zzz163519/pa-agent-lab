# Phase 5A Synthetic Policy Assembly V1

Status: ACCEPTED PHASE 5A CONTRACT. IMPLEMENTATION NOT YET AUTHORIZED.

Authority: ADR-0008 through ADR-0013, ADR-0015, ADR-0017, ADR-0019, and accepted ADR-0020.

## Purpose

Phase 5A deterministically combines one existing synthetic Case, its validated anonymous chart/OHLC inputs, and the complete corpus bound to the current Doctrine activation into one immutable `PolicyAssemblyV1`.

It also defines the explicit operator-only rollback activation required to make a historical eligible corpus current without automatic fallback.

Phase 5A ends at a locally persisted `PolicyAssemblyV1` containing a validated `BrooksPolicyInputV1`. It does not create an outbound payload, logical model call, provider attempt, model answer, or BrooksDecision.

## Fixed scope

Phase 5A accepts only an already persisted `SyntheticCaseBundleV1` whose `sourceScope` reconstructs as exactly `synthetic_fixture_only` and whose recomputed `bundleHash` remains in the deployment's existing exact synthetic-bundle allowlist. The original bundle is reconstructed from the unique Phase 2 `pa_case_policy_inputs` Case/input/chart binding; Phase 5A does not infer synthetic authority from `caseHash` alone.

The assembly request contains exactly:

```text
caseHash
```

The server derives every other identity. The caller cannot provide Doctrine, a query, an activation, a snapshot, a profile, a prompt, a model, a provider, or a prior policy input.

## Definitions

### Current activation authority

The current activation authority is the committed row with the highest database-assigned activation sequence across:

- an ordinary `DoctrineCorpusActivationV1`;
- a `DoctrineCorpusRollbackActivationV1`.

"Latest eligible" never means searching backward. The server resolves the one highest sequence and then verifies it. If that exact activation is ineligible, the operation fails closed.

### Assembly rules version

V1 uses the exact literal:

```text
policy-assembly-rules.v1
```

A semantic change to source selection, activation resolution, chart binding, Doctrine projection, ordering, bounds, canonical byte counting, or failure behavior requires a new assembly-rules version.

### Doctrine context identity

The exact Doctrine context object is:

```json
{
  "schemaVersion": "policy-doctrine-context.v1",
  "doctrine": []
}
```

The `doctrine` array contains every `DoctrineRagRecordV1` from the bound snapshot in snapshot entry order. V1 snapshot order is UTF-8 bytewise ascending `doctrineId`.

`doctrineContextHash` is canonical SHA-256 over this complete object. `doctrineContextByteLength` is the number of UTF-8 bytes in the same canonical serialization.

## Explicit rollback activation

### Command

`DoctrineCorpusRollbackCommandV1` contains exactly:

- `targetActivationId`: one historical ordinary `DoctrineCorpusActivationV1`;
- `reason`: operator-authored text.

Reason normalization:

1. require a plain string with no NUL or control characters;
2. normalize Unicode to NFC;
3. trim leading and trailing whitespace;
4. replace each remaining Unicode-whitespace run with one ASCII space;
5. require 1 through 500 Unicode scalar values.

The server derives the operator principal as exact `local:phase2-operator`. Principal input from the caller is forbidden.

### Record

`DoctrineCorpusRollbackActivationV1` contains exactly:

- `schemaVersion: "doctrine-corpus-rollback-activation.v1"`;
- `activationKind: "rollback"`;
- database-assigned positive `activationSequence`;
- `replacesActivationId`, naming the activation that was current when the transaction serialized;
- `targetActivationId`, naming the earlier ordinary activation;
- target `runId`;
- target `snapshotId`;
- target `profileHash`;
- target `qualityReportHash`;
- normalized `reason`;
- `reasonHash`, the canonical hash of a versioned object containing the normalized reason;
- `operatorPrincipal: "local:phase2-operator"`;
- `activationId`, the canonical hash of the complete record without `activationId`.

An ordinary activation remains schema `doctrine-corpus-activation.v1` and is interpreted as `activationKind: "standard"` by the common activation read model. Existing ordinary activation JSON is not rewritten.

### Transaction

Rollback runs in one PostgreSQL `SERIALIZABLE` transaction:

1. resolve the highest committed activation sequence;
2. load the exact target ordinary activation;
3. require target sequence to be lower than current sequence;
4. require target run status `succeeded`;
5. require the exact target quality report status `passed`;
6. require target run, snapshot, profile, and report identities to agree;
7. require the target Source identities to remain in the exact Phase 4A allowlist;
8. require every target Doctrine proposal and approval relation to remain valid;
9. reject any then-visible retirement for a target Doctrine ID;
10. require the target retrieval profile/runtime to remain supported;
11. allocate a new activation sequence;
12. append the rollback activation atomically.

The target snapshot need not equal the complete eligible projection visible at rollback time. Restoring an older complete snapshot may intentionally omit approvals added later. This exception is allowed only through this explicit command and record.

No ordinary activation row or historical snapshot is updated. No new ingestion run or quality report is synthesized. A rejected rollback creates no activation or research record.

### Idempotency

An immediate exact retry after a successful rollback returns the latest existing rollback activation when its target activation and normalized reason match the request. If another activation became current after that rollback, the same command is a new deliberate rollback and receives a new sequence and identity.

Ordinary activation keeps its existing idempotency: the same run and quality report return the existing ordinary activation and do not become current again.

### Prohibitions

Rollback must not:

- run automatically after retirement, quality failure, startup, query failure, or assembly failure;
- target a failed run, failed report, non-activation record, current/future sequence, or rollback record;
- revive any retired DoctrineUnit;
- alter, recreate, or omit individual entries inside the target snapshot;
- accept operator principal, run, snapshot, profile, report, Doctrine IDs, or activation sequence from the caller.

## Assembly records

### `PolicyAssemblyDoctrineBindingV1`

Each ordered manifest element contains exactly:

- `doctrineId`;
- `ragRecordHash`.

The order and values must equal the bound snapshot entries and the rebuilt policy input Doctrine array.

### `PolicyAssemblyChartBindingV1`

Each panel binding contains exactly:

- `panel: "context" | "detail"`;
- `metadataId`;
- `artifactId`;
- `contentHash`.

The context and detail bindings must reference the selected Case, their exact panels, their content-addressed PNG bytes, and the chart manifests embedded in the rebuilt policy input.

### `PolicyAssemblyV1`

A successful assembly contains exactly:

- `schemaVersion: "policy-assembly.v1"`;
- `assemblyRulesVersion: "policy-assembly-rules.v1"`;
- `sourceScope: "synthetic_fixture_only"`;
- `caseHash`;
- `sourceBundleHash`, equal to the canonical hash of the exact reconstructed original `SyntheticCaseBundleV1`;
- `activationKind: "standard" | "rollback"`;
- `activationId`;
- positive `activationSequence`;
- `runId`;
- `snapshotId`;
- `profileHash`;
- `qualityReportHash`;
- `doctrineContextHash`;
- positive `doctrineContextByteLength`;
- non-empty ordered `doctrineManifest`;
- exact `charts.context` and `charts.detail` bindings;
- complete rebuilt `policyInput: BrooksPolicyInputV1`;
- `inputHash`, equal to `policyInput.inputHash`;
- `operatorPrincipal: "local:phase2-operator"`;
- `assemblyId`, the canonical hash of the complete record without `assemblyId`.

The `sourceBundleHash` is local synthetic-authorization provenance only. The service uses the original bundle to recover and validate the Case/chart chain, but the original bundle's Doctrine array never determines, supplements, orders, or filters `policyInput.doctrine`.

The record contains no wall-clock value. Database serialization order and bound immutable parent identities supply ordering and provenance.

### `PolicyAssemblyFailureV1`

A bounded expected failure contains exactly:

- `schemaVersion: "policy-assembly-failure.v1"`;
- `assemblyRulesVersion: "policy-assembly-rules.v1"`;
- `sourceScope: "synthetic_fixture_only"`;
- `caseHash`;
- `sourceBundleHash`, equal to the exact reconstructed original bundle hash;
- `activationKind: "standard" | "rollback" | null`;
- `activationId: sha256 | null`;
- `activationSequence: positive integer | null`;
- `snapshotId: sha256 | null`;
- `observedDoctrineCount: non-negative integer | null`;
- `observedDoctrineContextByteLength: non-negative integer | null`;
- one or more ordered unique `errorCodes`;
- `operatorPrincipal: "local:phase2-operator"`;
- `failureId`, the canonical hash of the complete record without `failureId`.

V1 error codes are exactly:

- `ACTIVATION_UNAVAILABLE`;
- `ACTIVE_CORPUS_INELIGIBLE`;
- `DOCTRINE_COUNT_EXCEEDED`;
- `DOCTRINE_CONTEXT_BYTES_EXCEEDED`.

No-activation failures use null activation/snapshot/observed fields. Ineligible-activation failures bind the resolved current activation and snapshot but do not search older activations. Limit failures bind the activation/snapshot and exact observed count and byte length.

An exact failure record, including `sourceBundleHash`, is content-idempotent and returns existing on repeat. A changed current activation, changed rules version, or changed observed limit evidence creates a different immutable failure.

Authentication failure, malformed JSON/schema/domain input, unknown `caseHash`, a reconstructed source bundle outside the deployment allowlist, or an ambiguous original Phase 2 bundle binding creates no `PolicyAssemblyFailureV1`. Unexpected database, filesystem, canonicalization, or integrity errors also do not become one of the four expected failure codes; they fail closed through existing service error handling.

## Assembly algorithm

After authentication and strict request validation, one PostgreSQL `SERIALIZABLE` transaction must:

1. reconstruct the exact original Phase 2 CaseBundle by `caseHash` from its unique `pa_case_policy_inputs` binding, require `synthetic_fixture_only`, recompute `sourceBundleHash`, and require that hash in the configured deployment allowlist; if absent, ambiguous, or unauthorized, return the existing not-found/forbidden/integrity error without a research record;
2. resolve the highest activation sequence once;
3. if none exists, append the exact bounded no-activation failure and stop;
4. revalidate the exact current activation, run, report, snapshot, profile, Source, proposal, approval, and retirement chain;
5. if current authority is ineligible, append the exact bounded ineligible failure and stop;
6. load all snapshot entries in canonical snapshot order and reconstruct each `DoctrineRagRecordV1` from its bound snapshot record;
7. require 1 through 32 entries; if exceeded, append the exact count failure and stop;
8. build the versioned canonical Doctrine-context object and calculate its hash and UTF-8 byte length;
9. require byte length at most 524,288; if exceeded, append the exact byte failure and stop;
10. resolve the Case's context/detail metadata bindings and require all valid stored Case/input bindings to converge on the same chart identities; ambiguity fails as an integrity error;
11. revalidate the existing content-addressed PNG bytes, metadata, panel, dimensions, Case binding, bar IDs, and last visible bar through the ADR-0012 artifact seam;
12. call the existing `createBrooksPolicyInput` with the local Case, exact chart manifests, and complete ordered snapshot Doctrine records;
13. ignore and do not copy the Doctrine array from the reconstructed original policy input;
14. construct and validate `PolicyAssemblyV1`;
15. persist the rebuilt `BrooksPolicyInputV1`, a new assembly-specific Case/input/chart relation, ordered assembly Doctrine relations, and assembly record atomically without inserting another Phase 2 `pa_case_policy_inputs` row;
16. return `inserted` for a new assembly or `existing` for an exact natural-identity repeat.

A transaction that writes a failure writes no new policy input, assembly-specific Case/input/chart relation, Doctrine relation, or success assembly. A success becomes visible only as a complete chain.

## Bounds and ordering

The V1 success rules are:

| Setting | Exact value |
|---|---|
| source scope | `synthetic_fixture_only` |
| activation resolution | highest committed activation sequence, resolved once |
| fallback | none |
| Doctrine selection | every entry in bound snapshot |
| Doctrine ordering | snapshot entry order |
| minimum Doctrine count | 1 |
| maximum Doctrine count | 32 |
| canonical Doctrine-context maximum | 524,288 UTF-8 bytes |
| truncation | forbidden |
| query construction | none |
| lexical retrieval call | none |
| rank fusion | none |
| scheduler/background work | none |

The total corpus store may contain more than 32 records. The bound active snapshot simply cannot be assembled by V1 until a separately approved selector or assembly-rules version addresses that scale.

## Identity and idempotency

The success natural identity is:

```text
(caseHash, activationId, assemblyRulesVersion)
```

The database and TypeScript validators must reject a conflicting record under that identity. They must not compare only `inputHash`, because two Cases can legitimately share byte-equivalent anonymous inputs while retaining separate local provenance.

A rollback activation always has a new activation ID. Therefore assembly after rollback creates a new record even when it restores the same snapshot and produces the same `inputHash`. This preserves the exact authority event active at request time.

A rules-version change creates a new assembly and never updates an old one.

## Historical and authority isolation

The assembly data-access path may read only:

- the selected synthetic Case record and its unique original Phase 2 Case/input/chart binding;
- the configured exact synthetic-bundle hash allowlist needed to revalidate `sourceBundleHash`;
- chart metadata and local content-addressed PNG bytes;
- the current activation row;
- its exact ingestion run, passed quality report, snapshot, entries, proposal/approval/retirement relations, and RAG records.

It must not read or derive from:

- `pa_brooks_decisions`;
- `pa_calvin_reviews`;
- blind-review assessment, reveal, or workflow tables;
- `pa_model_runs`, `pa_provider_attempts`, or `pa_model_run_audits`;
- prior model answers or prior outbound payloads;
- outcomes, PnL, replay, settlement, or active positions;
- chat/research memory or research candidates;
- bars after the Case cutoff;
- protected `2025-02`, `2025-05`, or `2025-08` windows.

Adding conflicting values to any forbidden table must not change the assembly or failure identity for the same allowed parent chain.

## Persistence contract

Future implementation requires two ordered forward-only content-hashed migrations:

1. explicit rollback activation support;
2. Phase 5A assembly and failure records.

The rollback migration must preserve existing ordinary activation IDs and JSON. It must distinguish ordinary and rollback rows in the activation table/read model, retain one ordinary activation per run/report, permit historical run/report reuse only for a valid rollback record, and keep existing query/evidence foreign-key bindings valid.

The assembly migration must add append-only persistence for:

- policy assemblies;
- assembly-specific Case/input/chart bindings that do not alter Phase 2 bundle uniqueness;
- ordered assembly Doctrine bindings;
- policy assembly failures;
- required activation and Case/input/chart relations.

Database constraints independently enforce:

- exact schema versions and closed JSON keys;
- SHA-256 shape and canonical JSON-to-column identity;
- activation kind and rollback causation shape;
- success-run and passed-report relationships;
- snapshot/manifest/Doctrine order and exact hashes;
- reconstructed `sourceBundleHash`, Case/input/chart agreement, and preservation of the unique original Phase 2 bundle binding;
- success/failure mutual exclusion and bounds;
- success natural identity and exact-repeat idempotency;
- `UPDATE`, `DELETE`, and `TRUNCATE` rejection;
- restricted application-role grants with no DDL, table-owner, trigger-control, or extension authority.

PGlite may provide fast conformance where supported. Digest-pinned real PostgreSQL 18 must prove transaction serialization, activation ordering, retirement races, foreign keys, partial uniqueness, grants, and immutable triggers.

## Strict transport

Future generated JSON Schema 2020-12 and OpenAPI 3.1 artifacts must remain separate, closed, and drift-tested.

Proposed operator-only loopback routes are synchronous:

```text
POST /v1/doctrine/rollback-activations
GET  /v1/doctrine/activations/:activationId
POST /v1/policy-assemblies
GET  /v1/policy-assemblies/:assemblyId
GET  /v1/policy-assembly-failures/:failureId
```

The existing `GET /v1/doctrine/activations/current` response must support both ordinary and rollback activation records without weakening authentication.

A new rollback or success/failure assembly record returns HTTP `201`. An exact existing record returns `200`. A persisted bounded assembly failure is a successful terminal research operation, not a transport error. Existing authentication, malformed-request, not-found, conflict, dependency, and internal error mappings remain authoritative.

The CLI may expose bounded commands equivalent to:

```text
doctrine rollback --target-activation <sha256> --reason <text>
doctrine activation --activation-id <sha256>
policy assemble --case-hash <sha256>
policy assembly --assembly-id <sha256>
policy assembly-failure --failure-id <sha256>
```

The CLI cannot choose or send a principal, activation for assembly, snapshot, Doctrine list, query, prompt, model, or provider.

No route or CLI command creates `OutboundModelPayloadV1`, `ModelRunRecordV1`, a provider attempt, or a BrooksDecision.

## Required tests

An authorized implementation requires tests proving:

### Rollback

- only operator authentication reaches rollback;
- strict target/reason parsing and normalization;
- target must be an earlier ordinary activation;
- exact run/snapshot/profile/passed-report binding is revalidated;
- retired target Doctrine rejects rollback;
- later approvals may be absent from an explicitly restored earlier snapshot;
- no automatic rollback after retirement or failure;
- database-assigned sequence is greater than the replaced activation;
- new rollback ID differs from the historical target ID;
- immediate exact retry returns existing;
- the same target after an intervening activation creates a new event;
- ordinary activation repeat still returns its original existing record;
- concurrent activate/retire/rollback operations serialize or fail closed;
- current retrieval binds the rollback activation and never silently uses its historical target ID.

### Assembly

- request accepts only `caseHash`, reconstructs an exact allowlisted source bundle, and accepts only an existing synthetic Case;
- missing/unauthorized source bundle and ambiguous original binding create no research failure;
- caller cannot select activation, snapshot, Doctrine, query, principal, prompt, model, or provider;
- highest activation is resolved once, with no historical fallback;
- both ordinary and rollback activation authorities assemble correctly;
- original fixture Doctrine is discarded;
- every and only current snapshot RAG record appears in exact snapshot order;
- 1 and 32 Doctrine records succeed; 33 fails without truncation;
- 524,288 canonical bytes succeeds; 524,289 fails without truncation;
- Case, normalized OHLC, continuity, chart manifests, metadata, and PNG hashes remain exact;
- complete `PolicyAssemblyV1`, `sourceBundleHash`, and `BrooksPolicyInputV1` hashes recompute;
- same Case/current activation/rules returns existing;
- a new activation or rules version creates a new assembly;
- byte-equivalent anonymous inputs from distinct Cases retain distinct assembly provenance;
- success persists input, assembly-specific binding, manifest, and assembly atomically without adding a second Phase 2 bundle binding;
- expected failure persists only one bounded failure record;
- malformed, unauthorized, unknown-Case, and unexpected integrity/service failures create no research failure;
- prior decision, Calvin review, assessment, model-run, provider-attempt, outcome-like, PnL-like, replay, and memory fixtures cannot affect assembly identity;
- no retrieval query/evidence is created by assembly;
- no outbound payload, ModelRun, provider attempt, BrooksDecision, network request, scheduler, or Console surface exists.

### Platform

- strict persisted JSON rejects duplicate and unknown keys;
- generated schema/OpenAPI artifacts cannot drift;
- PostgreSQL constraints reject column/JSON mismatch and broken relations;
- all new records and relations reject `UPDATE`, `DELETE`, and `TRUNCATE`;
- application roles cannot alter schema, triggers, roles, or extensions;
- `vector` remains absent from `pg_extension`;
- full repository tests, Research Console tests, typecheck, LSP diagnostics, and fresh real PostgreSQL integration pass.

These tests prove causal, authority, privacy, determinism, and persistence behavior. They do not prove doctrine quality, model quality, trading quality, or profitability.

## Phase 5A exit condition

Phase 5A is complete only when:

- explicit rollback can make one still-eligible historical ordinary activation current through a new auditable activation identity;
- ordinary activation idempotency and retirement fail-closed behavior remain intact;
- one existing synthetic Case can be assembled against the exact current ordinary or rollback activation;
- the complete anonymous input and all Case/chart/activation/snapshot/Doctrine/input hashes persist atomically;
- exact repeats are idempotent and version/authority changes append new records;
- all bounds and historical-isolation tests pass in real PostgreSQL;
- no Phase 5B, Phase 4B, real-data, replay, or trading authority is present.

## Explicit exclusions

This accepted contract grants no implementation authority and does not authorize:

- provider/model selection, prompt contract, outbound payload, model run, provider attempt, response, or BrooksDecision creation;
- embedding, `pgvector`, vector/hybrid retrieval, RRF, reranking, or Case-derived queries;
- source fetching, new Source allowlists, private corpus, full source text, or protected windows;
- scheduler, queue, worker, MCP sidecar, Research Console UI, reviewer access, or public deployment;
- real Case ingestion, evaluation outcomes, PnL, replay, training, Paper, Live, exchange, wallet, or real-money activity.
