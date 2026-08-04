# PA Agent Lab Implementation Sequence V1

Status: DRAFT SEQUENCE. PHASE 0, PHASE 1 CONTRACTS, PHASE 2, PHASE 3A/3B, PHASE 4A, PHASE 5A, AND PHASE 5B1 CONTRACT/IMPLEMENTATION AUTHORITY ARE ACCEPTED; THE FIRST EXACT PHASE 5B1 STANDARD PACKAGE ACTIVATION AND PREPARED PAYLOAD WERE SEPARATELY AUTHORIZED AND PERFORMED. PHASE 5B2A DESIGN IS ACCEPTED, AND THE PHASE 5B2B OFFLINE ADAPTER/FAKE-EXECUTABLE/PROMPT-V2-PROPOSAL BOUNDARY WAS SEPARATELY AUTHORIZED AND IMPLEMENTED. PROMPT V2 APPROVAL/ACTIVATION, REAL CLI INVOCATION, ALL PROVIDER CALLS, AND PHASE 4B, SELECTOR V2, OR LATER AUTHORITY REMAIN SEPARATE.

## Delivery model

Use contract/API-first vertical slices. Do not build the full frontend first, and do not defer all user-interface work until the backend is complete.

The first user interface exists to produce high-quality outcome-blind source reviews and adjudication evidence. It is not a dashboard, trading terminal, policy-authoring shortcut, or marketing site.

## Phase 0: Governance bootstrap

Baseline complete. Later governance decisions remain append-only work.

- establish the independent repository and charter;
- record accepted architecture decisions separately from drafts;
- define private-corpus and protected-data boundaries;
- keep the repository free of model, database, and UI dependencies.

Exit condition: repository identity, authority tracks, and prohibited inputs are explicit and version-controlled.

## Phase 1: Domain contracts

Completed contract phase. The ADR-0008 scheduling, ADR-0010 semantic, ADR-0011 causal-input/privacy/model-run-audit, ADR-0012 deterministic-chart, ADR-0013 strict-persistence, and ADR-0014 provider-neutral replay-boundary contract slices are implemented. Provider transport, replay engines, and execution mechanics remain unauthorized.

- freeze causal case identity and visible-through boundary;
- freeze the accepted 120/40 chart/OHLC payload, normalization, bar identity, continuity, left-censoring, anonymity schemas, and the ADR-0009 five-minute (`300` second) V1 decision duration;
- freeze `brooksDecision`, `calvinReview`, and disagreement schemas;
- use the simple ADR-0010 Source and DoctrineUnit records and defer actual ingestion to Phase 4;
- define policy decision, evidence reference, uncertainty, and validation records;
- freeze deterministic anonymous chart bytes, artifact identity, and local content-addressed persistence;
- use ADR-0013 strict persisted JSON, generated OpenAPI 3.1 components, chart metadata, and atomic PostgreSQL uniqueness for the implemented Case, input, chart artifact, ModelRun, ProviderAttempt, and Audit records;
- defer detailed dataset partition machinery until Phase 6 needs a frozen evaluation case list;
- use ADR-0014's exact-slice authorization, strictly post-cutoff provenance, one-path `ReplayRequest`, four-state `ReplayResult`, ambiguity/censoring, and audit identities without implementing or installing a replay engine;

Exit condition: synthetic schema tests can reject future bars, raw identity/price leakage, unauthorized memory, missing provenance, malformed continuity, track conflation, invalid replay states, and implicit same-bar ordering before any provider or replay-engine call.

## Parallel Phase 1 corpus preflight: public-source inventory and doctrine pilot

This is an authorized preparatory track, not formal Phase 4 ingestion and not a new runtime service. It may proceed in parallel with the contract/API track before Phase 2 or Phase 4.

