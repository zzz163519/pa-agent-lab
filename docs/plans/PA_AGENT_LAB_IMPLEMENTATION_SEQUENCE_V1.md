# PA Agent Lab Implementation Sequence V1

Status: ACCEPTED SEQUENCING BASELINE UNDER ADR-0023. PHASE 0, PHASE 1 CONTRACTS, PHASE 2, PHASE 3A/3B, THE INITIAL PHASE 4A PLATFORM/PILOT ACTIVATION, PHASE 5A, PHASE 5B1, PHASE 5B2A DESIGN, THE EXACT FAKE-ONLY PHASE 5B2B FOUNDATION, AND THE FOUR-RULE V2 GEOMETRY CORRECTION ARE ACCEPTED WITHIN THEIR RECORDED BOUNDARIES. EXACT PROMPT PACKAGE V2 CONTENT IS SEPARATELY APPROVED. THE CURRENT CORPUS REMAINS A NINE-UNIT PUBLIC PILOT, SO PHASE 3C COVERAGE COMPLETION AND A SEPARATELY ACCEPTED PHASE 4A2 EXPANDED ACTIVATION PRECEDE V2 ACTIVATION/PREPARATION, INSTALLED-CLI INFERENCE, PROVIDER CALLS, AND FORMAL PHASE 6 EVALUATION.

## Delivery model

Use contract/API-first vertical slices. Do not build the full frontend first, and do not defer all user-interface work until the backend is complete.

The first user interface exists to produce high-quality outcome-blind source reviews and adjudication evidence. It is not a dashboard, trading terminal, policy-authoring shortcut, or marketing site.

## Progress interpretation

Project progress is tracked on three independent axes:

1. **engineering infrastructure** has reached the accepted fake-only Phase 5B2B foundation and exact Prompt Package V2 content approval;
2. **Brooks semantic content** has reached only the nine-unit Phase 3B/4A public pilot;
3. **external execution and formal evaluation** have not started: no real provider call, real Case, runtime model record, or Phase 6 evaluation exists.

A later engineering phase never implies that the earlier semantic-content axis is coverage-complete. The existing V1 activation/prepared payload and V2 offline artifacts are valid plumbing evidence, not complete Brooks competence evidence.

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

## Phase 3C: V1 Brooks semantic coverage baseline

Exact design contract accepted by Calvin. `PHASE3C_SEMANTIC_COVERAGE_CONTRACT_APPROVAL_V1.json`, record hash `sha256:9f1da60ba4ef32113616b1c9d0a17305001816bcbff0f608c10352c69cbfb63c`, binds exact `PHASE3C_BROOKS_SEMANTIC_COVERAGE_V1.md` content hash `sha256:5aedc6ad98c74b09f2703e3b6e1d58042ea513d409c62815449f075fd933f0a6` as the design baseline only. Source access, extraction, Doctrine proposal batches, semantic coverage completion acceptance, Phase 4A2, and all provider/runtime operations remain separately unauthorized.

Phase 3C freezes a finite, auditable coverage baseline for the accepted BrooksDecision V1 policy surface before additional Doctrine extraction or approval. It is not a claim to exhaust all Brooks teaching or all Price Action knowledge.

The accepted contract defines:

- twenty-seven V1 semantic capabilities under Capability, State and Boundary, Interaction Scenario, Authority and Evidence, and Scope and Gap ledgers;
- complete provider-owned state, enum, reason-code, branch, causal-effective-time, collection-bound, positive/counterexample, permission/abstention, conflict, and residual-gap obligations;
- eleven interaction families with long/short mirror, permission/abstention symmetry, causal robustness, and complete capability-to-interaction mapping;
- exact eligible public Source classes, later exact-snapshot binding, locators, content hashes, copyright/derived-wording review, rejection, retirement, and conflict treatment;
- separate V1 semantic and provider-profile compatibility axes, preserving `market_next_event` as in-scope V1 semantics while current Prompt Package V2 remains `profile_unsupported_fail_closed`;
- one future semantic coverage completion acceptance only after the exact source-grounded ledgers contain zero `unresolved_in_scope_blocker` items;
- outcome blindness and exclusion of protected windows, private material, unauthorized V6 content, model-generated authority, Calvin review, outcomes, and PnL.

