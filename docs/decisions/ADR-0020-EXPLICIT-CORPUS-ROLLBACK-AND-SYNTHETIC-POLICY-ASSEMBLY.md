# ADR-0020: Explicit Corpus Rollback and Synthetic Policy Assembly

Status: ACCEPTED FOR PHASE 5A IMPLEMENTATION.

## Context

Phase 4A now persists complete approved and unretired Doctrine projections as immutable snapshots, gates them through a fixed PostgreSQL lexical-quality suite, and makes the latest append-only activation the query authority. Phase 1 and Phase 2 already persist synthetic Cases, deterministic anonymous chart artifacts, and `BrooksPolicyInputV1` records.

Those two paths are not yet joined safely:

- a stored synthetic CaseBundle may contain old fixture Doctrine that was valid only for the original synthetic test;
- Phase 4A retrieval is operator-only and accepts human query text, but no approved Case-to-query policy exists;
- the current activation implementation treats a repeated historical run/report activation as the existing activation, so it cannot deliberately make an older snapshot current again;
- creating `OutboundModelPayloadV1`, `ModelRunRecordV1`, or a provider request would cross a separate authority boundary.

The smallest useful Phase 5 step is therefore deterministic local assembly, not model inference. It must prove that one existing synthetic Case, its anonymous chart/OHLC input, and the current formally activated Doctrine corpus can become one immutable, auditable input without reading prior answers or calling a provider.

## Decision

### Phase split

Phase 5 is split into:

- **Phase 5A**: explicit corpus rollback plus synthetic-only Policy Assembly;
- **Phase 5B**: prompt identity, outbound payload, ModelRun creation, provider transport, response validation, and Brooks Policy inference.

This ADR accepts only Phase 5A. Phase 5B requires a separate ADR, contract, provider/model decision, privacy review, and implementation approval.

### Explicit corpus rollback is a prerequisite

Phase 5A requires one operator-only command that can deliberately reactivate the corpus chain of an earlier ordinary activation. The command names one exact historical ordinary `activationId` and provides a bounded reason. It does not name arbitrary Doctrine IDs or construct a new snapshot.

A rollback:

- resolves the highest committed activation sequence as the activation being replaced;
- requires the target ordinary activation to have a lower sequence;
- revalidates the target's exact successful ingestion run, passed quality report, snapshot, profile, Source allowlist, and all target Doctrine approval/retirement relations;
- rejects a target containing any DoctrineUnit that is retired at rollback serialization time;
- allocates a new database activation sequence;
- appends one immutable rollback activation record that copies the target run, snapshot, profile, and quality-report identities and records the replaced activation, target activation, reason, and server-derived operator principal;
- makes that new rollback activation, not the historical target record, the current authority.

Rollback is an explicit version-level exception to constructing a new complete projection. It may intentionally restore an earlier complete snapshot that omits approvals added later, and its reason makes that authority choice visible. It cannot revive a retired DoctrineUnit. A retired rule must be replaced under a new Doctrine ID and approved again.

The system never rolls back automatically, never searches backward for an eligible activation, and never treats ordinary activation idempotency as rollback authority.

### Assembly trigger and authority

Only an authenticated operator may request assembly, and the request contains only one existing synthetic `caseHash`. The server reconstructs the exact original `SyntheticCaseBundleV1` from its unique Phase 2 Case/input/chart binding, recomputes `bundleHash`, and requires that hash to remain in the deployment's configured synthetic-bundle allowlist. The caller cannot select:

- an activation, snapshot, ingestion run, quality report, or retrieval profile;
- Doctrine IDs, order, count, or query text;
- a historical policy input, model output, review, or outcome;
- a prompt, model, provider, or output schema.

Within one `SERIALIZABLE` transaction, the server resolves the highest committed activation sequence exactly once. That record may be an ordinary activation or an explicit rollback activation. The server then verifies that this exact current activation remains eligible. If it is ineligible, assembly fails closed and does not use an older activation.

### Full-corpus V1 baseline