- inventory the official Brooks public area as the primary source surface;
- inventory public Ask Al Q&A transcripts as the first text-oriented extraction source;
- produce `SOURCE_INVENTORY_V1` with URL, source type, approximate volume, copyright/availability status, content/version hash, and extraction priority;
- extract 5–10 source-mapped `draft` DoctrineUnits from Ask Al, the six-aspect coverage model, and the ten-pattern pilot set;
- use the V6 rulebook layer model as a coverage checklist only;
- use the V6 50-case stale-trend review only as an extraction-priority and failure-mode signal;
- record source mapping and human semantic review notes without promoting the pilot to a complete approved corpus.

This track does not authorize embeddings, vector retrieval, a running RAG service, provider calls, training, or model-generated approval. Formal source ingestion, approved DoctrineUnit lifecycle, and retrieval remain Phase 4 work.

Exit condition: one small public-source inventory and 5–10 draft DoctrineUnits show whether the current contract can express structural semantics clearly, identify the highest-priority coverage gaps, and preserve Brooks-source versus V6-prioritization separation.

## Phase 2: Synthetic Case store and local API

Implemented by ADR-0015 as a synthetic-only vertical slice:

- persist one complete Case/input/context/detail bundle atomically;
- persist BrooksDecision and CalvinReview independently; derive DecisionConflict on demand;
- expose versioned loopback REST/OpenAPI with strict raw JSON, bounded requests, local-token authentication, deterministic audit, and PNG content reads;
- use content-hashed migrations, restricted PostgreSQL roles, pinned PostgreSQL 18/pgvector image identity, PGlite conformance, and real PostgreSQL integration tests;
- provide a synthetic CLI fixture before any graphical interface;
- reject real data ingestion, generic labels/commitments, dataset splits, event streaming, and public deployment.

Exit condition met: one deterministic synthetic causal case can be created, reviewed, immutably retrieved, and audited without model involvement. Real Case ingestion and detailed dataset partitions remain separately deferred.

## Phase 3A: Synthetic blind review Research Console

Implemented by ADR-0016 as a synthetic-only vertical slice:

- render only anonymous 120/40 PNG and normalized causal OHLC through the cutoff;
- freeze one immutable independent verdict and blind summary before reveal;
- persist one reveal receipt before returning BrooksDecision content;
- collect only whole-decision `agree`, `clarify`, `disagree`, or `uncertain` after reveal;
- construct `CalvinReviewV1` server-side and atomically bind assessment, receipt, decision, review, reviewer, and protocol;
- derive four workflow states without a mutable status table;
- separate operator and reviewer principals and serve the React Research Console on the same loopback origin;
- support bearer reviewer identity by default and ADR-0018's persistent trusted-loopback Compose deployment without weakening operator authentication;
- keep the credential-bearing app/database internal and publish only a credential-free fixed-target gateway on `127.0.0.1`;
- auto-save only the unsubmitted exact-identity draft in tab-local session storage;
- keep Doctrine approval, real ingestion, market modules, provider, replay, and execution absent.

Exit condition met: Calvin can complete, pause, resume, and audit one immutable outcome-blind review without editing JSON or receiving BrooksDecision content before the frozen assessment.

## Phase 3B: Minimal Doctrine source approval

Implemented by ADR-0017 as a local public-source lifecycle:

- freeze a complete URL-level snapshot of the modern official sitemap, official YouTube channel, public legacy surface, and selected directly attributable external interviews;
- keep `doctrine_candidate` discovery separate from approval and all other URLs `inventory_only`;
- bind one exact Source, draft DoctrineUnit, locator, and proposal hash;
- allow one explicit Calvin or authenticated Direct Pi/agent operator approval;
- persist immutable proposal, approval, and retirement records and derive `draft | approved | retired`;
- expose five synchronous routes, draft-only CLI seeding, and a minimal Doctrine Console module;
- keep source content fetching, proposal editing, embeddings, retrieval, providers, real data, replay, and execution absent.

Exit condition met: an exact public-source proposal can be explicitly approved or retired, and draft/retired units cannot enter the approved projection.

## Phase 4: Doctrine ingestion and retrieval

ADR-0019 splits the original broad Phase 4 direction into an implemented lexical slice and a separately authorized future vector slice.

### Phase 4A: approved corpus and lexical retrieval