The 182 inventory `doctrine_candidate` URLs remain discovery metadata, not a bulk-ingestion target. Exact Source reads, extraction, proposal insertion, and approval batches require separate authorization.

Design exit condition met for the single-timeframe V1 baseline. Semantic coverage completion exit condition is not met: no expanded approved Doctrine set exists and no final coverage report or completion acceptance exists. ADR-0024 additionally requires a versioned multi-timeframe core capability before formal provider evaluation; the exact Phase 3D design route is now accepted, but Doctrine proposals remain paused until a separate exact proposal-batch authorization and claims requiring unresolved capability tracks remain quarantined.

## Phase 3D: versioned Brooks multi-timeframe capability design

Exact design exit condition met. `PHASE3D_MULTI_TIMEFRAME_CAPABILITY_CONTRACT_APPROVAL_V1.json`, record hash `sha256:0107f512023f2e0e33bd892ba262e3ba3db24e0224d0dadea50c65b67b6eaf3c`, accepts exact `docs/contracts/PHASE3D_VERSIONED_BROOKS_MULTI_TIMEFRAME_CAPABILITY_V1.md` content hash `sha256:989eb4a9717aff887fd5c970abf6bd14e53e97f4e37216779e4d287774a50b90` as the design baseline only. `PHASE3D1_IMPLEMENTATION_AUTHORIZATION_V1.json`, record hash `sha256:85b4102a24874ff46fee7be7b07856c6ff0cb7f05f5448feb17f77b85c35f1fb`, separately authorizes the zero-new-dependency offline synthetic foundation bound to plan hash `sha256:fd9fa0c30228151ce8d5f17020c6b7b601531c773f7bc13b307501c13d5ab390` and reuse-scan hash `sha256:5bb128384c774d6c4bdf090f1c11156f754c9875c1c143aeea30ed21929ac238`. Source access, Doctrine proposals, real data, provider operations, and implementation acceptance remain separately unauthorized.

The accepted design records:

- immutable V1/V2 identities and a separately versioned multi-timeframe target;
- five minutes as the required primary decision timeframe, optional native same-source sixty-minute as the critical reference, optional native daily as an additional reference, and no weekly/monthly target;
- a closed-five-minute cutoff with finalized and cutoff-frozen provisional higher-timeframe evidence, fixed source/session alignment, and immutable correction history;
- the inherited five-minute 120/40 boundary plus zero-through-120 optional reference windows with no minimum reference-bar count;
- deterministic anonymous charts and OHLC, five-minute context/detail plus one context chart per available reference timeframe, and one common normalization base;
- one Brooks decision, structured reference relationships, Doctrine-governed conflict and continuity materiality, and no timeframe voting or fixed priority;
- timeframe-aware evidence/geometry, future provider-evaluation combinations and paired causal tests, and strict privacy/authority boundaries;
- scaling/aggregate-risk, active-position management, intrabar spike/event handling, and `market_next_event` as separate unresolved contracts.

Design exit condition met; Phase 3D1 implementation is authorized but not yet accepted. The candidate must remain inside the exact plan/write scope, pass the complete synthetic causal/privacy/rendering test matrix and fresh-context read-only review, then stop for a separate exact-commit Calvin acceptance. Doctrine proposal drafting does not resume by implication: a separate exact proposal-batch authorization is still required, and claims needing an unresolved capability track remain paused.

## Phase 4: Doctrine ingestion and retrieval

ADR-0019 splits the original broad Phase 4 direction into an implemented initial lexical platform, an ADR-0023-required expanded coverage activation, and a separately authorized optional vector slice.

### Phase 4A: initial approved-corpus platform and pilot activation

- project the complete approved, unretired Doctrine set from the Phase 3B authority chain into immutable snapshots;
- preserve exact Source, proposal, approval, and simplified RAG-record hashes without fetching or storing source bodies;
- run one fixed PostgreSQL lexical profile over the five approved semantic fields;
- require human-authored outcome-free quality fixtures, an explicit passed report, and explicit activation;
- expose only operator-authenticated loopback API and CLI retrieval;
- commit immutable query/evidence records for matched, no-match, retirement-invalidated, and terminal retrieval paths;
- exclude draft, retired, Calvin-review, research-memory, model-generated, Case, outcome, replay, and trading authority.

