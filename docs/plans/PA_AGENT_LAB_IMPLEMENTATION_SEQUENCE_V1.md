# PA Agent Lab Implementation Sequence V1

Status: DRAFT SEQUENCE. PHASE 0, PHASE 1 CONTRACTS, PHASE 2, PHASE 3A/3B, AND PHASE 4A ARE IMPLEMENTED. ADR-0020, THE PHASE 5A CONTRACT, AND ITS IMPLEMENTATION PLAN ARE ACCEPTED, BUT PHASE 5A IMPLEMENTATION HAS NOT STARTED AND REQUIRES SEPARATE EXPLICIT START AUTHORIZATION.

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

ADR-0020 splits Phase 5 into an accepted synthetic assembly slice and a separately decided future inference slice.

### Phase 5A: explicit corpus rollback and synthetic Policy Assembly

Accepted contract and approved implementation plan; implementation has not started and requires separate explicit Calvin start authorization.

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

Exit condition when separately implemented: a still-eligible historical corpus can become current only through a new explicit rollback identity, and one existing synthetic Case can produce an immutable full-current-corpus policy input with complete provenance and no model call.

### Phase 5B: provider-bound Brooks Policy inference

Still requires separate ADRs, contracts, and implementation approvals before any work on:

- prompt and output-schema identity;
- provider/model selection and image transport;
- `OutboundModelPayloadV1`, ModelRun, retries, attempts, response validation, and BrooksDecision creation;
- any Case-aware selector, retrieval query construction, or asynchronous model job.

Future Phase 5B exit direction: one Brooks decision is repeatable under a fixed model/prompt identity and fails closed under adversarial causal tests. This direction grants no present implementation or provider authority.

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