- project the complete approved, unretired Doctrine set from the Phase 3B authority chain into immutable snapshots;
- preserve exact Source, proposal, approval, and simplified RAG-record hashes without fetching or storing source bodies;
- run one fixed PostgreSQL lexical profile over the five approved semantic fields;
- require human-authored outcome-free quality fixtures, an explicit passed report, and explicit activation;
- expose only operator-authenticated loopback API and CLI retrieval;
- commit immutable query/evidence records for matched, no-match, retirement-invalidated, and terminal retrieval paths;
- exclude draft, retired, Calvin-review, research-memory, model-generated, Case, outcome, replay, and trading authority.

Exit condition met: the exact initial approved corpus can be ingested and explicitly activated; bounded deterministic lexical queries return approved simplified semantics or an audited terminal state, while PostgreSQL constraints and restricted roles fail closed.

### Phase 4B: vector and hybrid retrieval

Still requires a separate ADR, contract, and implementation approval before adding embeddings, `pgvector` extension/schema, vector or hybrid retrieval, reranking, provider calls, model-run retrieval integration, or Case-aware query construction.

## Phase 5: Brooks Policy Agent vertical slice

ADR-0020 splits Phase 5 into an implemented synthetic assembly slice and a separately decided inference track. Accepted ADR-0021 divides that track into the completed offline Prompt Package boundary and a provider-bound boundary. Accepted design-only ADR-0022 further separates provider-adapter design from implementation and external-call authority.

### Phase 5A: explicit corpus rollback and synthetic Policy Assembly

Implemented and freshly verified under ADR-0020 and the accepted Phase 5A contract; Direct Pi remained the sole writer.

- add one operator-only explicit rollback command that revalidates an earlier ordinary activation and appends a new rollback activation identity;
- never roll back automatically or search backward from an ineligible current activation;
- accept only one existing deployment-authorized synthetic `caseHash` per assembly command;
- reconstruct the exact original Phase 2 CaseBundle for synthetic authorization, but discard its fixture Doctrine from the new input;
- bind the highest-sequence current ordinary or rollback activation once inside a `SERIALIZABLE` transaction;
- assemble every RAG record from that activation's complete snapshot in canonical order;
- fail closed above 32 Doctrine records or 524,288 canonical Doctrine-context UTF-8 bytes, with no truncation;
- persist complete `PolicyAssemblyV1`, rebuilt `BrooksPolicyInputV1`, assembly-specific Case/input/chart relation, and all authority hashes atomically;
- keep operator authentication, reviewer isolation, append-only PostgreSQL, and bounded expected-failure evidence;
- add no Case-derived query, outbound payload, ModelRun, provider, scheduler, Console UI, real data, replay, or trading path.

Exit condition met: a still-eligible historical corpus can become current only through a new explicit rollback identity, and one existing deployment-authorized synthetic Case can produce an immutable full-current-corpus policy input with complete provenance and no model call.

### Phase 5B1: Brooks Prompt Package and offline validation

Accepted ADR-0021, its contract, implementation plan, exact Prompt Package approval, and `PHASE5B1_IMPLEMENTATION_AUTHORIZATION_V1.json` authorize only the offline implementation boundary. Separate bounded records later authorized one exact local synthetic standard activation, the exact nine public-pilot Doctrine prerequisites, and one prepared payload. Package activation sequence 1, Doctrine corpus activation sequence 1, one synthetic PolicyAssembly, and one prepared payload were performed and recorded by the immutable execution evidence without any provider/model call.

The implemented boundary:

- bind one fixed English prompt, one closed identity-free response schema, the BrooksDecision contract version, and the local validator version into one canonical package hash;
- bind the exact Calvin-approved package hash, then require separate explicit operator activation with no latest-file activation or automatic fallback;
- keep the provider response to the 18 BrooksDecision V1 semantic fields while binding seven local/derived identity fields locally;
- describe those 18 fields only as complete for accepted BrooksDecision V1, not for all possible Price Action semantics;
- deterministically prepare the existing `OutboundModelPayloadV1` from one successful synthetic Policy Assembly and wrap it with complete package/assembly identity;
- parse and validate invented identity-free response fixtures offline without repair;
- use only explicit invented `PlannedTradeGeometryV1` in compatibility tests and preserve the missing production geometry-source contract as a Phase 5B2 prerequisite;
- create no ModelCall, ModelRun, ProviderAttempt, ModelRunAudit, production BrooksDecision, provider request, or model answer.