Platform/pilot exit condition met: the exact initial six-Source, nine-Doctrine pilot corpus was ingested and explicitly activated; bounded deterministic lexical queries return approved simplified semantics or an audited terminal state, while PostgreSQL constraints and restricted roles fail closed. This proves the platform and pilot activation, not V1 Brooks semantic coverage completion.

### Phase 4A2: expanded coverage-baseline activation

Required next by ADR-0023 only after the Phase 3C/3D semantic route, approved coverage set, and exact Source snapshots are accepted. Its contract and implementation remain separately unauthorized.

- expand the exact Source allowlist only to the separately approved Phase 3C Source snapshots;
- replace the fixed nine-unit quality-suite assumption with exact complete-snapshot coverage fixtures;
- preserve deterministic ingestion, passed quality evidence, explicit activation, retirement fail-closed behavior, and append-only history;
- bind one immutable coverage acceptance to the exact activated snapshot and explicit residual gaps.

Exit condition not yet designed or met: the Phase 3C approved/unretired coverage set has a passed complete-snapshot quality report and explicit current activation without widening provider, real-data, replay, or trading authority.

### Phase 4B: vector and hybrid retrieval

Still requires a separate ADR, contract, and implementation approval before adding embeddings, `pgvector` extension/schema, vector or hybrid retrieval, reranking, provider calls, model-run retrieval integration, or Case-aware query construction. Phase 4B is optional and is not a default prerequisite for Phase 4A2.

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

Exit condition met for the nine-unit pilot: a still-eligible historical corpus can become current only through a new explicit rollback identity, and one existing deployment-authorized synthetic Case can produce an immutable full-current-corpus policy input with complete provenance and no model call.

Post-Phase 4A2 gate: the current assembly accepts at most 32 Doctrine records and cannot truncate. If the exact expanded snapshot remains within all full-corpus bounds, a separately authorized new assembly may retain the complete-corpus path. Otherwise Selector V2 or a separately justified assembly-contract revision must be accepted and implemented before any new prepared payload.

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

### Phase 5B2B: accepted fake-only offline controlled-adapter foundation and geometry correction

`PHASE5B2B_IMPLEMENTATION_AUTHORIZATION_V1.json`, hash `sha256:b13c748a744d2c772006af596411e8ece145a99feed02a043e31cb5cb3f349ae`, separately authorized only contracts, offline workspace/process code, repository fake executables/tests, an exact Prompt Package V2 proposal, exports, and governance synchronization. `PHASE5B2B_IMPLEMENTATION_ACCEPTANCE_V1.json`, hash `sha256:609994e62021317f6a0c1de1886061a1b091d443b2f4422bcc2f942030a7ccf7`, accepts exact commit `e9c1981d37a6742011a8b8fdd854f9279c6d7fbd` and tree `d99df5d3a794d3056617383411f1caa78729666e` only within that fake-only offline boundary. The separately authorized geometry correction is accepted by `PHASE5B2B_GEOMETRY_VALIDATION_CORRECTION_ACCEPTANCE_V1.json`, hash `sha256:d5358718426069376660ee7d381ca7062f7141926105edd0237d4b5197054d76`, which binds exact commit `7e44a44b34fc4b5695af6f00d7366b989a42e716` and tree `b1c9a15b822ef76344d3e7a66d73961621a40bed` only to the four offline V2 relation checks. `BROOKS_PROMPT_PACKAGE_V2.approval.json`, hash `sha256:429c5d53086a77c9bf826a20c23e11d08d53ef4d36bdda591ceefe18931affce`, separately approves only exact package content hash `sha256:d1af1c9ba80163642ae2dde29f34f06d3c3c7b43acc505d4c32db51c08f02598`.

The implemented offline boundary:

- fixes candidate/request/terminal evidence contracts, exact model identities, one attempt, 300-second timeout, stdout `262144`, stderr `65536`, terminal JSON `131072`, global concurrency one, no retry, and no batching;
- adds identity-free response V2 with explicit normalized stop/limit entry, protection, and objective values, while rejecting `market_next_event`, preserving the existing BrooksDecision semantic gate, and enforcing accepted strict stop-entry/protection-side relations plus exact visible-anchor equality for limit entries and objectives;
- retains immutable Prompt Package V2 manifest bytes with `proposalStatus: "unapproved"` and package hash `sha256:d1af1c9ba80163642ae2dde29f34f06d3c3c7b43acc505d4c32db51c08f02598`, while the separate outside-preimage approval artifact approves only that exact content identity and V1 bytes remain unchanged;
- stages only five generic hash-verified anonymous files in restrictive isolated temporary workspaces;
- supervises only one repository-owned content-hashed fake executable with `shell: false`, an exact child environment, bounded output, complete process-group termination including resistant descendants, and no retry;
- accepts only one closed versioned terminal envelope containing one unchanged terminal JSON result and rejects prose, ANSI, partial/multiple JSON, invalid UTF-8, unknown events, or tool/subagent use;
- produces a non-authorized Codex argv only from bounded injected capability evidence and a self-hashed proof, explicitly disables web search, and keeps Antigravity unavailable because exact non-interactive PNG transport remains unimplemented and unproved.

The accepted boundary adds no migration, persistence, API/CLI route, Research Console path, deployment change, credentials, real `agy`/Codex execution, external request, ModelCall/ModelRun/ProviderAttempt/Audit, response, or production BrooksDecision. It does not accept the injected Codex `--cd` mapping as installed-CLI privacy/isolation proof, caller-owned cleanup as a production signal/crash lifecycle, the process-local fake concurrency guard as production supervision, or either stdout events or `terminal.json` as the future authoritative response source.

Still requires separate immutable decisions for:

- exact Prompt Package V2 activation and preparation;
- Antigravity privacy/retention and exact PNG-transport proof;
- no-hidden-retry, machine-output, user-config/rule exclusion, ordinary-home isolation, and output-protocol proof for the installed CLI surfaces;
- any production cleanup/supervisor and persistence seam plus a separately authorized first bounded synthetic external call;
- any later evaluation expansion under frozen Phase 6 gates.

Current exit: the exact fake-only offline process, parser, resource, and authority foundation plus the four-rule V2 geometry correction are accepted, and exact Prompt Package V2 content is approved separately. ADR-0023 and ADR-0024 now stop progression before V2 activation/preparation and before every installed-CLI, external-provider, runtime-record, production-data, replay, training, or trading operation until the revised Phase 3C/3D semantic-capability route, Phase 4A2, post-corpus assembly, installed-CLI, and Phase 6 prerequisites are separately accepted and met.

## Phase 6: Semantic evaluation

Formal evaluation remains unstarted. Before any provider output is inspected, a separately accepted Phase 6 contract must freeze:

- the real-Case read-only ingestion and authorization-before-open boundary;
- protected-window rejection, dataset partitions, contact state, and an outcome-blind case list;
- identical candidate inputs, package/schema/model identities, reasoning budgets, repeat counts, and retrieval evidence;
- source-grounded semantic adjudication for determinate decision fields without converting CalvinReview into runtime or field-patch authority;
- doctrine/citation, abstention, consistency, prefix-invariance, mirror, privacy, retrieval-isolation, and falsification thresholds;
- permanent exclusion of any separately authorized synthetic transport-smoke case from formal evaluation.

Only after those identities are frozen may a separate authorization permit provider output. Evaluation then covers:

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
  -> Synthetic Case API and audit store
  -> Synthetic blind-review Research Console
  -> Minimal Doctrine proposal/approval lifecycle
  -> Initial lexical corpus platform and nine-unit pilot activation
  -> Synthetic Policy Assembly and offline Prompt Package plumbing
  -> V1 Brooks semantic coverage baseline
  -> Expanded approved corpus activation
  -> Full-corpus assembly or separately accepted Selector V2
  -> Frozen real-Case/evaluation contract and provider capability proof
  -> Separately authorized synthetic transport smoke
  -> Symmetric semantic evaluation
  -> Optional training
  -> Deterministic replay integration
  -> Independent Research Agent
```

This order keeps the API and immutable authority chain primary while preventing late-stage engineering plumbing from being mistaken for Brooks semantic coverage, provider eligibility, or evaluated policy competence.