Phase 5A does not derive a lexical query from the Case. It uses every `DoctrineRagRecordV1` in the current activation's exact snapshot, in canonical snapshot order.

This complete-corpus baseline is deliberate. The initial corpus is small, and no approved deterministic Price Action classifier yet exists for choosing Case-specific queries. Using the full activated corpus tests the end-to-end authority and input chain without introducing an outcome-led selector.

A later Selector V2 may use deterministic multiple queries, union and deduplication, reciprocal-rank fusion, `doctrineId` tie-breaking, and immutable selector evidence. That future selector requires a separate contract and does not alter Phase 5A.

### Hard input bounds

One successful V1 assembly may contain at most:

- 32 Doctrine records;
- 524,288 UTF-8 bytes in the canonical versioned Doctrine-context object.

The limit applies to one assembled input, not to the total stored corpus. If the current active snapshot exceeds either bound, the service records a bounded terminal assembly failure. It never truncates, samples, reorders, queries, or silently omits Doctrine.

### Rebuild the anonymous input

The service keeps the selected synthetic Case's causal closed bars and its exact existing context/detail chart artifacts. It discards the Doctrine array carried by the original synthetic CaseBundle and deterministically rebuilds `BrooksPolicyInputV1` from:

- the persisted local `BrooksPolicyCaseV1`;
- the exact existing validated anonymous context/detail chart manifests and artifact bindings;
- the complete ordered RAG projection of the current activation's snapshot.

No raw local Case identity, stream identity, timestamp, symbol, venue, account, or raw price enters `BrooksPolicyInputV1`. The local `PolicyAssemblyV1` separately binds the Case hash and all authority/provenance hashes.

### Immutable success and failure records

A successful `PolicyAssemblyV1` stores the complete rebuilt `BrooksPolicyInputV1` and binds at least:

- assembly-rule version and synthetic source scope;
- `caseHash` and reconstructed `sourceBundleHash`;
- activation kind, ID, and sequence;
- ingestion run, snapshot, retrieval profile, and quality-report hashes;
- ordered Doctrine IDs and RAG-record hashes;
- canonical Doctrine-context hash and byte length;
- context/detail metadata, artifact, and content hashes;
- rebuilt `inputHash`;
- server-derived operator principal;
- canonical `assemblyId`.

The natural idempotency key is `(caseHash, activationId, assemblyRulesVersion)`. An exact repeat under the same current authority returns the existing record. A new activation identity or new assembly-rule version creates a new append-only assembly, even if other content happens to agree.

A structurally valid authenticated request for an existing synthetic Case records a bounded `PolicyAssemblyFailureV1` when assembly cannot proceed because:

- no current activation exists;
- the current activation is ineligible, including retirement invalidation;
- the Doctrine-count limit is exceeded;
- the Doctrine-context byte limit is exceeded.

Authentication failure, malformed input, or unknown `caseHash` remains a security/transport error and creates no research record. Unexpected infrastructure or integrity corruption fails closed and cannot be mislabeled as a valid bounded research failure.

### Historical isolation

Assembly may read only the selected synthetic Case, its existing anonymous chart/input bindings, and the current activation/snapshot/Doctrine authority chain. Its output and identity must remain unchanged when any of the following are added or changed outside that allowed chain:

- prior `BrooksDecisionV1` values or model answers;
- `CalvinReviewV1`, blind assessments, reveal receipts, or conflicts;
- `ModelRunRecordV1`, provider attempts, or model-run audits;
- outcomes, PnL, win rate, replay results, or active-position state;
- research memory, chat history, or research candidates;
- later bars or any protected-window material.

### API, CLI, and deployment boundary

Phase 5A uses only the existing loopback Fastify, generated OpenAPI, restricted PostgreSQL role, local operator bearer token, and bounded CLI seams. Reviewer and trusted-loopback browser identity do not grant rollback or assembly authority. No Research Console route or page is added.

The service remains synchronous. Phase 5A adds no scheduler, background worker, queue, SSE, WebSocket, MCP server, or public listener.