The immutable exact-content approval remains separate from the accepted ADR/contract, offline implementation authorization, bounded activation authorization, and execution evidence. The performed sequence-1 activation authorizes no additional activation, rollback, or Phase 5B2 capability.

Phase 5B1 implementation and bounded local operational exit gates are met. The exact package and exact nine-unit corpus are current, and prepared payload `sha256:98128380faee158597deb8d6f097165b45b7a501711dd6a1b0bcac1644bbf961` is immutable local preparation evidence only. The later Phase 5B2B offline implementation does not make this V1 payload provider-eligible and does not authorize any provider call.

### Phase 5B2A: controlled CLI provider-adapter design

Accepted design-only ADR-0022, its contract, reuse scan, implementation plan, and `PHASE5B2A_DESIGN_AUTHORIZATION_V1.json` fix:

- `agy` with exact model ID `gemini-3.6-flash-high` and high effort;
- Codex CLI with exact model ID `gpt-5.6` and high effort;
- only model IDs as pins, with no automatic fallback and no CLI version/binary-hash pin;
- identical repository-controlled Prompt Package, schema, OHLC, Doctrine, and PNG bytes while recording provider-owned hidden instructions as a provider difference;
- verified Antigravity collection opt-out, external retention, isolated workspace, and no plugin/MCP/rule/history/tool access as hard prerequisites;
- a future Prompt Package V2 direction with explicit anonymous normalized stop/limit geometry and fail-closed `market_next_event`;
- one visible attempt, no hidden retry, 300-second timeout, serial execution, no batching, minimal local retention, and no invented monetary cost;
- outcome-independent hard rejection gates while Phase 6 thresholds remain deferred.

Phase 5B2A design is complete. At its accepted design commit it added no code, dependency, configuration, credential, V2 package bytes, subprocess invocation, provider request, ModelRun, response, or BrooksDecision. The later offline code below exists only under the separate Phase 5B2B implementation authorization.

### Phase 5B2B: offline controlled-adapter implementation candidate

`PHASE5B2B_IMPLEMENTATION_AUTHORIZATION_V1.json`, hash `sha256:b13c748a744d2c772006af596411e8ece145a99feed02a043e31cb5cb3f349ae`, separately authorized only contracts, offline workspace/process code, repository fake executables/tests, an exact Prompt Package V2 proposal, exports, and governance synchronization.

The implemented offline boundary:

- fixes candidate/request/terminal evidence contracts, exact model identities, one attempt, 300-second timeout, stdout `262144`, stderr `65536`, terminal JSON `131072`, global concurrency one, no retry, and no batching;
- adds identity-free response V2 with explicit normalized stop/limit entry, protection, and objective values, while rejecting `market_next_event` and preserving the existing BrooksDecision semantic gate;
- drafts unapproved Prompt Package V2, package hash `sha256:d1af1c9ba80163642ae2dde29f34f06d3c3c7b43acc505d4c32db51c08f02598`, without changing V1 bytes;
- stages only five generic hash-verified anonymous files in restrictive isolated temporary workspaces;
- supervises only one repository-owned content-hashed fake executable with `shell: false`, an exact child environment, bounded output, complete process-group termination including resistant descendants, and no retry;
- accepts only one closed versioned terminal envelope containing one unchanged terminal JSON result and rejects prose, ANSI, partial/multiple JSON, invalid UTF-8, unknown events, or tool/subagent use;
- produces a non-authorized Codex argv only from bounded injected capability evidence and a self-hashed proof, explicitly disables web search, and keeps Antigravity unavailable because exact non-interactive PNG transport remains unimplemented and unproved.

