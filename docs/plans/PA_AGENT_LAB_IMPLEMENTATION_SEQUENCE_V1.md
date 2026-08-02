# PA Agent Lab Implementation Sequence V1

Status: DRAFT SEQUENCE. PHASE 0 AND THE IMPLEMENTED ADR-0008, ADR-0010, ADR-0011, AND ADR-0012 PHASE 1 SLICES ARE AUTHORIZED; LATER SERVICES AND PHASES REQUIRE SEPARATE APPROVAL.

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

Current phase. The ADR-0008 scheduling, ADR-0010 semantic, ADR-0011 causal-input/privacy/model-run-audit, and ADR-0012 deterministic-chart slices are implemented; persisted JSON/OpenAPI parsing, database/API storage, provider transport, and replay request/result boundaries are not yet frozen.

- freeze causal case identity and visible-through boundary;
- freeze the accepted 120/40 chart/OHLC payload, normalization, bar identity, continuity, left-censoring, anonymity schemas, and the ADR-0009 five-minute (`300` second) V1 decision duration;
- freeze `brooksDecision`, `calvinReview`, and disagreement schemas;
- use the simple ADR-0010 Source and DoctrineUnit records and defer actual ingestion to Phase 4;
- define policy decision, evidence reference, uncertainty, and validation records;
- freeze deterministic anonymous chart bytes, artifact identity, and local content-addressed persistence;
- define persisted JSON/OpenAPI parsing and database uniqueness for the implemented Case, input, chart artifact, ModelRun, ProviderAttempt, and Audit records;
- defer detailed dataset partition machinery until Phase 6 needs a frozen evaluation case list;
- define provider-neutral replay request, result, ambiguity, censoring, and audit identities without implementing or installing a replay engine.

Exit condition: synthetic schema tests can reject future bars, raw identity/price leakage, unauthorized memory, missing provenance, malformed continuity, track conflation, invalid replay states, and implicit same-bar ordering before any provider or replay-engine call.

## Phase 2: Case store and API

- implement immutable case and label persistence;
- expose versioned Case, Label, Commitment, and Audit APIs;
- create CLI fixtures before a graphical interface;
- enforce authorization and dataset-split filters server-side.

Exit condition: one synthetic causal case can be created, labeled, frozen, retrieved, and audited without model involvement.

## Phase 3: Thin annotation UI

- render only the anonymous causal prefix through R;
- collect approved core DoctrineUnits and whole-decision offline `calvinReview` records separately;
- support `agree`, `clarify`, `disagree`, and `uncertain` for the complete decision;
- hide agent proposals until the whole-decision review record is frozen when anchoring would bias evidence;
- display the immutable BrooksDecision, CalvinReview, and derived whole-decision conflict after freeze.

Exit condition: Calvin can produce one complete, immutable, outcome-blind review without editing JSON manually. The review cannot patch Brooks fields or enter runtime retrieval automatically.

## Phase 4: Doctrine ingestion and RAG

- inventory only legally available source material;
- create simple local Source records and approved DoctrineUnits containing core trading semantics;
- implement metadata, lexical, and vector retrieval over approved DoctrineUnits;
- persist retrieved doctrine IDs for each model run.

Exit condition: a doctrine query returns bounded approved trading semantics and cannot retrieve draft, retired, Calvin-review, or model-generated authority.

## Phase 5: Brooks Policy Agent vertical slice

- provide one causal case and bounded approved DoctrineUnit context;
- request one schema-constrained complete Brooks research decision;
- exclude `calvinReview`, evaluation cases, outcomes, and research memory from retrieval;
- reject invalid citations, future references, track conflation, and invalid geometry;
- persist the complete inference audit.

Exit condition: one Brooks decision is repeatable under a fixed model/prompt identity and fails closed under adversarial causal tests.

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
- normalize raw engine artifacts into a versioned `ReplayResult` and validate deterministic order, fill, risk, fee, slippage, funding, position, and accounting behavior;
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
  -> Thin annotation UI
  -> Doctrine RAG API
  -> Brooks Policy inference API
  -> Evaluation surfaces
  -> Training and replay integrations
```

This order makes the API contract authoritative while introducing the UI early enough to test whether the review workflow captures Calvin's source interpretation and disagreements without turning them into runtime policy.