### Persistence

Phase 5A uses forward-only, content-hashed migrations and append-only PostgreSQL records. New records and relations reject `UPDATE`, `DELETE`, and `TRUNCATE`, enforce JSON-to-column identities and exact foreign-key bindings, and preserve ordinary activation idempotency while permitting only explicit rollback activations to reuse a historical run/report chain.

A successful assembly persists the rebuilt policy input, a new assembly-specific Case/input/chart relation, the Doctrine manifest, and the assembly atomically. It does not add a second Phase 2 `pa_case_policy_inputs` bundle binding, because that would make existing CaseBundle audit/review loading ambiguous. A failure record is written atomically without a partial policy input or assembly.

## Reuse decision

A read-only scan on 2026-08-03 inspected installed skills, skills.sh, ClawHub, MCP-oriented provenance tools, npm metadata, and maintained GitHub projects.

Selected for reuse:

- existing `createBrooksPolicyInput` and strict canonical SHA-256 utilities;
- existing synthetic Case, anonymous chart, PostgreSQL, transaction, migration, generated schema/OpenAPI, Fastify, operator-authentication, and CLI seams;
- existing Phase 4A snapshot, activation, retirement, and RAG-record contracts.

Rejected for Phase 5A:

- XState and LangGraph.js: a single deterministic database transaction does not need a state-machine or agent-orchestration runtime;
- Temporal TypeScript SDK: distributed durable workers and asynchronous workflow services exceed the synchronous local slice;
- `@inflexa-ai/tsprov`: W3C PROV is useful for general interchange, but its flexible graph and `luxon` dependency do not enforce this repository's fixed authority and hash relations;
- MCP Witness: its Python MCP server, signing/anchoring, dashboard, independent storage, and deletion behavior add a second audit authority;
- TRACE: its Python MCP sidecar and client-emitted session logs are not database-enforced domain records;
- ClawHub `log`, `skill-provenance`, and `deterministic-controller`: they provide agent guidance or emitted logs, not local transactional authority;
- `fusion-rank`: RRF is relevant only to the deferred Selector V2, while Phase 5A uses the complete corpus and no rank fusion.

No skill, MCP server, npm package, service, Docker image, provider, or model is added by this decision.

## Consequences

- The repository can prove the complete Case-to-approved-context chain before model/provider risk is introduced.
- The exact original CaseBundle hash remains deployment-authorized and stored Phase 2 CaseBundle reconstruction stays unique;
- Stored synthetic fixture Doctrine cannot silently become current policy context.
- Every successful input identifies the exact corpus authority that produced it.
- Retirement remains fail closed, and rollback is visible, deliberate, and operator-attributed.
- A restored older corpus may intentionally omit later approvals, but it cannot contain a retired unit.
- The 32-record and 512 KiB bounds expose when full-corpus assembly no longer scales instead of silently changing behavior.
- Whether lexical, vector, hybrid, or multi-query selection is needed can be decided later from an explicit selector contract, not inferred from this baseline.

## Not authorized

This accepted ADR does not authorize:

- implementation beyond the bounded Phase 5A contract, migration changes beyond `0006`/`0007`, or any additional deployment surface;
- retroactive synthetic authority for a Case whose reconstructed original bundle hash is absent from the configured allowlist;
- `OutboundModelPayloadV1`, `ModelRunRecordV1`, provider attempts, model-run audits, prompt selection, provider/model calls, or model answers;
- Case-derived retrieval queries, RRF, embeddings, `pgvector`, vector/hybrid search, reranking, or Phase 4B;
- new Source classes, source fetching, crawling, private corpus ingestion, or full source text;
- Research Console assembly/retrieval, reviewer authority, scheduler, worker, or public API;
- real Case ingestion, protected-window access, outcomes, PnL, replay, training, Paper, Live, exchange, wallet, or real-money activity.

Implementation is authorized only for the bounded Phase 5A scope in this ADR and its accepted contract. Any worker write delegation still requires its own exact-scope approval.