This boundary adds no migration, persistence, API/CLI route, Research Console path, deployment change, credentials, real `agy`/Codex execution, external request, ModelCall/ModelRun/ProviderAttempt/Audit, response, or production BrooksDecision.

Still requires separate immutable decisions for:

- independent acceptance of the exact offline implementation candidate;
- exact Prompt Package V2 content approval, activation, and preparation;
- Antigravity privacy/retention and exact PNG-transport proof;
- no-hidden-retry proof and live capability evidence for both CLI surfaces;
- any production invocation/persistence seam and a separately authorized first bounded synthetic external call;
- any later evaluation expansion under frozen Phase 6 gates.

Current exit: offline process, parser, geometry, resource, and authority behavior is locally testable with invented inputs and a fake executable. The work stops before package approval and before every external/provider operation.

## Phase 6: Semantic evaluation

Evaluate before PnL or full replay:

- agreement with determinate source-grounded Brooks decision fields;
- doctrine consistency and citation correctness;
- no-trade and uncertainty calibration;
- repeated-run consistency;
- causal prefix invariance;
- long/short mirror where the doctrine requires symmetry;
- evaluation-case retrieval exclusion;
- behavior under missing data and ambiguity.

Exit condition: each candidate independently passes the same pre-approved semantic and causal gates on byte-equivalent market inputs, retrieval evidence, prompts, schemas, and reasoning budgets. Only candidates that pass are compared on observable reasoning quality, valid-decision cost, retries, latency, and throughput. Fluent explanations alone do not pass.

## Phase 7: Training decision

First determine whether prompt, RAG, examples, and schema constraints are sufficient. Fine-tuning is optional, not assumed.

If approved later, use a separate Python pipeline for supervised imitation or preference optimization. Freeze source cases, split identities, base model, training configuration, and evaluation protocol before training. Do not start with PnL reinforcement learning.

Exit condition: a new model version improves the frozen semantic gate without leakage or regression in abstention and causal behavior.

## Phase 8: Deterministic replay integration

ADR-0007 accepts a NautilusTrader-first platform direction, with LEAN limited to bounded synthetic conformance checks. Phase 8 still requires separate contract and implementation approval before either engine is installed or run.

- consume only frozen, content-hashed policy decisions and experiment assumptions;
- connect validated TypeScript `ReplayRequest` values to a pinned, unmodified, offline NautilusTrader sidecar;
- normalize raw engine artifacts into ADR-0014 `ReplayResult` identities and separately approved mechanical fields, then validate deterministic order, fill, risk, fee, slippage, funding, position, and accounting behavior;
- prohibit mid-run model calls or policy mutation;
- reject protected windows and unauthorized datasets before opening or sending data;
- use approved finer-grained post-decision execution data when it causally resolves sequencing;
- reject assumed OHLC traversal and preserve unresolved same-bar order as `ambiguous`;
- preserve missing data, segment boundaries, rejected decisions, and right-censored positions;
- prove reproducibility across fresh container starts and compare bounded hand-computed fixtures with LEAN;
- run offline with no credentials, Paper adapter, Live adapter, exchange connection, wallet access, or public listener.

Exit condition: canonical replay output is reproducible from frozen policy and audit artifacts, all ADR-0007 adoption gates pass, and no engine default silently weakens causal or ambiguity contracts. Replay still has no Paper or Live authority.

## Phase 9: Independent Research Agent

- give the Research Agent access only to approved research evidence;
- require explicit hypotheses, affected policy fields, and falsification criteria;
- create a new candidate version instead of modifying the frozen policy;
- independently evaluate every candidate before promotion discussion.

Exit condition: a candidate can be accepted, rejected, or retired without changing the aligned baseline or rewriting history.

## Frontend/backend ordering summary

```text
Domain contracts
  -> Case API and audit store
  -> Synthetic blind-review Research Console
  -> Separately approved Doctrine review
  -> Doctrine RAG API
  -> Brooks Policy inference API
  -> Evaluation surfaces
  -> Training and replay integrations
```

This order makes the API contract authoritative while introducing the UI early enough to test whether the review workflow captures Calvin's source interpretation and disagreements without turning them into runtime policy.
